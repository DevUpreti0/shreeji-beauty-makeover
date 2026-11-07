import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createAdminDb } from "@/lib/supabase/admin";

export async function currentAdminIdentity() {
  const supabase=await createSupabaseServerClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return null;
  const db=createAdminDb();
  const [{data:profile},{data:owner}]=await Promise.all([
    db.from("profiles").select("id,full_name,role").eq("id",user.id).maybeSingle(),
    db.from("super_admins").select("user_id").eq("user_id",user.id).maybeSingle()
  ]);
  return profile?{user,profile,isSuperAdmin:!!owner}:null;
}
export async function isSuperAdminSessionValid(){
  try{return !!(await currentAdminIdentity())?.isSuperAdmin;}catch{return false;}
}
export async function canAdminAccess(section:string,edit=false){
  try{
    const identity=await currentAdminIdentity();
    if(!identity||identity.profile.role!=="admin")return false;
    if(identity.isSuperAdmin)return true;
    const {data}=await createAdminDb().from("admin_section_permissions").select("can_view,can_edit").eq("admin_id",identity.user.id).eq("section_key",section).maybeSingle();
    return !!data&&(edit?data.can_view&&data.can_edit:data.can_view);
  }catch{return false;}
}
export async function isAdminSessionValid() {
  try {
    const identity=await currentAdminIdentity();
    return !!identity&&identity.profile.role==="admin";
  } catch { return false; }
}
export async function clearAdminSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
