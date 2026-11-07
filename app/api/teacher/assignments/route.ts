import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
import {canAdminAccess} from "@/lib/admin-session";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="teacher"&&profile?.role!=="admin")return NextResponse.json({error:"Teacher access required."},{status:403});
  if(profile.role==="admin"&&!await canAdminAccess("courses",true))return NextResponse.json({error:"You do not have edit access to courses."},{status:403});
  const body=await req.json();const courseId=String(body.courseId||"");const title=String(body.title||"").trim();const description=String(body.description||"").trim();const maxPoints=Number(body.maxPoints||100);
  if(!courseId||!title||title.length>180||description.length>5000||!Number.isInteger(maxPoints)||maxPoints<1||maxPoints>1000)return NextResponse.json({error:"Check the assignment details."},{status:400});
  const db=createAdminDb();const {data:course}=await db.from("courses").select("id,teacher_id").eq("id",courseId).maybeSingle();
  if(!course||(profile.role==="teacher"&&course.teacher_id!==user.id))return NextResponse.json({error:"You cannot create assignments for this course."},{status:403});
  const dueAt=body.dueAt?new Date(body.dueAt):null;if(dueAt&&Number.isNaN(dueAt.getTime()))return NextResponse.json({error:"Invalid due date."},{status:400});
  const {data,error}=await db.from("course_assignments").insert({course_id:courseId,title,description,due_at:dueAt?.toISOString()||null,max_points:maxPoints,created_by:user.id}).select("id").single();
  if(error)throw error;return NextResponse.json({ok:true,id:data.id});
 }catch(e){console.error("Create assignment failed",e);return NextResponse.json({error:"Could not create assignment."},{status:500});}
}
export async function PATCH(req:NextRequest){
 try{
  const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="teacher"&&profile?.role!=="admin")return NextResponse.json({error:"Teacher access required."},{status:403});
  if(profile.role==="admin"&&!await canAdminAccess("courses",true))return NextResponse.json({error:"You do not have edit access to courses."},{status:403});
  const body=await req.json();const submissionId=String(body.submissionId||"");const grade=Number(body.grade);const feedback=String(body.feedback||"").trim();
  if(!submissionId||!Number.isInteger(grade)||grade<0||grade>1000||feedback.length>4000)return NextResponse.json({error:"Enter a valid grade and feedback."},{status:400});
  const db=createAdminDb();const {data:submission}=await db.from("assignment_submissions").select("id,assignment_id").eq("id",submissionId).maybeSingle();
  if(!submission)return NextResponse.json({error:"Submission not found."},{status:404});
  const {data:assignment}=await db.from("course_assignments").select("course_id,max_points").eq("id",submission.assignment_id).maybeSingle();
  if(!assignment)return NextResponse.json({error:"Assignment not found."},{status:404});
  const {data:course}=await db.from("courses").select("teacher_id").eq("id",assignment.course_id).maybeSingle();
  if(profile.role==="teacher"&&course?.teacher_id!==user.id)return NextResponse.json({error:"You cannot grade this submission."},{status:403});
  if(grade>assignment.max_points)return NextResponse.json({error:"Grade cannot exceed the maximum points."},{status:400});
  const {error}=await db.from("assignment_submissions").update({grade,feedback,status:"graded",graded_by:user.id,graded_at:new Date().toISOString()}).eq("id",submissionId);
  if(error)throw error;return NextResponse.json({ok:true});
 }catch(e){console.error("Grade submission failed",e);return NextResponse.json({error:"Could not save grade."},{status:500});}
}
