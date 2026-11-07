import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
import {canAdminAccess} from "@/lib/admin-session";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {event}=await req.json();if(event!=="joined"&&event!=="left"&&event!=="heartbeat")return NextResponse.json({error:"Invalid attendance event."},{status:400});
  const db=createAdminDb();const {data:c}=await db.from("live_classes").select("id,course_id,teacher_id,status,starts_at,duration_minutes").eq("id",id).maybeSingle();if(!c)return NextResponse.json({error:"Class not found."},{status:404});
  const {data:p}=await auth.from("profiles").select("role").eq("id",user.id).maybeSingle();
  const isAdmin=p?.role==="admin"&&await canAdminAccess("live-classes"),isTeacher=c.teacher_id===user.id;
  const {data:enrollment}=!isAdmin&&!isTeacher?await db.from("enrollments").select("id").eq("student_id",user.id).eq("course_id",c.course_id).in("status",["active","paid","completed"]).maybeSingle():{data:null};
  if(!isAdmin&&!isTeacher&&!enrollment)return NextResponse.json({error:"You are not enrolled in this course."},{status:403});
  if(event==="joined"){
   if(["cancelled","completed"].includes(c.status))return NextResponse.json({error:"This class is no longer available."},{status:410});
   const start=new Date(c.starts_at).getTime(),now=Date.now(),end=start+c.duration_minutes*60000;
   if(!isAdmin&&!isTeacher&&c.status!=="live"&&(now<start-15*60000||now>end+30*60000))return NextResponse.json({error:"This classroom opens 15 minutes before its scheduled start."},{status:403});
   const {error}=await db.from("live_class_attendance").upsert({live_class_id:id,user_id:user.id,joined_at:new Date().toISOString(),last_seen_at:new Date().toISOString(),left_at:null},{onConflict:"live_class_id,user_id"});if(error)throw error;
  }else if(event==="heartbeat"){
   const {data:active}=await db.from("live_class_attendance").select("id").eq("live_class_id",id).eq("user_id",user.id).is("left_at",null).maybeSingle();
   if(!active)return NextResponse.json({error:"No active attendance session was found."},{status:409});
   const {error}=await db.from("live_class_attendance").update({last_seen_at:new Date().toISOString()}).eq("id",active.id);if(error)throw error;
  }else{
   const {error}=await db.from("live_class_attendance").update({left_at:new Date().toISOString(),last_seen_at:new Date().toISOString()}).eq("live_class_id",id).eq("user_id",user.id);if(error)throw error;
  }
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Attendance could not be recorded."},{status:500});}
}
