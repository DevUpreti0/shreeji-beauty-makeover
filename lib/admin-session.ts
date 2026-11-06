import { createSupabaseServerClient } from "@/lib/supabase-server";
export async function isAdminSessionValid() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return profile?.role === "admin";
  } catch { return false; }
}
export async function clearAdminSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
