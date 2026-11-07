import Link from "next/link";import {redirect} from "next/navigation";import {createSupabaseServerClient} from "@/lib/supabase-server";
export const dynamic="force-dynamic";
export default async function LiveClasses(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 let query=db.from("live_classes").select("id,title,starts_at,duration_minutes,status,course_id,courses(title)").order("starts_at",{ascending:true}).limit(100);
 if(profile?.role==="teacher")query=query.eq("teacher_id",user.id);
 else if(profile?.role!=="admin"){
  const {data:enrollments}=await db.from("enrollments").select("course_id").eq("student_id",user.id).in("status",["active","paid","completed"]);
  const courseIds=(enrollments||[]).map((e:any)=>e.course_id).filter(Boolean);
  if(!courseIds.length)return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>LIVE CLASSROOM</b></Link><Link href="/student">My learning</Link></header><section className="portalContent"><div className="eyebrow">DUKU MEET · COURSE CLASSROOMS</div><h1>Your live <em>classes.</em></h1><p>Live sessions for courses you are enrolled in will appear here.</p><div className="portalPanel">You do not have any active course enrollments yet.</div></section></main>;
  query=query.in("course_id",courseIds);
 }
 const {data:classes,error}=await query;
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>LIVE CLASSROOM</b></Link><Link href={profile?.role==="teacher"?"/teacher":"/student"}>My workspace</Link></header><section className="portalContent"><div className="eyebrow">DUKU MEET · COURSE CLASSROOMS</div><h1>Live <em>classrooms.</em></h1><p>Join scheduled course conversations and interactive lessons.</p>{error&&<div className="portalPanel">Could not load classes. Ask the administrator to check the live-class setup.</div>}<div style={{display:"grid",gap:14}}>{(classes||[]).map((c:any)=><article className="portalPanel" key={c.id}><small>{c.status.toUpperCase()} · {new Date(c.starts_at).toLocaleString("en-IN")}</small><h2>{c.title}</h2><p>{c.courses?.title||"Course"} · {c.duration_minutes} minutes</p><Link className="primary inlineButton" href={"/live-classes/"+c.id}>Open classroom ↗</Link></article>)}{!classes?.length&&!error&&<div className="portalPanel">No live classes scheduled for your courses yet.</div>}</div></section></main>;
}