import {redirect} from "next/navigation";
import Link from "next/link";
import {isAdminSessionValid,clearAdminSession} from "@/lib/admin-session";
import {createSupabaseServerClient} from "@/lib/supabase-server";
export const dynamic="force-dynamic";
async function logout(){ "use server"; await clearAdminSession(); redirect("/login"); }
const sections=[
 {href:"/admin/users",title:"Users & roles",desc:"View accounts, assign student/teacher/admin roles.",icon:"01"},
 {href:"/admin/courses",title:"Course catalogue",desc:"Create courses, edit catalogue and publish or archive.",icon:"02"},
 {href:"/admin/enrollments",title:"Enrollments",desc:"Review learner access and manage enrollment status.",icon:"03"},
 {href:"/admin/payments",title:"Payments",desc:"Review payment records, amounts and payment states.",icon:"04"},
 {href:"/admin/live-classes",title:"Live classes",desc:"Schedule and host DuKu Meet classrooms, manage sessions and review attendance.",icon:"05"},
 {href:"/admin/support",title:"Live support inbox",desc:"Read support conversations, reply and close tickets.",icon:"07"},
 {href:"/admin/settings",title:"Platform settings",desc:"Configure payment mode, meeting provider and support contact.",icon:"06"},
 {href:"/admin/website",title:"Website content editor",desc:"Edit branding, images, theme, menus, FAQs, testimonials, sections and custom pages with live publishing.",icon:"07"},
 {href:"/teacher",title:"Teacher workspace",desc:"Open teaching workspace and course authoring.",icon:"08"},
 {href:"/",title:"View public website",desc:"Open the learner-facing Shreeji Beauty Makeover site.",icon:"10"}
];
export default async function AdminPage(){
 if(!await isAdminSessionValid())redirect("/login");
 let counts={users:0,students:0,teachers:0,courses:0,published:0,enrollments:0,payments:0,support:0};
 let recent:any[]=[];let error="";
 try{
  const db=await createSupabaseServerClient();
  const [u,s,t,c,p,e,pa,sp,rc]=await Promise.all([
   db.from("profiles").select("*",{count:"exact",head:true}),
   db.from("profiles").select("*",{count:"exact",head:true}).eq("role","student"),
   db.from("profiles").select("*",{count:"exact",head:true}).eq("role","teacher"),
   db.from("courses").select("*",{count:"exact",head:true}),
   db.from("courses").select("*",{count:"exact",head:true}).eq("status","published"),
   db.from("enrollments").select("*",{count:"exact",head:true}),
   db.from("payments").select("*",{count:"exact",head:true}),
   db.from("support_conversations").select("*",{count:"exact",head:true}).eq("status","open"),
   db.from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false}).limit(6)
  ]);
  if(u.error||s.error||t.error||c.error||p.error||e.error||pa.error||sp.error||rc.error)throw new Error("Some dashboard data is unavailable. Check database policies and migrations.");
  counts={users:u.count||0,students:s.count||0,teachers:t.count||0,courses:c.count||0,published:p.count||0,enrollments:e.count||0,payments:pa.count||0,support:sp.count||0};recent=rc.data||[];
 }catch(err){error=err instanceof Error?err.message:"Dashboard data unavailable.";}
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>ADMIN</b></Link><form action={logout}><button className="outline">Sign out</button></form></header><section className="portalContent">
 <div className="eyebrow">OWNER CONTROL CENTER</div><h1>Platform <em>administration.</em></h1><p>Manage the learning platform from one place. Changes are protected by your admin account.</p>{error&&<p className="formMessage">{error}</p>}
 <div className="portalMetrics">{[["TOTAL USERS",counts.users],["STUDENTS",counts.students],["TEACHERS",counts.teachers],["COURSES",counts.courses],["PUBLISHED",counts.published],["ENROLLMENTS",counts.enrollments],["PAYMENTS",counts.payments],["OPEN SUPPORT",counts.support]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginTop:26}}>{sections.map(s=><Link key={s.href} href={s.href} className="portalPanel" style={{textDecoration:"none",color:"inherit",display:"block",minHeight:135}}><small style={{color:"#9a7655",letterSpacing:2}}>{s.icon} / CONTROL</small><h2 style={{margin:"10px 0 6px"}}>{s.title} ↗</h2><p style={{margin:0,fontSize:14,opacity:.75}}>{s.desc}</p></Link>)}</div>
 <div className="portalPanel" style={{marginTop:20}}><h2>Recently registered accounts</h2>{recent.map(u=><p key={u.id} style={{borderBottom:"1px solid #eee",padding:"8px 0",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span>{u.full_name||"Learner"} · {u.role}</span><small>{new Date(u.created_at).toLocaleDateString("en-IN")}</small></p>)}{!recent.length&&!error&&<p>No accounts found yet.</p>}<Link href="/admin/users">Open user directory →</Link></div>
 <p style={{fontSize:12,opacity:.65,marginTop:20}}>Course curriculum, private video uploads, learner progress, live-class attendance, website CMS and realtime support are connected. External payment gateways still need your merchant credentials.</p>
 </section></main>;
}
