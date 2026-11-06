import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdminSessionValid} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import SupportRealtimeRefresh from "./realtime-refresh";
export const dynamic="force-dynamic";
async function reply(formData:FormData){
 "use server";if(!await isAdminSessionValid())redirect("/login");
 const conversationId=String(formData.get("conversation_id")||"");const body=String(formData.get("body")||"").trim();
 if(!conversationId||!body||body.length>5000)return;
 const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect("/login");
 const db=createAdminDb();const {data:conversation}=await db.from("support_conversations").select("id").eq("id",conversationId).maybeSingle();if(!conversation)return;
 const {error}=await db.from("support_messages").insert({conversation_id:conversationId,sender_id:user.id,body});
 if(error)throw new Error("Could not send reply.");await db.from("support_conversations").update({updated_at:new Date().toISOString(),status:"pending"}).eq("id",conversationId);revalidatePath("/admin/support");
}
async function setStatus(formData:FormData){
 "use server";if(!await isAdminSessionValid())redirect("/login");
 const id=String(formData.get("conversation_id")||"");const status=String(formData.get("status")||"");
 if(!id||!["open","pending","closed"].includes(status))return;
 const {error}=await createAdminDb().from("support_conversations").update({status,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)throw new Error("Could not update ticket.");revalidatePath("/admin/support");
}
export default async function SupportInbox(){
 if(!await isAdminSessionValid())redirect("/login");
 const db=createAdminDb();const {data:threads,error}=await db.from("support_conversations").select("id,user_id,subject,status,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);
 const ids=[...new Set((threads||[]).map(x=>x.user_id))];const {data:profiles}=ids.length?await db.from("profiles").select("id,full_name,role").in("id",ids):{data:[] as any[]};
 const names=new Map((profiles||[]).map(x=>[x.id,x.full_name||"Learner"]));
 const {data:messages}=threads?.length?await db.from("support_messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id",threads.map(x=>x.id)).order("created_at",{ascending:true}):{data:[] as any[]};
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><SupportRealtimeRefresh/><div className="eyebrow">CUSTOMER CARE</div><h1>Live support <em>inbox.</em></h1><p>Read learner conversations, reply from the admin account and update ticket status.</p>{error&&<p className="formMessage">Could not load support conversations. Confirm the support-chat migration is applied and service credentials are set.</p>}<div style={{display:"grid",gap:16}}>{(threads||[]).map(t=><article className="portalPanel" key={t.id}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:"0 0 5px"}}>{t.subject}</h2><small>{names.get(t.user_id)||"Learner"} · {new Date(t.created_at).toLocaleString("en-IN")} · {t.status}</small></div><form action={setStatus} style={{display:"flex",gap:8,alignItems:"center"}}><input type="hidden" name="conversation_id" value={t.id}/><select name="status" defaultValue={t.status}><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select><button className="outline">Update</button></form></div><div style={{margin:"14px 0",display:"grid",gap:8}}>{(messages||[]).filter(m=>m.conversation_id===t.id).map(m=><div key={m.id} style={{padding:12,borderRadius:10,background:m.sender_id===t.user_id?"#f5f0eb":"#eef4f5"}}><small>{m.sender_id===t.user_id?"Learner":"Admin"} · {new Date(m.created_at).toLocaleString("en-IN")}</small><p style={{whiteSpace:"pre-wrap",margin:"5px 0 0"}}>{m.body}</p></div>)}</div><form action={reply} style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="hidden" name="conversation_id" value={t.id}/><input name="body" required maxLength={5000} placeholder="Write a support reply…" style={{flex:"1 1 240px"}}/><button className="primary">Send reply</button></form></article>)}{!threads?.length&&!error&&<div className="portalPanel">No support conversations yet. New learner messages will appear here.</div>}</div></section></main>;
}
