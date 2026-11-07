import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import StudentAssignmentCenter from "./student-assignment-center";
export const dynamic="force-dynamic";
export default async function StudentAssignmentsPage(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="student")redirect("/login");
 const {data:assignments}=await sb.from("course_assignments").select("id,course_id,title,description,due_at,max_points,courses(title)").order("created_at",{ascending:false});
 const {data:submissions}=await sb.from("assignment_submissions").select("id,assignment_id,submission_text,attachment_url,status,grade,feedback,submitted_at").eq("student_id",user.id);
 const courseNames=new Map((assignments||[]).map((a:any)=>[a.course_id,a.courses?.title||"Course"]));
 const rows=(assignments||[]).map((a:any)=>({...a,courseTitle:courseNames.get(a.course_id)||"Course",submission:(submissions||[]).find((s:any)=>s.assignment_id===a.id)||null}));
 return <main className="portalPage"><header className="portalHeader"><Link href="/student" className="brand">SHREEJI <b>LEARNER</b></Link></header><section className="portalContent" style={{maxWidth:1100}}><div className="eyebrow">PRACTICAL LEARNING</div><h1>My <em>assignments.</em></h1><p>Submit your work, track review status and read teacher feedback.</p><StudentAssignmentCenter assignments={rows}/></section></main>;
}
