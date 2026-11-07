import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {canAdminAccess} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import SupportRealtimeRefresh from "./realtime-refresh";
export const dynamic="force-dynamic";
async function reply(formData:FormData){
 "use server";if(!await canAdminAccess("support",true))redirect("/admin");
 const conversationId=String(formData.get("conversation_id")||"");const body=String(formData.get("body")||"").trim();
 if(!conversationId||!body||body.length>5000)return;
 const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect("/login");
 const db=createAdminDb();const {data:conversation}=await db.from("support_conversations").select("id,user_id,subject").eq("id",conversationId).maybeSingle();if(!conversation)return;
 const {error}=await db.from("support_messages").insert({conversation_id:conversationId,sender_id:user.id,body});
 if(error)throw new Error("Could not send reply.");await db.from("support_conversations").update({updated_at:new Date().toISOString(),status:"pending"}).eq("id",conversationId);await db.from("user_notifications").insert({user_id:conversation.user_id,title:"New reply from Shreeji Support",body:body.slice(0,140),href:"/support?conversationId="+conversationId,kind:"support"});revalidatePath("/admin/support");
}
async function setStatus(formData:FormData){
 "use server";if(!await canAdminAccess("support",true))redirect("/admin");
 const id=String(formData.get("conversation_id")||"");const status=String(formData.get("status")||"");
 if(!id||!["open","pending","closed"].includes(status))return;
 const {error}=await createAdminDb().from("support_conversations").update({status,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)throw new Error("Could not update ticket.");revalidatePath("/admin/support");
}
export default async function SupportInbox(){
 if(!await canAdminAccess("support"))redirect("/admin");
 const canEdit=await canAdminAccess("support",true);
 const db=createAdminDb();
 const [{data:threads,error},{data:allProfiles},{data:allEnrollments},{data:allPayments}] = await Promise.all([
  db.from("support_conversations").select("id,user_id,subject,status,created_at,updated_at").order("updated_at",{ascending:false}).limit(100),
  db.from("profiles").select("id,full_name,role,avatar_url,created_at"),
  db.from("enrollments").select("student_id,status,course:courses(title,category)"),
  db.from("payments").select("student_id,amount_paise,currency,status,created_at,provider")
 ]);
 const ids=[...new Set((threads||[]).map(x=>x.user_id))];
 const profiles=(allProfiles||[]).filter(p=>ids.includes(p.id));
 const profileMap=new Map(profiles.map(p=>[p.id,p]));
 const userDetails=await Promise.all(ids.map(async id=>{try{const {data,error}=await db.auth.admin.getUserById(id);if(error||!data.user)return [id,null] as const;return [id,{email:data.user.email||"",phone:data.user.phone||"",lastSignIn:data.user.last_sign_in_at||"",createdAt:data.user.created_at||"",metadata:data.user.user_metadata||{}}] as const;}catch{return [id,null] as const;}}));
 const authMap=new Map(userDetails);
 const {data:messages}=threads?.length?await db.from("support_messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id",threads.map(x=>x.id)).order("created_at",{ascending:true}):{data:[] as any[]};
 const open=(threads||[]).filter(t=>t.status==="open").length,pending=(threads||[]).filter(t=>t.status==="pending").length,closed=(threads||[]).filter(t=>t.status==="closed").length;
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link><Link href="/admin/users" className="outline">Customer directory ↗</Link></header><section className="portalContent"><SupportRealtimeRefresh/><div className="eyebrow">CUSTOMER CARE / SERVICE DESK</div><h1>Support <em>management.</em></h1><p>One place to review customer profiles, course access, payment history, messages and ticket status.</p>
 <div className="portalMetrics">{[["OPEN",open],["WAITING / PENDING",pending],["CLOSED",closed],["TOTAL TICKETS",(threads||[]).length]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>
 {error&&<p className="formMessage">Could not load support conversations. Check the support tables and server credentials.</p>}
 <div style={{display:"grid",gap:18,marginTop:22}}>{(threads||[]).map(t=>{
  const p=profileMap.get(t.user_id),auth=authMap.get(t.user_id),enrollments=(allEnrollments||[]).filter(x=>x.student_id===t.user_id),payments=(allPayments||[]).filter(x=>x.student_id===t.user_id),threadMessages=(messages||[]).filter(m=>m.conversation_id===t.id);
  const phone=auth?.phone||auth?.metadata?.phone||auth?.metadata?.mobile||"Not provided";
  return <article className="portalPanel" key={t.id}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}><div><div className="eyebrow">CUSTOMER TICKET · {t.id.slice(0,8).toUpperCase()}</div><h2 style={{margin:"4px 0"}}>{t.subject}</h2><small>Opened {new Date(t.created_at).toLocaleString("en-IN")} · Last activity {new Date(t.updated_at).toLocaleString("en-IN")}</small></div>{canEdit?<form action={setStatus} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><input type="hidden" name="conversation_id" value={t.id}/><select name="status" defaultValue={t.status}><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select><button className="outline">Save status</button></form>:<small>View-only access</small>}</div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:15}}>
    <div style={{padding:13,borderRadius:10,background:"#f8f4f0"}}><small>CUSTOMER</small><p style={{margin:"5px 0",fontWeight:700}}>{p?.full_name||auth?.metadata?.full_name||auth?.metadata?.name||"Customer"}</p><small>{p?.role||"student"} · Account since {p?.created_at?new Date(p.created_at).toLocaleDateString("en-IN"):auth?.createdAt?new Date(auth.createdAt).toLocaleDateString("en-IN"):"—"}</small></div>
    <div style={{padding:13,borderRadius:10,background:"#f8f4f0"}}><small>CONTACT DETAILS</small><p style={{margin:"5px 0",overflowWrap:"anywhere"}}>{auth?.email||"Email unavailable"}</p><small>Phone: {phone}</small></div>
    <div style={{padding:13,borderRadius:10,background:"#f8f4f0"}}><small>LEARNING ACTIVITY</small><p style={{margin:"5px 0",fontWeight:700}}>{enrollments.length} course enrollment(s)</p><small>{enrollments.slice(0,3).map(e=>e.course?.[0]?.title||"Course").join(", ")||"No enrollments recorded"}</small></div>
    <div style={{padding:13,borderRadius:10,background:"#f8f4f0"}}><small>PAYMENT HISTORY</small><p style={{margin:"5px 0",fontWeight:700}}>{payments.length} payment record(s)</p><small>{payments.slice(0,3).map(x=>x.currency+" "+(Number(x.amount_paise)/100).toFixed(2)+" · "+x.status).join(" | ")||"No payment records"}</small></div>
   </div>
   {auth?.lastSignIn&&<small style={{display:"block",marginTop:9,opacity:.7}}>Last sign in: {new Date(auth.lastSignIn).toLocaleString("en-IN")}</small>}
   <div style={{margin:"16px 0 12px",display:"grid",gap:9}}>{threadMessages.map(m=><div key={m.id} style={{padding:12,borderRadius:10,background:m.sender_id===t.user_id?"#f5f0eb":"#eef4f5",maxWidth:"100%"}}><small style={{fontWeight:700}}>{m.sender_id===t.user_id?"CUSTOMER":"SUPPORT TEAM"} · {new Date(m.created_at).toLocaleString("en-IN")}</small><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"5px 0 0"}}>{m.body}</p></div>)}{!threadMessages.length&&<small>No messages in this ticket yet.</small>}</div>
   {canEdit?<form action={reply} style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="hidden" name="conversation_id" value={t.id}/><input name="body" required maxLength={5000} placeholder="Reply to this customer…" style={{flex:"1 1 250px"}}/><button className="primary">Send reply</button></form>:<p style={{fontSize:13,opacity:.7}}>You can view this conversation but do not have permission to reply or change its status.</p>}
   <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:12,fontSize:12}}><Link href={"/admin/users"}>Open customer directory →</Link><span style={{opacity:.65}}>Customer ID: {t.user_id}</span></div>
  </article>;
 })}
 {!threads?.length&&!error&&<div className="portalPanel">No support conversations yet. New customer messages will appear here.</div>}</div>
 <p style={{fontSize:12,opacity:.65,marginTop:20}}>Private account and payment details are shown only inside this admin-protected page. Phone number appears only when the customer has supplied one in their account profile.</p>
 </section></main>;
}
