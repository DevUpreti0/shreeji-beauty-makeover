import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="student")return NextResponse.json({error:"Student access required."},{status:403});
  const body=await req.json();const assignmentId=String(body.assignmentId||"");const submissionText=String(body.submissionText||"").trim();const attachmentUrl=String(body.attachmentUrl||"").trim();
  if(!assignmentId||submissionText.length>5000||attachmentUrl.length>1000||(!submissionText&&!attachmentUrl))return NextResponse.json({error:"Add your written answer or a file link."},{status:400});
  if(attachmentUrl&&!attachmentUrl.startsWith("storage:student-submissions/"+user.id+"/"+assignmentId+"/")){let url:URL;try{url=new URL(attachmentUrl);}catch{return NextResponse.json({error:"Invalid attachment reference."},{status:400});}if(url.protocol!=="https:")return NextResponse.json({error:"Attachment links must use HTTPS."},{status:400});}
  const db=createAdminDb();const {data:assignment}=await db.from("course_assignments").select("id,course_id,due_at").eq("id",assignmentId).maybeSingle();if(!assignment)return NextResponse.json({error:"Assignment not found."},{status:404});
  const {data:course}=await db.from("courses").select("teacher_id,title").eq("id",assignment.course_id).maybeSingle();
  const {data:enrollment}=await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",assignment.course_id).eq("status","active").maybeSingle();if(!enrollment)return NextResponse.json({error:"You need an active course enrollment."},{status:403});
  const {data:existing}=await db.from("assignment_submissions").select("id,status").eq("assignment_id",assignmentId).eq("student_id",user.id).maybeSingle();
  if(existing?.status==="graded")return NextResponse.json({error:"This submission has already been graded."},{status:409});
  if(attachmentUrl.startsWith("storage:student-submissions/")){const prefix="storage:student-submissions/"+user.id+"/"+assignmentId+"/";if(!attachmentUrl.startsWith(prefix))return NextResponse.json({error:"Invalid uploaded file reference."},{status:400});const objectPath=attachmentUrl.slice("storage:student-submissions/".length);const folder=user.id+"/"+assignmentId;const fileName=objectPath.slice(folder.length+1);const {data:objects,error:listError}=await db.storage.from("student-submissions").list(folder,{search:fileName});if(listError||!objects?.some((o:any)=>o.name===fileName))return NextResponse.json({error:"Uploaded file was not found. Please upload it again."},{status:400});}
  const payload={assignment_id:assignmentId,student_id:user.id,submission_text:submissionText,attachment_url:attachmentUrl||null,status:"submitted",grade:null,feedback:null,graded_by:null,graded_at:null,submitted_at:new Date().toISOString()};
  const {error}=await db.from("assignment_submissions").upsert(payload,{onConflict:"assignment_id,student_id"});if(error)throw error;
  if(course?.teacher_id)await db.from("user_notifications").insert({user_id:course.teacher_id,title:"New assignment submission",body:"A learner submitted work for review.",href:"/teacher/assignments",kind:"submission"});
  return NextResponse.json({ok:true,late:!!assignment.due_at&&new Date(assignment.due_at).getTime()<Date.now()});
 }catch(e){console.error("Assignment submission failed",e);return NextResponse.json({error:"Could not submit assignment."},{status:500});}
}
