import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createSupabaseAdminClient} from "@/lib/supabase-admin";
export const dynamic="force-dynamic";
const clean=(v:unknown,n=1000)=>String(v||"").trim().slice(0,n);
function answerFor(question:string,courses:any[]){
 const q=question.toLowerCase();
 const courseMatches=courses.filter(c=>(c.title+" "+c.category+" "+c.level+" "+c.description).toLowerCase().split(/\s+/).some(w=>w.length>3&&q.includes(w))).slice(0,3);
 if(/price|cost|fee|how much|course.*(price|fee)/.test(q)){const matches=courseMatches.length?courseMatches:courses.slice(0,5);return {answer:matches.length?"Here are the current published course prices from our catalogue:\n"+matches.map(c=>"• "+c.title+": ₹"+(Number(c.price_paise||0)/100).toLocaleString("en-IN")).join("\n")+"\nOpen a course to review its details and continue to secure checkout.":"I couldn't find a matching published course right now. Please open Courses or ask our support team.",links:[{label:"Explore courses",href:"/#courses"}],resolved:matches.length>0};}
 if(/certificate|certification/.test(q))return {answer:"After completing the required course activities, check your Student Dashboard → My certificates. If a completed course certificate is missing, our support team can review your account.",links:[{label:"Student dashboard",href:"/student"}],resolved:true};
 if(/receipt|invoice|payment proof/.test(q))return {answer:"Your successful purchases are available in Student Dashboard → My receipts. Open a receipt to view or print it, or save it as PDF. Pending or failed payments do not create a paid receipt.",links:[{label:"My receipts",href:"/student/receipts"}],resolved:true};
 if(/coupon|promo|discount|voucher/.test(q))return {answer:"Enter your promo code on the checkout page before paying, then tap Apply. The order summary will show the discount and updated total. A code can be used only while it is active and valid for that course.",links:[{label:"Explore courses",href:"/#courses"}],resolved:true};
 if(/login|sign in|password|account|signup|register/.test(q))return {answer:"Use Log in to access your learner account. If you are new, choose Get started to create an account. Use the same email address you used when purchasing your course.",links:[{label:"Log in",href:"/login"},{label:"Create account",href:"/signup"}],resolved:true};
 if(/enroll|buy|purchase|pay|checkout|upi|card/.test(q))return {answer:"Open the course you want, select Enroll, review your student and billing details, apply any promo code, then continue to the secure payment partner. Course access is activated after payment is verified.",links:[{label:"Browse courses",href:"/#courses"}],resolved:true};
 if(/live class|meeting|jitsi|class link|join class/.test(q))return {answer:"Sign in and open Student Dashboard → Live classes. Your scheduled sessions appear there. Join near the scheduled time; if a class is missing, ask support to check your enrollment and schedule.",links:[{label:"Live classes",href:"/student/live-classes"}],resolved:true};
 if(/assignment|homework|submit|upload file/.test(q))return {answer:"Open Student Dashboard → Assignments. Select the assignment, add your response and upload an allowed file if needed, then submit. Your teacher can review it and publish feedback or a grade.",links:[{label:"Assignments",href:"/student/assignments"}],resolved:true};
 if(/teacher|instructor|course content|video/.test(q))return {answer:"Course lessons and available videos are shown inside your enrolled course. If a lesson is missing or won't play, tell support the course name and lesson title so the team can investigate.",links:[{label:"My learning",href:"/student"}],resolved:true};
 if(/refund|cancel|complaint|human|agent|person|support team|talk to/.test(q))return {answer:"I can connect you with the customer-care team. Choose “Talk to support” below and describe the issue. A team member can review your account and reply in your support conversation.",links:[],resolved:false,escalate:true};
 if(courseMatches.length)return {answer:"I found these related courses in our current catalogue:\n"+courseMatches.map(c=>"• "+c.title+" — ₹"+(Number(c.price_paise||0)/100).toLocaleString("en-IN")).join("\n")+"\nWould you like help choosing one, or should I connect you with the support team?",links:[{label:"Explore courses",href:"/#courses"}],resolved:true};
 return {answer:"I’m not fully sure about that yet, and I don't want to give you incorrect information. Try asking about courses, fees, promo codes, payments, receipts, certificates, assignments or live classes. Or choose “Talk to support” and a team member can help.",links:[],resolved:false,escalate:true};
}
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const action=clean(body.action,30);
  if(action==="answer"){
   const question=clean(body.message,1200);if(!question)return NextResponse.json({error:"Type a question first."},{status:400});
   const db=createSupabaseAdminClient();const [{data:courses},{data:faqs}]=await Promise.all([
    db.from("courses").select("id,title,description,category,level,price_paise").eq("status","published").order("created_at",{ascending:false}).limit(100),
    db.from("duku_ai_knowledge_base").select("id,category,question,answer,keywords").eq("is_published",true).order("sort_order").order("updated_at",{ascending:false}).limit(300)
   ]);
   const normalized=question.toLowerCase().replace(/[^a-z0-9\\s]/g," ").replace(/\\s+/g," ").trim();
   const stop=new Set(["the","and","for","with","from","that","this","what","when","where","which","how","can","could","would","should","does","do","did","you","your","are","is","was","were","have","has","had","please","tell","about","want","need","help","get","get","my","our"]);
   const words=[...new Set(normalized.split(" ").filter((w:string)=>w.length>2&&!stop.has(w)))];
   const scored=(faqs||[]).map((f:any)=>{const questionText=String(f.question||"").toLowerCase();const keys=(f.keywords||[]).map((k:string)=>String(k).toLowerCase());const hay=[questionText,f.category,...keys].join(" ").toLowerCase();const keywordHits=words.filter((w:string)=>keys.some((k:string)=>k===w||k.includes(w)||w.includes(k))).length;const phraseMatch=normalized.length>5&&(questionText.includes(normalized)||normalized.includes(questionText));const wordHits=words.filter((w:string)=>hay.includes(w)).length;const score=(phraseMatch?10:0)+(keywordHits*3)+wordHits;return {f,score,phraseMatch,keywordHits,wordHits};}).sort((x:any,y:any)=>y.score-x.score);
   const best=scored[0];
   if(best&&(best.phraseMatch||best.keywordHits>=1&&best.wordHits>=2||best.wordHits>=3))return NextResponse.json({answer:best.f.answer,links:[],resolved:true,source:"knowledge"});
   return NextResponse.json(answerFor(question,courses||[]));
  }
  if(action==="handoff"){
   const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please log in to connect with a support agent. Your AI chat can still answer general questions."},{status:401});
   const subject=clean(body.subject||"Customer support request",120),message=clean(body.message,4000);if(!message)return NextResponse.json({error:"Describe your issue so the team can help."},{status:400});
   const db=createSupabaseAdminClient();const {data:thread,error}=await db.from("support_conversations").insert({user_id:user.id,subject,status:"open"}).select("id").single();if(error||!thread)return NextResponse.json({error:"Could not create a support conversation. Please try again."},{status:500});
   const {error:msgError}=await db.from("support_messages").insert({conversation_id:thread.id,sender_id:user.id,body:message});if(msgError){await db.from("support_conversations").delete().eq("id",thread.id);return NextResponse.json({error:"Could not send your support request."},{status:500});}
   const {data:admins}=await db.from("profiles").select("id").in("role",["admin","super_admin"]);
   if(admins?.length)await db.from("user_notifications").insert(admins.map(a=>({user_id:a.id,title:"New customer support request",body:subject+" — "+message.slice(0,100),href:"/admin/support",kind:"support"})));
   return NextResponse.json({conversationId:thread.id,message:"Your request has been sent. The support team can now reply in this chat."});
  }
  return NextResponse.json({error:"Unknown action."},{status:400});
 }catch{return NextResponse.json({error:"DuKu AI is temporarily unavailable. Please try again."},{status:500});}
}
export async function GET(req:NextRequest){
 const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please log in to view support replies."},{status:401});
 const id=req.nextUrl.searchParams.get("conversationId");if(!id)return NextResponse.json({error:"Conversation is required."},{status:400});
 const db=createSupabaseAdminClient();const {data:thread}=await db.from("support_conversations").select("id,status,subject").eq("id",id).eq("user_id",user.id).maybeSingle();if(!thread)return NextResponse.json({error:"Conversation not found."},{status:404});
 const {data:messages,error}=await db.from("support_messages").select("id,sender_id,body,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(100);
 if(error)return NextResponse.json({error:"Could not load support replies."},{status:500});
 return NextResponse.json({thread,messages:(messages||[]).map(m=>({...m,fromCustomer:m.sender_id===user.id}))});
}
