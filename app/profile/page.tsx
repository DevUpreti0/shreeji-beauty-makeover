import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ProfileEditor from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles")
    .select("full_name,role,avatar_url,phone,bio,city,website,instagram_handle")
    .eq("id", user.id).maybeSingle();

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>MY PROFILE</b></Link>
      <Link href={profile?.role === "teacher" ? "/teacher" : profile?.role === "admin" ? "/admin" : "/student"} className="outline">← Back to dashboard</Link>
    </header>
    <section className="portalContent profilePage">
      <div className="eyebrow">YOUR ACCOUNT · PERSONAL DETAILS</div>
      <h1>My <em>profile.</em></h1>
      <p>Keep your account details updated. Your email and account role are protected and cannot be changed here.</p>
      <ProfileEditor userId={user.id} email={user.email || ""} role={profile?.role || "student"} initialProfile={profile || { full_name: user.user_metadata?.full_name || "", avatar_url: null, phone: "", bio: "", city: "", website: "", instagram_handle: "" }} />
    </section>
  </main>;
}
