import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin-session";
import { createAdminDb } from "@/lib/supabase/admin";
async function logout(){ "use server"; const {clearAdminSession}=await import("@/lib/admin-session"); await clearAdminSession(); redirect("/login"); }
export const dynamic="force-dynamic";
export default async function AdminPage(){
 if(!await isAdminSessionValid()) redirect("/login");
 let counts={users:0,courses:0,enrollments:0,payments:0}; let loadError="";
 try{const db=createAdminDb();const [u,c,e,p]=await Promise.all([db.from("profiles").select("*",{count:"exact",head:true}),db.from("courses").select("*",{count:"exact",head:true}),db.from("enrollments").select("*",{count:"exact",head:true}),db.from("payments").select("*",{count:"exact",head:true})]);if(u.error||c.error||e.error||p.error)throw new Error("Apply the LMS migration in Supabase first.");counts={users:u.count||0,courses:c.count||0,enrollments:e.count||0,payments:p.count||0};}catch(err){loadError=err instanceof Error?err.message:"Database setup pending.";}
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>ADMIN</b></Link><form action={logout}><button className="outline">Sign out</button></form></header><section className="portalContent"><div className="eyebrow">PLATFORM CONTROL CENTER</div><h1>Admin <em>dashboard.</em></h1><p>Signed in as dukubusiness. Your figures are read from the connected database.</p>{loadError&&<p className="formMessage">{loadError}</p>}<div className="portalMetrics"><div><small>REGISTERED USERS</small><strong>{counts.users}</strong></div><div><small>COURSES</small><strong>{counts.courses}</strong></div><div><small>ENROLLMENTS</small><strong>{counts.enrollments}</strong></div><div><small>PAYMENTS</small><strong>{counts.payments}</strong></div></div><div className="portalPanel"><h2>Management areas</h2><div className="portalLinks"><Link href="/admin/courses">Course management ↗</Link><Link href="/admin/users">User management ↗</Link><Link href="/admin/settings">Platform settings ↗</Link><Link href="/teacher">Teacher workspace ↗</Link></div><p>Admin routes are protected by a signed, HTTP-only session cookie.</p></div></section></main>;
}
