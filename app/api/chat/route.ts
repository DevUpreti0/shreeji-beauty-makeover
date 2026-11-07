import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createSupabaseAdminClient} from "@/lib/supabase-admin";
export const dynamic="force-dynamic";
async function context(){const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return null;const db=createSupabaseAdminClient();const {data:profile}=await db.from("profiles").select("id,full_name,role,avatar_url").eq("id",user.id).maybeSingle();if(!profile)return null;return {user,profile,db};}
export async function GET(req:NextRequest){
 const ctx=await context();if(!ctx)return NextResponse.json({error:"Sign in required."},{status:401});
 const {user,db}=ctx;const conversationId=req.nextUrl.searchParams.get("conversationId");const search=(req.nextUrl.searchParams.get("search")||"").trim().slice(0,100);
 const {data:memberships,error:memberError}=await db.from("chat_participants").select("conversation_id,last_read_at").eq("user_id",user.id);
 if(memberError)return NextResponse.json({error:"Could not load chats."},{status:500});
 const ids=(memberships||[]).map(x=>x.conversation_id);
 if(conversationId){
  if(!ids.includes(conversationId))return NextResponse.json({error:"Conversation not found."},{status:404});
  let query=db.from("chat_messages").select("id,conversation_id,sender_id,body,created_at,edited_at,deleted_at").eq("conversation_id",conversationId).order("created_at",{ascending:true}).limit(300);
  if(search)query=query.ilike("body","%"+search.replace(/[%_]/g,"\\$&")+"%");
  const [{data:messages,error},{data:participants}]=await Promise.all([query,db.from("chat_participants").select("user_id,last_read_at").eq("conversation_id",conversationId)]);
  if(error)return NextResponse.json({error:"Could not load messages."},{status:500});
  await db.from("chat_participants").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",user.id);
  const {data:people}=await db.from("profiles").select("id,full_name,role").in("id",(participants||[]).map(p=>p.user_id));
  const readBy=(participants||[]).filter(p=>p.user_id!==user.id&&p.last_read_at).map(p=>({user_id:p.user_id,last_read_at:p.last_read_at,name:people?.find(x=>x.id===p.user_id)?.full_name||"Participant"}));
  return NextResponse.json({messages:messages||[],readBy,participants:people||[]});
 }
 const [{data:conversations},{data:contacts}] = await Promise.all([
  ids.length?db.from("chat_conversations").select("id,created_at,updated_at,last_message,title,is_group").in("id",ids).order("updated_at",{ascending:false}):Promise.resolve({data:[] as any[]}),
  db.from("profiles").select("id,full_name,role,avatar_url").neq("id",user.id).order("full_name",{ascending:true}).limit(250)
 ]);
 const {data:participants}=ids.length?await db.from("chat_participants").select("conversation_id,user_id,last_read_at").in("conversation_id",ids):{data:[] as any[]};
 const profileIds=[...new Set((participants||[]).map(x=>x.user_id))];
 const {data:profiles}=profileIds.length?await db.from("profiles").select("id,full_name,role,avatar_url").in("id",profileIds):{data:[] as any[]};
 const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
 const chats=(conversations||[]).map(c=>{const members=(participants||[]).filter(p=>p.conversation_id===c.id&&p.user_id!==user.id).map(p=>profileMap.get(p.user_id)).filter(Boolean);const own=(memberships||[]).find(m=>m.conversation_id===c.id);return {...c,other:members[0]||null,members,unread:!!(c.last_message&&(!own?.last_read_at||new Date(c.updated_at)>new Date(own.last_read_at)))};});
 return NextResponse.json({chats,contacts:contacts||[]});
}
export async function POST(req:NextRequest){
 const ctx=await context();if(!ctx)return NextResponse.json({error:"Sign in required."},{status:401});
 const {user,db}=ctx;let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const action=String(body.action||"");
 if(action==="start"||action==="start-group"){
  const isGroup=action==="start-group";const targets=isGroup?Array.from(new Set((Array.isArray(body.targetIds)?body.targetIds:[]).map((x:any)=>String(x)).filter((x:string)=>x&&x!==user.id))):[String(body.targetId||"")];
  if((isGroup&&(targets.length<2||targets.length>25))||(!isGroup&&(!targets[0]||targets[0]===user.id)))return NextResponse.json({error:isGroup?"Choose between 2 and 25 other people.":"Choose another user."},{status:400});
  const {data:valid}=await db.from("profiles").select("id").in("id",targets);
  if((valid||[]).length!==targets.length)return NextResponse.json({error:"One or more selected users were not found."},{status:404});
  if(!isGroup){const {data:mine}=await db.from("chat_participants").select("conversation_id").eq("user_id",user.id);const mineIds=(mine||[]).map(x=>x.conversation_id);if(mineIds.length){const {data:shared}=await db.from("chat_participants").select("conversation_id").eq("user_id",targets[0]).in("conversation_id",mineIds);if(shared?.length){const {data:existing}=await db.from("chat_conversations").select("id").eq("id",shared[0].conversation_id).eq("is_group",false).maybeSingle();if(existing)return NextResponse.json({conversationId:existing.id});}}}
  const title=isGroup?String(body.title||"").trim().slice(0,80):null;
  const {data:conversation,error}=await db.from("chat_conversations").insert({created_by:user.id,is_group:isGroup,title}).select("id").single();
  if(error||!conversation)return NextResponse.json({error:"Could not start conversation."},{status:500});
  const {error:participantError}=await db.from("chat_participants").insert([user.id,...targets].map(user_id=>({conversation_id:conversation.id,user_id})));
  if(participantError){await db.from("chat_conversations").delete().eq("id",conversation.id);return NextResponse.json({error:"Could not add chat participants."},{status:500});}
  return NextResponse.json({conversationId:conversation.id});
 }
 if(action==="send"){
  const conversationId=String(body.conversationId||"");const message=String(body.message||"").trim();
  if(!conversationId||!message||message.length>5000)return NextResponse.json({error:"Enter a message up to 5,000 characters."},{status:400});
  const {data:membership}=await db.from("chat_participants").select("conversation_id").eq("conversation_id",conversationId).eq("user_id",user.id).maybeSingle();
  if(!membership)return NextResponse.json({error:"You do not have access to this conversation."},{status:403});
  const {data:saved,error}=await db.from("chat_messages").insert({conversation_id:conversationId,sender_id:user.id,body:message}).select("id,conversation_id,sender_id,body,created_at,edited_at,deleted_at").single();
  if(error||!saved)return NextResponse.json({error:"Message could not be sent."},{status:500});
  await db.from("chat_conversations").update({updated_at:saved.created_at,last_message:message.slice(0,180)}).eq("id",conversationId);
  return NextResponse.json({message:saved});
 }
 if(action==="edit"||action==="delete"){
  const messageId=String(body.messageId||"");const message=String(body.message||"").trim();
  if(!messageId||(action==="edit"&&(!message||message.length>5000)))return NextResponse.json({error:"Invalid message."},{status:400});
  const {data:existing}=await db.from("chat_messages").select("id,conversation_id,sender_id,created_at").eq("id",messageId).maybeSingle();
  if(!existing||existing.sender_id!==user.id)return NextResponse.json({error:"Only your own messages can be changed."},{status:403});
  if(Date.now()-new Date(existing.created_at).getTime()>15*60*1000)return NextResponse.json({error:"Messages can only be changed within 15 minutes."},{status:400});
  const patch=action==="delete"?{body:"This message was deleted.",deleted_at:new Date().toISOString()}:{body:message,edited_at:new Date().toISOString()};
  const {data:saved,error}=await db.from("chat_messages").update(patch).eq("id",messageId).select("id,conversation_id,sender_id,body,created_at,edited_at,deleted_at").single();
  if(error||!saved)return NextResponse.json({error:"Could not update message."},{status:500});
  return NextResponse.json({message:saved});
 }
 return NextResponse.json({error:"Unknown action."},{status:400});
}
