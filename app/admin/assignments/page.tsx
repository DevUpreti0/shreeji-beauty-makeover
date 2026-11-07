import Link from "next/link";
import {redirect} from "next/navigation";
import {canAdminAccess} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export default async function AdminAssignmentsPage(){
 if(!await canAdminAccess("courses"))redirect("/admin");
 const db=createAdminDb();
 const [{data:assignments,error},{data:submissions},{data:courses}]=await Promise.all([
  db.from("course_assignments").select("id,course_id,title,due_at,max_points,created_at").order("created_at",{ascending:false}).limit(500),
  db.from("assignment_submissions").select("id,assignment_id,status,grade"),
  db.from("courses").select("id,title")
 ]);
 const courseMap=new Map((courses||[]).map((c:any)=>[c.id,c.title]));
 const pending=(submissions||[]).filter((s:any)=>s.status!=="graded").length;
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link><span className="meetLivePill">ASSIGNMENT OVERSIGHT</span></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">ACADEMIC OPERATIONS</div><h1>Assignment <em>oversight.</em></h1><p>Monitor assignments created by teachers and track submission and grading activity.</p>{error&&<p className="formMessage">Could not load assignment records.</p>}<div className="portalMetrics" style={{margin:"24px 0"}}><div><small>ASSIGNMENTS</small><strong>{assignments?.length||0}</strong></div><div><small>SUBMISSIONS</small><strong>{submissions?.length||0}</strong></div><div><small>AWAITING GRADING</small><strong>{pending}</strong></div><div><small>GRADED</small><strong>{(submissions||[]).length-pending}</strong></div></div><div style={{display:"grid",gap:12}}>{(assignments||[]).map((a:any)=>{const records=(submissions||[]).filter((s:any)=>s.assignment_id===a.id);const graded=records.filter((s:any)=>s.status==="graded").length;return <article className="portalPanel" key={a.id}><div className="eyebrow">{courseMap.get(a.course_id)||"Course"} · {a.max_points} POINTS</div><h2>{a.title}</h2><div style={{display:"flex",gap:18,flexWrap:"wrap"}}><small>{records.length} submission(s)</small><small>{graded} graded</small><small>Due: {a.due_at?new Date(a.due_at).toLocaleString("en-IN"):"No due date"}</small></div><div style={{height:7,background:"#ffffff20",borderRadius:20,overflow:"hidden",marginTop:14}}><div style={{height:"100%",width:(records.length?Math.round(graded/records.length*100):0)+"%",background:"#b98a61"}}/></div></article>;})}{!assignments?.length&&!error&&<div className="portalPanel">No assignments have been created yet.</div>}</div></section></main>;
}
