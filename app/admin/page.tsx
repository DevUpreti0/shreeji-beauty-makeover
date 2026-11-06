import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
async function logout(){ "use server"; const { clearAdminSession }=await import("@/lib/admin-session"); await clearAdminSession(); redirect("/login"); }
export default async function AdminPage(){
 if(!(await isAdminSessionValid()))redirect("/login");
 let counts={users:"—",courses:"—",enrollments:"—"};
 try{const sb=await createSupabaseServerClient();const [u,c,e]=await Promise.all([sb.from("profiles").select("*",{count:"exact",head:true}),sb.from("courses").select("*",{count:"exact",head:true}),sb.from("enrollments").select("*",{count:"exact",head:true})]);counts={users:String(u.count??0),courses:String(c.count??0),enrollments:String(e.count??0)};}catch{}
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>ADMIN</b></Link><form action={logout}><button className="outline">Sign out</button></form></header><section className="portalContent"><div className="eyebrow">PLATFORM CONTROL CENTER</div><h1>Admin <em>dashboard.</em></h1><p>Signed in as dukubusiness. Manage platform operations from one place.</p><div className="portalMetrics"><div><small>REGISTERED USERS</small><strong>{counts.users}</strong></div><div><small>COURSES</small><strong>{counts.courses}</strong></div><div><small>ENROLLMENTS</small><strong>{counts.enrollments}</strong></div></div><div className="portalPanel"><h2>Management areas</h2><div className="portalLinks"><Link href="/admin/courses">Course management ↗</Link><Link href="/admin/users">User management ↗</Link><Link href="/admin/settings">Platform settings ↗</Link><Link href="/teacher">Teacher workspace ↗</Link></div><p>Counts show live database totals when Supabase is connected. Empty or unavailable data is not replaced with sample values.</p></div></section></main>;
}
