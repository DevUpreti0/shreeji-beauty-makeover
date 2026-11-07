import {redirect} from "next/navigation";
import Link from "next/link";
import {isAdminSessionValid,clearAdminSession,currentAdminIdentity,canAdminAccess} from "@/lib/admin-session";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import NotificationCenter from "@/app/components/notification-center";
export const dynamic="force-dynamic";
async function logout(){ "use server"; await clearAdminSession(); redirect("/login"); }
const sections=[
 {key:"users",href:"/admin/users",title:"Users & roles",desc:"View accounts and manage learner and teacher access.",icon:"01"},
 {key:"courses",href:"/admin/courses",title:"Course catalogue",desc:"Create courses, edit catalogue and publish or archive.",icon:"02"},
 {key:"assessments",href:"/admin/assessments",title:"Quizzes & assessments",desc:"Build course assessments and review learner attempts.",icon:"02A"},
 {key:"courses",href:"/admin/assignments",title:"Assignment oversight",desc:"Monitor teacher assignments, learner submissions and pending grading.",icon:"02B"},
 {key:"enrollments",href:"/admin/enrollments",title:"Enrollments",desc:"Review learner access and manage enrollment status.",icon:"03"},
 {key:"payments",href:"/admin/payments",title:"Payments",desc:"Review payment records, amounts and payment states.",icon:"04"},
 {key:"coupons",href:"/admin/coupons",title:"Coupons & discounts",desc:"Generate free-course codes, percentage offers and fixed discounts.",icon:"04A"},
 {key:"live-classes",href:"/admin/live-classes",title:"Live classes",desc:"Schedule and host DuKu Meet classrooms and review attendance.",icon:"05"},
 {key:"support",href:"/admin/support",title:"Live support inbox",desc:"Read support conversations, reply and close tickets.",icon:"07"},
 {key:"chat",href:"/chat",title:"DuKu Chat",desc:"Private messaging between administrators, teachers and students.",icon:"CHAT"},
 {key:"settings",href:"/admin/settings",title:"Platform settings",desc:"Configure payment mode, meeting service and support contact.",icon:"06"},
 {key:"website",href:"/admin/website",title:"Website content editor",desc:"Edit branding, images, theme, menus, FAQs, sections and custom pages.",icon:"07"},
 {key:"teacher",href:"/teacher",title:"Teacher workspace",desc:"Open teaching workspace and course authoring.",icon:"08"},
 {key:"public",href:"/",title:"View public website",desc:"Open the learner-facing Shreeji Beauty Makeover site.",icon:"10"}
];
export default async function AdminPage(){
 if(!await isAdminSessionValid())redirect("/login");
 const identity=await currentAdminIdentity();
 const keys=["users","courses","assessments","enrollments","payments","coupons","live-classes","support","settings","website"];
 const perms=await Promise.all(keys.map(async key=>[key,identity?.isSuperAdmin||await canAdminAccess(key)] as const));
 const access=Object.fromEntries(perms) as Record<string,boolean>;
 const visibleSections=sections.filter(s=>s.key==="chat"||s.key==="teacher"||s.key==="public"||access[s.key]||(identity?.isSuperAdmin&&(s.href==="/admin/super-admin"||s.href==="/admin/super-admin/audit")));
 let counts={users:0,students:0,teachers:0,courses:0,published:0,enrollments:0,payments:0,support:0};
 let recent:any[]=[];let error="";
 try{
  const db=await createSupabaseServerClient();
  const count=async(table:string,column?:string,value?:string)=>{const q=db.from(table).select("*",{count:"exact",head:true});const result=column?q.eq(column,value):q;return result;};
  const jobs=await Promise.all([
   access.users?count("profiles"):Promise.resolve({count:0,error:null}),
   access.users?count("profiles","role","student"):Promise.resolve({count:0,error:null}),
   access.users?count("profiles","role","teacher"):Promise.resolve({count:0,error:null}),
   access.courses?count("courses"):Promise.resolve({count:0,error:null}),
   access.courses?count("courses","status","published"):Promise.resolve({count:0,error:null}),
   access.enrollments?count("enrollments"):Promise.resolve({count:0,error:null}),
   access.payments?count("payments"):Promise.resolve({count:0,error:null}),
   access.support?count("support_conversations","status","open"):Promise.resolve({count:0,error:null}),
   access.users?db.from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false}).limit(6):Promise.resolve({data:[],error:null})
  ]);
  const [u,s,t,c,p,e,pa,sp,rc]=jobs;
  if(jobs.some((x:any)=>x.error))throw new Error("Some permitted dashboard data is unavailable.");
  counts={users:u.count||0,students:s.count||0,teachers:t.count||0,courses:c.count||0,published:p.count||0,enrollments:e.count||0,payments:pa.count||0,support:sp.count||0};recent=(rc as any).data||[];
 }catch(err){error=err instanceof Error?err.message:"Dashboard data unavailable.";}
 const metricItems=[...(access.users?[["TOTAL USERS",counts.users],["STUDENTS",counts.students],["TEACHERS",counts.teachers]]:[]),...(access.courses?[["COURSES",counts.courses],["PUBLISHED",counts.published]]:[]),...(access.enrollments?[["ENROLLMENTS",counts.enrollments]]:[]),...(access.payments?[["PAYMENTS",counts.payments]]:[]),...(access.support?[["OPEN SUPPORT",counts.support]]:[])];
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>ADMIN</b></Link><NotificationCenter/><Link href="/profile" className="outline">My profile</Link><form action={logout}><button className="outline">Sign out</button></form></header><section className="portalContent">
 <div className="eyebrow">{identity?.isSuperAdmin?"OWNER CONTROL CENTER":"ADMIN WORKSPACE"}</div><h1>Platform <em>administration.</em></h1><p>{identity?.isSuperAdmin?"Full platform control and administrator governance.":"Only sections assigned to your administrator account are shown here."}</p>{error&&<p className="formMessage">{error}</p>}
 {metricItems.length>0&&<div className="portalMetrics">{metricItems.map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginTop:26}}>
 {identity?.isSuperAdmin&&[{href:"/admin/super-admin",title:"Super Admin",desc:"Appoint administrators and control section-by-section view and edit permissions.",icon:"ROOT"},{href:"/admin/super-admin/audit",title:"Admin access audit log",desc:"Review administrator appointments, removals and permission changes.",icon:"AUDIT"}].map(s=><Link key={s.href} href={s.href} className="portalPanel" style={{textDecoration:"none",color:"inherit",display:"block",minHeight:135}}><small style={{color:"#9a7655",letterSpacing:2}}>{s.icon} / CONTROL</small><h2 style={{margin:"10px 0 6px"}}>{s.title} ↗</h2><p style={{margin:0,fontSize:14,opacity:.75}}>{s.desc}</p></Link>)}
 {visibleSections.map(s=><Link key={s.href} href={s.href} className="portalPanel" style={{textDecoration:"none",color:"inherit",display:"block",minHeight:135}}><small style={{color:"#9a7655",letterSpacing:2}}>{s.icon} / CONTROL</small><h2 style={{margin:"10px 0 6px"}}>{s.title} ↗</h2><p style={{margin:0,fontSize:14,opacity:.75}}>{s.desc}</p></Link>)}
 </div>
 {access.users&&<div className="portalPanel" style={{marginTop:20}}><h2>Recently registered accounts</h2>{recent.map(u=><p key={u.id} style={{borderBottom:"1px solid #eee",padding:"8px 0",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span>{u.full_name||"Learner"} · {u.role}</span><small>{new Date(u.created_at).toLocaleDateString("en-IN")}</small></p>)}{!recent.length&&!error&&<p>No accounts found yet.</p>}<Link href="/admin/users">Open user directory →</Link></div>}
 <p style={{fontSize:12,opacity:.65,marginTop:20}}>Your section permissions control both dashboard visibility and protected editing actions.</p>
 </section></main>;
}