import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import StudentQuizCenter from "./student-quiz-center";
export const dynamic="force-dynamic";
export default async function StudentQuizzesPage(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:enrollments}=await sb.from("enrollments").select("course_id,courses(title)").eq("student_id",user.id).eq("status","active");
 const courseIds=(enrollments||[]).map((e:any)=>e.course_id);
 const {data:rawQuizzes}=courseIds.length?await sb.from("course_quizzes").select("id,course_id,title,description,questions,passing_score").in("course_id",courseIds).eq("is_published",true).order("created_at",{ascending:false}):{data:[] as any[]};
 const courseNames=new Map((enrollments||[]).map((e:any)=>[e.course_id,e.courses?.title||"Course"]));
 const quizzes=(rawQuizzes||[]).map((q:any)=>({id:q.id,title:q.title,description:q.description,courseTitle:courseNames.get(q.course_id)||"Course",passingScore:q.passing_score,questions:(Array.isArray(q.questions)?q.questions:[]).map((item:any)=>({question:item.question,options:item.options}))}));
 const {data:attempts}=await sb.from("quiz_attempts").select("id,quiz_id,score,passed,submitted_at").eq("student_id",user.id).order("submitted_at",{ascending:false}).limit(100);
 return <main className="portalPage"><header className="portalHeader"><Link href="/student" className="brand">← STUDENT DASHBOARD</Link><Link href="/student/certificates" className="outline">My certificates</Link></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">PRACTICE & KNOWLEDGE CHECKS</div><h1>Course <em>quizzes.</em></h1><p>Test your understanding, see your score instantly and retry when you are ready.</p><StudentQuizCenter quizzes={quizzes} initialAttempts={attempts||[]}/></section></main>;
}
