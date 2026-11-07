import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
async function studentAccess(courseId:string){
 const auth=await createSupabaseServerClient();const {data:{user},error}=await auth.auth.getUser();
 if(error||!user)return {error:NextResponse.json({error:"Sign in required."},{status:401})} as const;
 const {data:profile}=await auth.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="student")return {error:NextResponse.json({error:"Student access required."},{status:403})} as const;
 const admin=createAdminDb();const {data:enrollment}=await admin.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",courseId).in("status",["active","paid","completed"]).maybeSingle();
 if(!enrollment)return {error:NextResponse.json({error:"You are not enrolled in this course."},{status:403})} as const;
 return {user,admin} as const;
}
export async function GET(req:NextRequest){
 try{
  const courseId=req.nextUrl.searchParams.get("courseId")||"";
  if(!/^[0-9a-f-]{36}$/i.test(courseId))return NextResponse.json({error:"Valid course ID required."},{status:400});
  const access=await studentAccess(courseId);if("error" in access)return access.error;
  const {data:quizzes,error}=await access.admin.from("course_quizzes").select("id,title,description,questions,passing_score").eq("course_id",courseId).eq("is_published",true).order("created_at",{ascending:true});
  if(error)throw error;
  const {data:attempts}=await access.admin.from("quiz_attempts").select("id,quiz_id,score,passed,submitted_at").eq("student_id",access.user.id).in("quiz_id",(quizzes||[]).map(q=>q.id));
  const safe=(quizzes||[]).map(q=>({id:q.id,title:q.title,description:q.description,passingScore:q.passing_score,questions:(Array.isArray(q.questions)?q.questions:[]).map((item:any)=>({question:item.question,options:item.options}))}));
  return NextResponse.json({quizzes:safe,attempts:attempts||[]});
 }catch{return NextResponse.json({error:"Could not load course assessments."},{status:500});}
}
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const quizId=String(body.quizId||"");const answers=body.answers;
  if(!/^[0-9a-f-]{36}$/i.test(quizId)||!Array.isArray(answers)||answers.length>50||answers.some((x:any)=>!Number.isInteger(x)||x<0||x>5))return NextResponse.json({error:"Invalid quiz submission."},{status:400});
  const auth=await createSupabaseServerClient();const {data:{user},error}=await auth.auth.getUser();if(error||!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {data:profile}=await auth.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="student")return NextResponse.json({error:"Student access required."},{status:403});
  const admin=createAdminDb();const {data:quiz,error:quizError}=await admin.from("course_quizzes").select("id,course_id,questions,passing_score,is_published").eq("id",quizId).maybeSingle();
  if(quizError||!quiz||!quiz.is_published)return NextResponse.json({error:"Quiz not found or not published."},{status:404});
  const {data:enrollment}=await admin.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",quiz.course_id).in("status",["active","paid","completed"]).maybeSingle();if(!enrollment)return NextResponse.json({error:"You are not enrolled in this course."},{status:403});
  const questions=Array.isArray(quiz.questions)?quiz.questions:[];if(!questions.length||answers.length!==questions.length)return NextResponse.json({error:"Please answer every question before submitting."},{status:400});
  let correct=0;for(let i=0;i<questions.length;i++){const q=questions[i];if(Number.isInteger(q.correctIndex)&&answers[i]===q.correctIndex)correct++;}
  const score=Math.round(correct/questions.length*100);const passed=score>=quiz.passing_score;
  const {data:attempt,error:insertError}=await admin.from("quiz_attempts").insert({quiz_id:quiz.id,student_id:user.id,answers,score,passed}).select("id,score,passed,submitted_at").single();
  if(insertError)throw insertError;
  return NextResponse.json({attempt,correct,total:questions.length,passingScore:quiz.passing_score});
 }catch{return NextResponse.json({error:"Could not submit your assessment. Please try again."},{status:500});}
}