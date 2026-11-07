import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
import MeetingRoom from "./meeting-room";
import {formatIndiaDateTime} from "@/lib/datetime";
export const dynamic="force-dynamic";

export default async function LiveClassPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("full_name,role,avatar_url").eq("id",user.id).single();
 const {data:c}=await db.from("live_classes").select("id,title,starts_at,duration_minutes,status,course_id,teacher_id,room_name,courses(title)").eq("id",id).maybeSingle();if(!c)notFound();
 const adminDb=createAdminDb();
 const allowed=profile?.role==="admin"||c.teacher_id===user.id||!!(await adminDb.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",c.course_id).in("status",["active","paid","completed"]).maybeSingle()).data;
 if(!allowed)redirect("/student");
 const start=new Date(c.starts_at).getTime(),now=Date.now(),end=start+c.duration_minutes*60000;const isStaff=profile?.role==="admin"||c.teacher_id===user.id;const withinWindow=c.status==="live"||(now>=start-15*60000&&now<=end+30*60000);const unavailable=["cancelled","completed"].includes(c.status);
 let participants:{id:string;name:string;email:string;avatar:string|null;role:string}[]=[];
 try{
  const {data:enrollments}=await adminDb.from("enrollments").select("student_id").eq("course_id",c.course_id).in("status",["active","paid","completed"]);
  const ids=Array.from(new Set([c.teacher_id,...(enrollments||[]).map((x:any)=>x.student_id)].filter(Boolean)));
  if(ids.length){
   const {data:people}=await adminDb.from("profiles").select("id,full_name,avatar_url,role").in("id",ids);
   participants=await Promise.all((people||[]).map(async(p:any)=>{
    const {data}=await adminDb.auth.admin.getUserById(p.id);
    return {id:p.id,name:p.full_name||"Class participant",email:data.user?.email||"Email unavailable",avatar:p.avatar_url||null,role:p.role||"student"};
   }));
   participants.sort((a,b)=>(a.role==="teacher"?-1:b.role==="teacher"?1:a.name.localeCompare(b.name)));
  }
 }catch{participants=[];}
 return <main className="portalPage"><header className="portalHeader"><Link href="/live-classes" className="brand">← LIVE CLASSES</Link><span className="meetBrandSmall">DUKU MEET FCA</span></header><section className="portalContent"><div className="eyebrow">DUKU MEET FCA · LIVE CLASSROOM</div><h1>{c.title}</h1><p>{(c as any).courses?.title} · {formatIndiaDateTime(c.starts_at)} · {c.duration_minutes} minutes</p>
 {participants.length>0&&<section className="classPeople"><div className="classPeopleHead"><div><small>CLASS DIRECTORY</small><h2>People in this course</h2></div><span>{participants.length} participants</span></div><div className="classPeopleGrid">{participants.map(p=><article className="classPerson" key={p.id}>{p.avatar?<img src={p.avatar} alt="" />:<div className="classPersonInitial">{p.name.slice(0,1).toUpperCase()}</div>}<div><b>{p.name}</b><span>{p.email}</span><small>{p.role}</small></div></article>)}</div></section>}
 {unavailable?<div className="portalPanel">This class is {c.status}.</div>:!isStaff&&!withinWindow?<div className="portalPanel"><h2>Classroom not open yet</h2><p>This room opens 15 minutes before the scheduled start time. Please return at {new Date(c.starts_at).toLocaleString("en-IN")}.</p></div>:<MeetingRoom classId={c.id} roomName={c.room_name} displayName={profile?.full_name||user.email||"Learner"}/>}
 <p style={{fontSize:12,opacity:.7}}>DuKu Meet FCA is powered by the free public Jitsi Meet service. Provider-owned branding may still appear in some embedded screens and cannot be guaranteed removable on the public service.</p></section></main>;
}
