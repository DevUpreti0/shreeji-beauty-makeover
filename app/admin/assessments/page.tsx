import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {canAdminAccess} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
async function createQuiz(formData:FormData){
 "use server";if(!await canAdminAccess("assessments"))redirect("/admin");
 const courseId=String(formData.get("course_id")||"");const title=String(formData.get("title")||"").trim();const description=String(formData.get("description")||"").trim();const raw=String(formData.get("questions")||"");const passing=Number(formData.get("passing_score")||70);
 if(!courseId||!title||title.length>180||!Number.isInteger(passing)||passing<0||passing>100)return;
 let questions:any;try{questions=JSON.parse(raw);if(!Array.isArray(questions)||questions.length<1||questions.length>50)throw new Error();for(const q of questions){if(typeof q.question!=="string"||!q.question.trim()||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length||q.options.some((x:any)=>typeof x!=="string"))throw new Error();}}catch{return;}
 const db=createAdminDb();const {data:{user}}=await (await import("@/lib/supabase-server")).createSupabaseServerClient().then(x=>x.auth.getUser());if(!user)redirect("/login");
 const {error}=await db.from("course_quizzes").insert({course_id:courseId,title,description,questions,passing_score:passing,created_by:user.id});
 if(error)throw new Error("Quiz could not be saved. Check the assessment migration and course.");revalidatePath("/admin/assessments");
}
async function publishQuiz(formData:FormData){
 "use server";if(!await canAdminAccess("assessments"))redirect("/admin");
 const id=String(formData.get("quiz_id")||"");const published=String(formData.get("published")||"")==="true";if(!id)return;
 const {error}=await createAdminDb().from("course_quizzes").update({is_published:published,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw new Error("Could not update quiz publication.");revalidatePath("/admin/assessments");
}
export default async function AssessmentsPage(){
 if(!await canAdminAccess("assessments"))redirect("/admin");const db=createAdminDb();
 const [{data:courses},{data:quizzes,error}]=await Promise.all([db.from("courses").select("id,title").order("created_at",{ascending:false}),db.from("course_quizzes").select("id,course_id,title,description,questions,passing_score,is_published,created_at").order("created_at",{ascending:false})]);
 const courseMap=new Map((courses||[]).map(c=>[c.id,c.title]));
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">LEARNING ASSESSMENT CENTER</div><h1>Quizzes & <em>assessments.</em></h1><p>Create multiple-choice assessments for courses and control when they are published.</p>
 <form action={createQuiz} className="portalPanel" style={{display:"grid",gap:12,marginTop:20}}><h2>Create course quiz</h2><label>Course</label><select name="course_id" required defaultValue=""><option value="" disabled>Select course</option>{(courses||[]).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><label>Quiz title</label><input name="title" required maxLength={180} placeholder="e.g. Skin preparation knowledge check"/><label>Description</label><textarea name="description" rows={2} placeholder="What this quiz covers…"/><label>Passing score (%)</label><input name="passing_score" type="number" min="0" max="100" defaultValue="70"/><label>Questions (JSON)</label><textarea name="questions" required rows={12} defaultValue={JSON.stringify([{question:"Which product is applied first during basic skin preparation?",options:["Moisturizer","Cleanser","Foundation","Setting spray"],correctIndex:1}],null,2)} style={{fontFamily:"monospace",fontSize:12}}/><small>Each question needs a question, 2–6 options, and correctIndex (starting from 0). Maximum 50 questions. Keep answer keys private; only administrators can edit this builder.</small><button className="primary">Save quiz</button></form>
 <div style={{display:"grid",gap:14,marginTop:24}}><h2>Existing quizzes · {(quizzes||[]).length}</h2>{error&&<p className="formMessage">Could not load assessments. Confirm the database migration is applied.</p>}{(quizzes||[]).map(q=><article className="portalPanel" key={q.id}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2>{q.title}</h2><p>{courseMap.get(q.course_id)||"Course"} · {Array.isArray(q.questions)?q.questions.length:0} questions · Pass mark {q.passing_score}%</p><small>{q.description}</small></div><form action={publishQuiz}><input type="hidden" name="quiz_id" value={q.id}/><input type="hidden" name="published" value={String(!q.is_published)}/><button className={q.is_published?"outline":"primary"}>{q.is_published?"Unpublish":"Publish quiz"}</button></form></div><small>{q.is_published?"Published":"Draft"} · Created {new Date(q.created_at).toLocaleDateString("en-IN")}</small></article>)}{!quizzes?.length&&!error&&<div className="portalPanel">No quizzes created yet.</div>}</div>
 <p style={{fontSize:12,opacity:.65,marginTop:20}}>This is the first assessment-builder release. Student quiz-taking, automatic scoring, attempt history and certificates are not yet enabled.</p>
 </section></main>;
}
