import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const path=req.nextUrl.searchParams.get("path")||"";if(!path||path.length>600)return NextResponse.json({error:"Invalid file path."},{status:400});
 const db=createAdminDb();const stored="storage:student-submissions/"+path;
 const {data:submission}=await db.from("assignment_submissions").select("id,student_id,assignment_id").eq("attachment_url",stored).maybeSingle();
 if(!submission)return NextResponse.json({error:"File not found."},{status:404});
 let allowed=submission.student_id===user.id;
 if(!allowed){
  const {data:assignment}=await db.from("course_assignments").select("course_id").eq("id",submission.assignment_id).maybeSingle();
  if(assignment){const {data:course}=await db.from("courses").select("teacher_id").eq("id",assignment.course_id).maybeSingle();allowed=course?.teacher_id===user.id;}
 }
 if(!allowed)return NextResponse.json({error:"You cannot access this file."},{status:403});
 const {data,error}=await db.storage.from("student-submissions").createSignedUrl(path,300);
 if(error||!data?.signedUrl)return NextResponse.json({error:"Could not prepare secure download."},{status:500});
 return NextResponse.redirect(data.signedUrl);
}
