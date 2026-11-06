import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Sign in to upload course videos."},{status:401});
  const form=await req.formData(),courseId=String(form.get("courseId")||""),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Choose a video file."},{status:400});
  const allowed=["video/mp4","video/webm","video/quicktime"];if(!allowed.includes(file.type))return NextResponse.json({error:"Use MP4, WEBM or MOV video."},{status:415});
  if(file.size>50*1024*1024)return NextResponse.json({error:"Video must be 50 MB or smaller on the current free storage setup."},{status:413});
  const db=createAdminDb();const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();const {data:course}=await db.from("courses").select("id,teacher_id").eq("id",courseId).maybeSingle();
  if(!course)return NextResponse.json({error:"Course not found."},{status:404});if(profile?.role!=="admin"&&!(profile?.role==="teacher"&&course.teacher_id===user.id))return NextResponse.json({error:"You do not have permission to upload videos to this course."},{status:403});
  const ext=file.type==="video/mp4"?"mp4":file.type==="video/webm"?"webm":"mov";const path=courseId+"/"+Date.now()+"-"+randomUUID()+"."+ext;
  const {error}=await db.storage.from("course-videos").upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false,cacheControl:"3600"});if(error)throw error;
  return NextResponse.json({url:"storage://course-videos/"+path});
 }catch{return NextResponse.json({error:"Video upload failed. Check course video storage configuration."},{status:500});}
}
