import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Please sign in first."},{status:401});
  const body=await req.json();const quizId=String(body.quizId||"");const answers=body.answers;
  if(!quizId||!Array.isArray(answers)||answers.length>50||answers.some((x:any)=>!Number.isInteger(x)||x<0||x>5))return NextResponse.json({error:"Invalid quiz answers."},{status:400});
  const db=createAdminDb();
  const {data:quiz,error}=await db.from("course_quizzes").select("id,course_id,questions,passing_score,is_published").eq("id",quizId).maybeSingle();
  if(error||!quiz||!quiz.is_published||!Array.isArray(quiz.questions))return NextResponse.json({error:"Quiz is not available."},{status:404});
  const {data:enrollment}=await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",quiz.course_id).eq("status","active").maybeSingle();
  if(!enrollment)return NextResponse.json({error:"You need an active enrollment to take this quiz."},{status:403});
  if(answers.length!==quiz.questions.length||quiz.questions.length<1)return NextResponse.json({error:"Answer every question before submitting."},{status:400});
  let correct=0;const sanitized=quiz.questions.map((q:any,i:number)=>{const index=answers[i];if(!Array.isArray(q.options)||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length||index>=q.options.length)throw new Error("Invalid quiz answer key.");if(index===q.correctIndex)correct++;return {selected:index};});
  const score=Math.round(correct/quiz.questions.length*100);const passed=score>=Number(quiz.passing_score||0);
  const {data:attempt,error:insertError}=await db.from("quiz_attempts").insert({quiz_id:quiz.id,student_id:user.id,answers:sanitized,score,passed,submitted_at:new Date().toISOString()}).select("id").single();
  if(insertError)throw insertError;
  return NextResponse.json({attemptId:attempt.id,score,correct,total:quiz.questions.length,passed});
 }catch(error){console.error("Quiz submission failed",error);return NextResponse.json({error:"Quiz submission failed. Please try again."},{status:500});}
}
