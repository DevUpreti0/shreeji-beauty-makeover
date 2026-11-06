import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdminSessionValid} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";import UserRole from "./user-role";
export const dynamic="force-dynamic";
export default async function AdminUsers(){
 if(!await isAdminSessionValid())redirect("/login");
 let users:Array<{id:string;full_name:string;role:string;created_at:string}>=[];
 let error="";
 try{const result=await createAdminDb().from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false}).limit(100);if(result.error)throw result.error;users=result.data||[];}catch{error="Database is not connected or the LMS migration has not been applied.";}
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">ACCOUNT DIRECTORY</div><h1>Registered <em>users.</em></h1><p>Review learner and teacher accounts. Teacher role assignment can be managed securely by the administrator.</p>{error&&<p className="formMessage">{error}</p>}<div className="portalPanel"><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th align="left">Name</th><th align="left">User ID</th><th align="left">Role</th><th align="left">Joined</th><th align="left">Update role</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td style={{padding:10,borderTop:"1px solid #eee"}}>{u.full_name||"—"}</td><td style={{padding:10,borderTop:"1px solid #eee",fontSize:11}}>{u.id}</td><td style={{padding:10,borderTop:"1px solid #eee"}}>{u.role}</td><td style={{padding:10,borderTop:"1px solid #eee"}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td><td style={{padding:10,borderTop:"1px solid #eee"}}><UserRole id={u.id} initialRole={u.role}/></td></tr>)}</tbody></table>{!users.length&&!error&&<p>No registered accounts yet.</p>}</div></section></main>;
}