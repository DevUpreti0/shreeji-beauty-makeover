import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
import {canAdminAccess} from "@/lib/admin-session";
export const dynamic="force-dynamic";
export default async function TeacherQuizResultsPage(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="teacher"&&profile?.role!=="admin")redirect("/login");
 if(profile?.role==="admin"&&!await canAdminAccess("assessments"))redirect("/admin");
 const db=createAdminDb();
 const {data:courses}=await db.from("courses").select("id,title").eq("teacher_id",user.id);
 const courseIds=(courses||[]).map((c:any)=>c.id);
 const {data:quizzes}=courseIds.length?await db.from("course_quizzes").select("id,course_id,title").in("course_id",courseIds):{data:[] as any[]};
 const quizIds=(quizzes||[]).map((q:any)=>q.id);
 const {data:attempts}=quizIds.length?await db.from("quiz_attempts").select("id,quiz_id,student_id,score,passed,submitted_at").in("quiz_id",quizIds).order("submitted_at",{ascending:false}).limit(500):{data:[] as any[]};
 const studentIds=Array.from(new Set((attempts||[]).map((a:any)=>a.student_id)));
 const {data:students}=studentIds.length?await db.from("profiles").select("id,full_name").in("id",studentIds):{data:[] as any[]};
 const quizMap=new Map((quizzes||[]).map((q:any)=>[q.id,q]));const studentMap=new Map((students||[]).map((s:any)=>[s.id,s.full_name||"Student"]));
 return <main className="portalPage"><header className="portalHeader"><Link href="/teacher" className="brand">← TEACHER DASHBOARD</Link><Link href="/teacher/students" className="outline">Manage students</Link></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">ASSESSMENT PERFORMANCE</div><h1>Quiz <em>results.</em></h1><p>Review automatic scores from quizzes attached to your assigned courses.</p><div className="portalPanel" style={{marginTop:20,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}><thead><tr><th align="left">Student</th><th align="left">Course quiz</th><th align="left">Score</th><th align="left">Result</th><th align="left">Submitted</th></tr></thead><tbody>{(attempts||[]).map((a:any)=><tr key={a.id} style={{borderTop:"1px solid #ffffff20"}}><td style={{padding:"12px 8px"}}>{studentMap.get(a.student_id)||"Student"}</td><td style={{padding:"12px 8px"}}>{quizMap.get(a.quiz_id)?.title||"Quiz"}</td><td style={{padding:"12px 8px"}}>{a.score}%</td><td style={{padding:"12px 8px"}}>{a.passed?"Passed":"Retry needed"}</td><td style={{padding:"12px 8px",whiteSpace:"nowrap"}}>{new Date(a.submitted_at).toLocaleString("en-IN")}</td></tr>)}</tbody></table>{!attempts?.length&&<p>No student quiz attempts yet.</p>}</div></section></main>;
}
