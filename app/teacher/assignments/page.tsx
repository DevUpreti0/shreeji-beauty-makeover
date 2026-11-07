import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
import TeacherAssignmentManager from "./teacher-assignment-manager";
export const dynamic="force-dynamic";
export default async function TeacherAssignmentsPage(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="teacher")redirect("/login");
 const db=createAdminDb();const {data:courses}=await db.from("courses").select("id,title").eq("teacher_id",user.id).order("created_at",{ascending:false});
 const ids=(courses||[]).map((c:any)=>c.id);
 const {data:assignments}=ids.length?await db.from("course_assignments").select("id,course_id,title,description,due_at,max_points,created_at").in("course_id",ids).order("created_at",{ascending:false}):{data:[] as any[]};
 const aids=(assignments||[]).map((a:any)=>a.id);
 const {data:submissions}=aids.length?await db.from("assignment_submissions").select("id,assignment_id,student_id,submission_text,attachment_url,status,grade,feedback,submitted_at").in("assignment_id",aids).order("submitted_at",{ascending:false}):{data:[] as any[]};
 const sids=Array.from(new Set((submissions||[]).map((s:any)=>s.student_id)));
 const {data:students}=sids.length?await db.from("profiles").select("id,full_name").in("id",sids):{data:[] as any[]};
 const studentNames=new Map((students||[]).map((s:any)=>[s.id,s.full_name||"Student"]));
 const courseNames=new Map((courses||[]).map((c:any)=>[c.id,c.title]));
 const rows=(assignments||[]).map((a:any)=>({...a,courseTitle:courseNames.get(a.course_id)||"Course",submissions:(submissions||[]).filter((s:any)=>s.assignment_id===a.id).map((s:any)=>({...s,studentName:studentNames.get(s.student_id)||"Student"}))}));
 return <main className="portalPage"><header className="portalHeader"><Link href="/teacher" className="brand">SHREEJI <b>TEACHER</b></Link></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">COURSEWORK MANAGEMENT</div><h1>Assignments & <em>grading.</em></h1><p>Create practical work for your courses and grade each learner's submission with feedback.</p><TeacherAssignmentManager courses={courses||[]} assignments={rows}/></section></main>;
}
