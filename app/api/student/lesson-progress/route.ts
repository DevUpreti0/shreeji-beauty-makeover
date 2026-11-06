import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {lessonId,completed,watchedSeconds}=await req.json();if(typeof lessonId!=="string")return NextResponse.json({error:"Lesson is required."},{status:400});
  const seconds=Math.max(0,Math.min(86400,Math.floor(Number(watchedSeconds)||0)));
  const {data:lesson}=await db.from("lessons").select("id,module_id").eq("id",lessonId).maybeSingle();if(!lesson)return NextResponse.json({error:"Lesson not found."},{status:404});
  const {data:module}=await db.from("modules").select("course_id").eq("id",lesson.module_id).maybeSingle();if(!module)return NextResponse.json({error:"Course module not found."},{status:404});
  const {data:enrollment}=await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",module.course_id).in("status",["active","paid","completed"]).maybeSingle();if(!enrollment)return NextResponse.json({error:"You are not enrolled in this course."},{status:403});
  const {data,error}=await db.from("lesson_progress").upsert({student_id:user.id,lesson_id:lessonId,completed:completed===true,watched_seconds:seconds,updated_at:new Date().toISOString()},{onConflict:"student_id,lesson_id"}).select("completed,watched_seconds").single();if(error)throw error;
  return NextResponse.json({progress:data});
 }catch{return NextResponse.json({error:"Could not save lesson progress."},{status:500});}
}
