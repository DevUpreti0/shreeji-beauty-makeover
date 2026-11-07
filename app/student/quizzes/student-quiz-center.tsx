"use client";
import {useState} from "react";

type Quiz={id:string;title:string;description:string|null;courseTitle:string;passingScore:number;questions:{question:string;options:string[]}[]};
export default function StudentQuizCenter({quizzes,initialAttempts}:{quizzes:Quiz[];initialAttempts:any[]}){
 const [active,setActive]=useState<Quiz|null>(null);
 const [answers,setAnswers]=useState<number[]>([]);
 const [attempts,setAttempts]=useState(initialAttempts);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [result,setResult]=useState<any>(null);
 async function submit(){
  if(!active||answers.length!==active.questions.length||answers.some(x=>x<0)){setMessage("Please answer every question first.");return;}
  setBusy(true);setMessage("");setResult(null);
  try{
   const response=await fetch("/api/student/quizzes/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quizId:active.id,answers})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Your quiz could not be submitted.");
   setResult(data);setAttempts(old=>[{id:data.attemptId,quiz_id:active.id,score:data.score,passed:data.passed,submitted_at:new Date().toISOString()},...old]);setMessage(data.passed?"Congratulations! You passed this quiz.":"Attempt saved. Review the lessons and try again.");
  }catch(e){setMessage(e instanceof Error?e.message:"Something went wrong.");}
  finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:16,marginTop:20}}>
  {active&&<section className="portalPanel"><button className="outline" onClick={()=>{setActive(null);setAnswers([]);setResult(null);setMessage("");}}>← All quizzes</button><div className="eyebrow" style={{marginTop:18}}>{active.courseTitle} · PASS {active.passingScore}%</div><h2>{active.title}</h2><p>{active.description}</p>{active.questions.map((q,i)=><div key={i} style={{padding:"16px 0",borderTop:"1px solid #ffffff20"}}><b>{i+1}. {q.question}</b><div style={{display:"grid",gap:8,marginTop:12}}>{q.options.map((o,j)=><label key={j} style={{display:"flex",gap:10,alignItems:"center",padding:10,border:"1px solid #ffffff25",borderRadius:10,cursor:"pointer"}}><input type="radio" name={"question-"+i} checked={answers[i]===j} disabled={!!result} onChange={()=>setAnswers(old=>{const next=[...old];next[i]=j;return next;})}/>{o}</label>)}</div></div>)}{!result&&<button className="primary" disabled={busy} onClick={submit}>{busy?"Submitting…":"Submit quiz"}</button>}{message&&<p role="status">{message}</p>}{result&&<div className="portalPanel"><h3>Your score: {result.score}%</h3><p>{result.correct} correct out of {result.total} · {result.passed?"Passed":"Not passed yet"}</p><button className="outline" onClick={()=>{setActive(null);setAnswers([]);setResult(null);setMessage("");}}>Back to quizzes</button></div>}</section>}
  {!active&&<>{quizzes.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>{quizzes.map(q=><article className="portalPanel" key={q.id}><div className="eyebrow">{q.courseTitle}</div><h2>{q.title}</h2><p>{q.description||"Test your knowledge from this course."}</p><small>{q.questions.length} questions · Pass mark {q.passingScore}%</small><div style={{marginTop:14}}><button className="primary" onClick={()=>{setActive(q);setAnswers(Array(q.questions.length).fill(-1));setMessage("");}}>Start quiz ↗</button></div></article>)}</div>:<div className="portalPanel">No published quizzes are available for your active courses yet.</div>}
  <section className="portalPanel"><h2>My quiz history</h2>{attempts.length?<div style={{display:"grid",gap:10}}>{attempts.map((a:any)=><div key={a.id} style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",borderTop:"1px solid #ffffff20",paddingTop:10}}><span>{quizzes.find(q=>q.id===a.quiz_id)?.title||"Course quiz"} · {new Date(a.submitted_at).toLocaleString("en-IN")}</span><b>{a.score}% · {a.passed?"Passed":"Retry"}</b></div>)}</div>:<p>Your submitted quiz attempts will appear here.</p>}</section></>}
 </div>;
}
