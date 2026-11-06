import Link from "next/link";import {redirect,notFound} from "next/navigation";import {createSupabaseServerClient} from "@/lib/supabase-server";import MeetingRoom from "./meeting-room";
export const dynamic="force-dynamic";
export default async function LiveClassPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("full_name,role").eq("id",user.id).single();
 const {data:c}=await db.from("live_classes").select("id,title,starts_at,duration_minutes,status,course_id,teacher_id,room_name,courses(title)").eq("id",id).maybeSingle();if(!c)notFound();
 const allowed=profile?.role==="admin"||c.teacher_id===user.id||!!(await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",c.course_id).in("status",["active","paid","completed"]).maybeSingle()).data;
 if(!allowed)redirect("/student");
 return <main className="portalPage"><header className="portalHeader"><Link href="/live-classes" className="brand">← LIVE CLASSES</Link></header><section className="portalContent"><div className="eyebrow">DUKU MEET PROFESSIONAL LMS</div><h1>{c.title}</h1><p>{(c as any).courses?.title} · {new Date(c.starts_at).toLocaleString("en-IN")} · {c.duration_minutes} minutes</p>{c.status==="cancelled"||c.status==="completed"?<div className="portalPanel">This class is {c.status}.</div>:<MeetingRoom roomName={c.room_name} displayName={profile?.full_name||user.email||"Learner"}/>}<p style={{fontSize:12,opacity:.7}}>Meeting service: Jitsi Meet public instance. Use unique room names and do not share the room URL outside your enrolled class.</p></section></main>;
}
