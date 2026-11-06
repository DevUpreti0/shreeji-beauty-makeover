import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const raw=req.nextUrl.searchParams.get("path")||"";const prefix="storage://course-videos/";if(!raw.startsWith(prefix))return NextResponse.json({error:"Invalid video reference."},{status:400});
  const path=raw.slice(prefix.length);const courseId=path.split("/")[0];if(!courseId||path.includes(".."))return NextResponse.json({error:"Invalid video path."},{status:400});
  const db=createAdminDb();const [{data:profile},{data:course}]=await Promise.all([db.from("profiles").select("role").eq("id",user.id).maybeSingle(),db.from("courses").select("id,teacher_id").eq("id",courseId).maybeSingle()]);
  if(!course)return NextResponse.json({error:"Course not found."},{status:404});
  const staff=profile?.role==="admin"||(profile?.role==="teacher"&&course.teacher_id===user.id);
  const {data:enrollment}=!staff?await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",courseId).in("status",["active","paid","completed"]).maybeSingle():{data:null};
  if(!staff&&!enrollment)return NextResponse.json({error:"You are not enrolled in this course."},{status:403});
  const {data,error}=await db.storage.from("course-videos").createSignedUrl(path,3600);if(error||!data?.signedUrl)return NextResponse.json({error:"Could not prepare protected video."},{status:502});
  return NextResponse.json({url:data.signedUrl},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Video access could not be verified."},{status:500});}
}
