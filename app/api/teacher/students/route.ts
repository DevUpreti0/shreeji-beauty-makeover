import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";

export const dynamic="force-dynamic";
const latest=(values:string[])=>values.sort().slice(-1)[0]||null;
export async function GET(){
 try{
  const auth=await createSupabaseServerClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const {data:profile}=await auth.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(!profile||!["teacher","admin"].includes(profile.role))return NextResponse.json({error:"Teacher access required."},{status:403});
  const db=createAdminDb();
  const {data:courses,error:courseError}=await db.from("courses").select("id,title,status").eq("teacher_id",user.id).order("title");
  if(courseError)throw courseError;
  const courseIds=(courses||[]).map((c:any)=>c.id);
  if(!courseIds.length)return NextResponse.json({students:[],courses:[]});
  const {data:enrollments,error:enrollmentError}=await db.from("enrollments").select("id,student_id,course_id,status,enrolled_at").in("course_id",courseIds).order("enrolled_at",{ascending:false});
  if(enrollmentError)throw enrollmentError;
  const studentIds=[...new Set((enrollments||[]).map((e:any)=>e.student_id))];
  if(!studentIds.length)return NextResponse.json({students:[],courses});
  const [{data:profiles,error:profileError},{data:modules,error:moduleError},{data:classes,error:classError}]=await Promise.all([
   db.from("profiles").select("id,full_name,avatar_url,phone,city,created_at").in("id",studentIds),
   db.from("modules").select("id,course_id").in("course_id",courseIds),
   db.from("live_classes").select("id,course_id,title,starts_at,duration_minutes,status").eq("teacher_id",user.id)
  ]);
  if(profileError||moduleError||classError)throw profileError||moduleError||classError;
  const moduleIds=(modules||[]).map((m:any)=>m.id);
  const [{data:lessons,error:lessonError},{data:attendance,error:attendanceError}]=await Promise.all([
   moduleIds.length?db.from("lessons").select("id,module_id").in("module_id",moduleIds):Promise.resolve({data:[],error:null}),
   (classes||[]).length?db.from("live_class_attendance").select("user_id,live_class_id,joined_at,left_at").in("live_class_id",(classes||[]).map((c:any)=>c.id)).in("user_id",studentIds):Promise.resolve({data:[],error:null})
  ]);
  if(lessonError||attendanceError)throw lessonError||attendanceError;
  const lessonIds=(lessons||[]).map((l:any)=>l.id);
  const {data:progress,error:progressError}=lessonIds.length?await db.from("lesson_progress").select("student_id,lesson_id,completed,watched_seconds,updated_at").in("lesson_id",lessonIds).in("student_id",studentIds):{data:[],error:null};
  if(progressError)throw progressError;
  const emails=new Map<string,string>();
  await Promise.all(studentIds.map(async(id:string)=>{const {data}=await db.auth.admin.getUserById(id);if(data?.user?.email)emails.set(id,data.user.email);}));
  const courseById=new Map((courses||[]).map((c:any)=>[c.id,c]));
  const modulesByCourse=new Map<string,string[]>();
  for(const m of modules||[]){const a=modulesByCourse.get(m.course_id)||[];a.push(m.id);modulesByCourse.set(m.course_id,a);}
  const lessonsByCourse=new Map<string,string[]>();
  for(const l of lessons||[]){const course=(modules||[]).find((m:any)=>m.id===l.module_id)?.course_id;if(course){const a=lessonsByCourse.get(course)||[];a.push(l.id);lessonsByCourse.set(course,a);}}
  const students=(profiles||[]).map((p:any)=>{
   const enrolled=(enrollments||[]).filter((e:any)=>e.student_id===p.id);
   const courseRows=enrolled.map((e:any)=>{
    const ids=lessonsByCourse.get(e.course_id)||[];
    const rows=(progress||[]).filter((x:any)=>x.student_id===p.id&&ids.includes(x.lesson_id));
    const completed=rows.filter((x:any)=>x.completed).length;
    return {id:e.course_id,title:(courseById.get(e.course_id) as any)?.title||"Course",status:e.status,enrolledAt:e.enrolled_at,totalLessons:ids.length,completedLessons:completed,progressPercent:ids.length?Math.round(completed/ids.length*100):0};
   });
   const attended=(attendance||[]).filter((a:any)=>a.user_id===p.id);
   const lastActivity=latest((progress||[]).filter((x:any)=>x.student_id===p.id).map((x:any)=>x.updated_at));
   return {id:p.id,name:p.full_name||"Student",email:emails.get(p.id)||"",avatarUrl:p.avatar_url||"",phone:p.phone||"",city:p.city||"",joinedAt:p.created_at,courses:courseRows,attendanceCount:attended.length,lastAttendance:latest(attended.map((a:any)=>a.joined_at)),lastActivity};
  }).sort((a:any,b:any)=>a.name.localeCompare(b.name));
  return NextResponse.json({students,courses});
 }catch(error){console.error("Teacher student directory error",error);return NextResponse.json({error:"Student records could not be loaded."},{status:500});}
}
