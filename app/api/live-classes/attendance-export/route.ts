import {NextResponse} from "next/server";
import {canAdminAccess} from "@/lib/admin-session";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
const cell=(v:any)=>'"'+String(v??"").replace(/"/g,'""').replace(/[\r\n]+/g," ")+'"';
export async function GET(){
 const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {data:profile}=await auth.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="admin"&&profile?.role!=="teacher")return NextResponse.json({error:"Not authorized."},{status:403});
 if(profile.role==="admin"&&!await canAdminAccess("live-classes"))return NextResponse.json({error:"Live class view access required."},{status:403});
 const db=createAdminDb();let query=db.from("live_classes").select("id,title,starts_at,teacher_id,course_id").order("starts_at",{ascending:false}).limit(200);
 if(profile.role==="teacher")query=query.eq("teacher_id",user.id);
 const {data:classes,error}=await query;if(error)return NextResponse.json({error:"Could not load classes."},{status:500});
 const classIds=(classes||[]).map(c=>c.id);const {data:attendance}=classIds.length?await db.from("live_class_attendance").select("live_class_id,user_id,joined_at,left_at,last_seen_at").in("live_class_id",classIds).order("joined_at",{ascending:false}):{data:[] as any[]};
 const userIds=[...new Set((attendance||[]).map(a=>a.user_id))];const courseIds=[...new Set((classes||[]).map(c=>c.course_id))];
 const [{data:people},{data:courses}]=await Promise.all([userIds.length?db.from("profiles").select("id,full_name,role").in("id",userIds):Promise.resolve({data:[] as any[]}),courseIds.length?db.from("courses").select("id,title").in("id",courseIds):Promise.resolve({data:[] as any[]})]);
 const names=new Map((people||[]).map(p=>[p.id,p.full_name||"Learner"])),roles=new Map((people||[]).map(p=>[p.id,p.role||"student"])),courseNames=new Map((courses||[]).map(c=>[c.id,c.title]));
 const byId=new Map((classes||[]).map(c=>[c.id,c]));
 const rows=[["Class","Course","Student","Role","Joined (UTC)","Left (UTC)","Attendance status","Time in class (approx. minutes)","Last signal (UTC)"]];
 for(const a of attendance||[]){const c=byId.get(a.live_class_id);rows.push([c?.title||"Class",courseNames.get(c?.course_id)||"Course",names.get(a.user_id)||"Learner",roles.get(a.user_id)||"student",a.joined_at,a.left_at||"",a.left_at?"Left":a.last_seen_at&&Date.now()-new Date(a.last_seen_at).getTime()<90000?"Online now":"Session open / signal unavailable",a.left_at||a.last_seen_at?Math.max(0,Math.round((new Date(a.left_at||a.last_seen_at).getTime()-new Date(a.joined_at).getTime())/60000)):"",a.last_seen_at||""]);}
 const csv="\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
 return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="duku-meet-attendance.csv"',"Cache-Control":"no-store"}});
}