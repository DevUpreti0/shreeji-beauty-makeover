import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import CourseLearningPlayer from "./course-learning-player";
export const dynamic="force-dynamic";
export default async function StudentCoursePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).single();if(profile?.role!=="student")redirect("/login");
 const {data:enrollment}=await db.from("enrollments").select("id,status").eq("student_id",user.id).eq("course_id",id).in("status",["active","paid","completed"]).maybeSingle();if(!enrollment)redirect("/student");
 const {data:course}=await db.from("courses").select("id,title,description,thumbnail_url,category,level").eq("id",id).maybeSingle();if(!course)notFound();
 const {data:modules}=await db.from("modules").select("id,title,position").eq("course_id",id).order("position");const ids=(modules||[]).map(m=>m.id);
 const [{data:lessons},{data:progress}]=ids.length?await Promise.all([db.from("lessons").select("id,module_id,title,description,video_url,duration_seconds,position,is_preview").in("module_id",ids).order("position"),db.from("lesson_progress").select("lesson_id,completed,watched_seconds").eq("student_id",user.id)]):[{data:[] as any[]},{data:[] as any[]}];
 const curriculum=(modules||[]).map(m=>({...m,lessons:(lessons||[]).filter(l=>l.module_id===m.id)}));
 return <main className="portalPage"><header className="portalHeader"><Link href="/student" className="brand">← MY LEARNING</Link><Link href="/live-classes">Live classrooms ↗</Link></header><section className="portalContent" style={{maxWidth:1250}}><div className="eyebrow">{course.category} · {course.level}</div><h1>{course.title}</h1><p>{course.description}</p><CourseLearningPlayer courseId={id} modules={curriculum as any} initialProgress={progress||[]}/></section></main>;
}
