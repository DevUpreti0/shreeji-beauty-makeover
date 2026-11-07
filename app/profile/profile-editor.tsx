"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Profile = {
  full_name: string; avatar_url: string | null; phone?: string | null;
  bio?: string | null; city?: string | null; website?: string | null; instagram_handle?: string | null;
};

export default function ProfileEditor({ userId, email, role, initialProfile }: {
  userId: string; email: string; role: string; initialProfile: Profile;
}) {
  const [name, setName] = useState(initialProfile.full_name || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [city, setCity] = useState(initialProfile.city || "");
  const [website, setWebsite] = useState(initialProfile.website || "");
  const [instagram, setInstagram] = useState(initialProfile.instagram_handle || "");
  const [avatar, setAvatar] = useState(initialProfile.avatar_url || "");
  const [preview, setPreview] = useState(initialProfile.avatar_url || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG or WEBP image."); event.target.value = ""; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Your profile picture must be 5 MB or smaller."); event.target.value = ""; return;
    }
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = userId + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(data.publicUrl); setPreview(data.publicUrl);
      setMessage("Photo uploaded. Press Save profile to finish updating your profile.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload profile picture.");
    } finally { setUploading(false); event.target.value = ""; }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const updates = {
        full_name: name.trim(), avatar_url: avatar || null, phone: phone.trim() || null,
        bio: bio.trim() || null, city: city.trim() || null, website: website.trim() || null,
        instagram_handle: instagram.trim().replace(/^@/, "") || null, updated_at: new Date().toISOString(),
      };
      if (!updates.full_name) throw new Error("Please enter your full name.");
      if (updates.full_name.length > 100 || (updates.bio && updates.bio.length > 500)) throw new Error("Please shorten your name or bio.");
      const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (updateError) throw updateError;
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: updates.full_name, avatar_url: updates.avatar_url } });
      if (authError) throw authError;
      setMessage("Your profile has been updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update your profile.");
    } finally { setBusy(false); }
  }

  return <form className="profileEditor" onSubmit={saveProfile}>
    <div className="profileIdentity">
      <div className="profileAvatar">{preview ? <img src={preview} alt="Your profile picture" /> : <span>{name.trim().charAt(0).toUpperCase() || "U"}</span>}</div>
      <div className="profileIdentityText"><strong>{name || "Your name"}</strong><span>{email}</span><span className="profileRole">{role}</span></div>
      <label className="outline profileUpload">{uploading ? "Uploading…" : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={uploading} /></label>
    </div>
    <div className="profileGrid">
      <label>Full name<input value={name} onChange={e => setName(e.target.value)} maxLength={100} required autoComplete="name" /></label>
      <label>Email address<input value={email} readOnly disabled /></label>
      <label>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} type="tel" autoComplete="tel" placeholder="+91…" /></label>
      <label>City / location<input value={city} onChange={e => setCity(e.target.value)} maxLength={100} autoComplete="address-level2" placeholder="Your city" /></label>
      <label>Website<input value={website} onChange={e => setWebsite(e.target.value)} maxLength={200} type="url" placeholder="https://…" /></label>
      <label>Instagram username<input value={instagram} onChange={e => setInstagram(e.target.value)} maxLength={60} placeholder="@username" /></label>
      <label className="profileBio">About me<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4} placeholder="Tell us a little about yourself…" /></label>
    </div>
    <div className="profileSecurity"><strong>Account security</strong><span>Your email and account type are read-only here. Your sign-in session stays active until you choose Sign out, subject to security expiry or revocation.</span></div>
    {error && <p className="formError" role="alert">{error}</p>}
    {message && <p className="formMessage" role="status">{message}</p>}
    <button className="primary" disabled={busy || uploading}>{busy ? "Saving…" : "Save profile changes ↗"}</button>
  </form>;
}
