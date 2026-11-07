import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {canAdminAccess} from "@/lib/admin-session";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
async function updateRole(formData:FormData){
 "use server";
 if(!await canAdminAccess("users"))redirect("/admin");
 const id=String(formData.get("id")||"");
 const role=String(formData.get("role")||"");
 if(!id||!["student","teacher","admin"].includes(role))return;
 const {error}=await createAdminDb().from("profiles").update({role}).eq("id",id);
 if(error)throw new Error("Could not update this account role.");
 revalidatePath("/admin/users");
}
export default async function AdminUsers(){
 if(!await canAdminAccess("users"))redirect("/admin");
 let users:Array<{id:string;full_name:string;role:string;created_at:string}>=[];
 let error="";
 try{const db=await createSupabaseServerClient();const result=await db.from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false}).limit(100);if(result.error)throw result.error;users=result.data||[];}catch{error="Database is not connected or the LMS migration has not been applied.";}
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">ACCOUNT DIRECTORY</div><h1>Registered <em>users.</em></h1><p>Review learner accounts and assign teacher or admin access.</p>{error&&<p className="formMessage">{error}</p>}<div className="portalPanel"><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th align="left">Name</th><th align="left">User ID</th><th align="left">Role</th><th align="left">Joined</th><th align="left">Update role</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td style={{padding:10,borderTop:"1px solid #eee"}}>{u.full_name||"—"}</td><td style={{padding:10,borderTop:"1px solid #eee",fontSize:11}}>{u.id}</td><td style={{padding:10,borderTop:"1px solid #eee"}}>{u.role}</td><td style={{padding:10,borderTop:"1px solid #eee"}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td><td style={{padding:10,borderTop:"1px solid #eee"}}><form action={updateRole} style={{display:"flex",gap:6}}><input type="hidden" name="id" value={u.id}/><select name="role" defaultValue={u.role}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select><button className="outline">Save</button></form></td></tr>)}</tbody></table>{!users.length&&!error&&<p>No registered accounts yet.</p>}</div></section></main>;
}
