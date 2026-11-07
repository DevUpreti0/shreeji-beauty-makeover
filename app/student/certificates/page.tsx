import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";

export const dynamic="force-dynamic";

export default async function CertificatesPage(){
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/login");
 const {data:enrollments}=await sb.from("enrollments").select("id,status,created_at,courses(id,title,description)").eq("student_id",user.id).in("status",["active","paid","completed"]);
 const rows=(enrollments||[]).filter((e:any)=>e.courses?.id);
 const ids=rows.map((e:any)=>e.courses.id);
 const {data:modules}=ids.length?await sb.from("modules").select("id,course_id").in("course_id",ids):{data:[] as any[]};
 const moduleIds=(modules||[]).map((m:any)=>m.id);
 const {data:lessons}=moduleIds.length?await sb.from("lessons").select("id,module_id").in("module_id",moduleIds):{data:[] as any[]};
 const lessonIds=(lessons||[]).map((l:any)=>l.id);
 const {data:progress}=lessonIds.length?await sb.from("lesson_progress").select("lesson_id,completed").eq("student_id",user.id).in("lesson_id",lessonIds):{data:[] as any[]};
 const completed=new Set((progress||[]).filter((p:any)=>p.completed).map((p:any)=>p.lesson_id));
 const {data:profile}=await sb.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
 const certificates=rows.map((e:any)=>{
  const mids=new Set((modules||[]).filter((m:any)=>m.course_id===e.courses.id).map((m:any)=>m.id));
  const courseLessons=(lessons||[]).filter((l:any)=>mids.has(l.module_id));
  const done=courseLessons.filter((l:any)=>completed.has(l.id)).length;
  return {id:e.id,course:e.courses.title,total:courseLessons.length,done,issued:courseLessons.length>0&&done===courseLessons.length};
 });
 return <main className="portalPage"><header className="portalHeader"><Link href="/student" className="brand">← STUDENT DASHBOARD</Link><Link href="/student/receipts" className="outline">My receipts</Link></header><section className="portalContent" style={{maxWidth:1000}}><div className="eyebrow">YOUR ACHIEVEMENTS</div><h1>My <em>certificates.</em></h1><p>Complete every lesson in an enrolled course to unlock its completion certificate.</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16,marginTop:24}}>
 {certificates.map((c:any)=><article className="portalPanel" key={c.id}><div className="eyebrow">COURSE COMPLETION</div><h2>{c.course}</h2><p>{c.done} / {c.total} lessons completed</p><div style={{height:8,background:"#ffffff20",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:(c.total?Math.round(c.done/c.total*100):0)+"%",background:"#c69b72"}}/></div>{c.issued?<Link className="primary inlineButton" style={{display:"inline-block",marginTop:16}} href={"/student/certificates/"+c.id}>View certificate ↗</Link>:<small style={{display:"block",marginTop:14,opacity:.7}}>Finish all lessons to unlock your certificate.</small>}</article>)}
 </div>{!certificates.length&&<div className="portalPanel" style={{marginTop:20}}>You do not have any active course enrollments yet. <Link href="/#courses">Explore courses ↗</Link></div>}</section></main>;
}
