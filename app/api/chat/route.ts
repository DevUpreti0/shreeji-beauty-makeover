import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createSupabaseAdminClient} from "@/lib/supabase-admin";
export const dynamic="force-dynamic";
async function context(){const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return null;const db=createSupabaseAdminClient();const {data:profile}=await db.from("profiles").select("id,full_name,role,avatar_url").eq("id",user.id).maybeSingle();if(!profile)return null;return {user,profile,db};}
export async function GET(req:NextRequest){
 const ctx=await context();if(!ctx)return NextResponse.json({error:"Sign in required."},{status:401});
 const {user,db}=ctx;const conversationId=req.nextUrl.searchParams.get("conversationId");
 const {data:memberships,error:memberError}=await db.from("chat_participants").select("conversation_id,last_read_at").eq("user_id",user.id);
 if(memberError)return NextResponse.json({error:"Could not load chats."},{status:500});
 const ids=(memberships||[]).map(x=>x.conversation_id);
 if(conversationId){
  if(!ids.includes(conversationId))return NextResponse.json({error:"Conversation not found."},{status:404});
  const {data:messages,error}=await db.from("chat_messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id",conversationId).order("created_at",{ascending:true}).limit(300);
  if(error)return NextResponse.json({error:"Could not load messages."},{status:500});
  await db.from("chat_participants").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",user.id);
  return NextResponse.json({messages:messages||[]});
 }
 const [{data:conversations},{data:contacts}] = await Promise.all([
  ids.length?db.from("chat_conversations").select("id,created_at,updated_at,last_message").in("id",ids).order("updated_at",{ascending:false}):Promise.resolve({data:[] as any[]}),
  db.from("profiles").select("id,full_name,role,avatar_url").neq("id",user.id).order("full_name",{ascending:true}).limit(250)
 ]);
 const {data:participants}=ids.length?await db.from("chat_participants").select("conversation_id,user_id,last_read_at").in("conversation_id",ids):{data:[] as any[]};
 const profileIds=[...new Set((participants||[]).map(x=>x.user_id).concat((contacts||[]).map(x=>x.id)))];
 const {data:profiles}=profileIds.length?await db.from("profiles").select("id,full_name,role,avatar_url").in("id",profileIds):{data:[] as any[]};
 const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
 const chats=(conversations||[]).map(c=>{const other=(participants||[]).filter(p=>p.conversation_id===c.id&&p.user_id!==user.id).map(p=>profileMap.get(p.user_id)).filter(Boolean);const own=(memberships||[]).find(m=>m.conversation_id===c.id);return {...c,other:other[0]||null,unread:!!(c.last_message&&(!own?.last_read_at||new Date(c.updated_at)>new Date(own.last_read_at)))};});
 return NextResponse.json({chats,contacts:contacts||[]});
}
export async function POST(req:NextRequest){
 const ctx=await context();if(!ctx)return NextResponse.json({error:"Sign in required."},{status:401});
 const {user,db}=ctx;let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const action=String(body.action||"");
 if(action==="start"){
  const targetId=String(body.targetId||"");if(!targetId||targetId===user.id)return NextResponse.json({error:"Choose another user."},{status:400});
  const {data:target}=await db.from("profiles").select("id,role").eq("id",targetId).maybeSingle();if(!target)return NextResponse.json({error:"User not found."},{status:404});
  const {data:mine}=await db.from("chat_participants").select("conversation_id").eq("user_id",user.id);
  const mineIds=(mine||[]).map(x=>x.conversation_id);
  if(mineIds.length){const {data:shared}=await db.from("chat_participants").select("conversation_id").eq("user_id",targetId).in("conversation_id",mineIds);if(shared?.length)return NextResponse.json({conversationId:shared[0].conversation_id});}
  const {data:conversation,error}=await db.from("chat_conversations").insert({created_by:user.id}).select("id").single();if(error||!conversation)return NextResponse.json({error:"Could not start conversation."},{status:500});
  const {error:participantError}=await db.from("chat_participants").insert([{conversation_id:conversation.id,user_id:user.id},{conversation_id:conversation.id,user_id:targetId}]);
  if(participantError){await db.from("chat_conversations").delete().eq("id",conversation.id);return NextResponse.json({error:"Could not add chat participants."},{status:500});}
  return NextResponse.json({conversationId:conversation.id});
 }
 if(action==="send"){
  const conversationId=String(body.conversationId||"");const message=String(body.message||"").trim();
  if(!conversationId||!message||message.length>5000)return NextResponse.json({error:"Enter a message up to 5,000 characters."},{status:400});
  const {data:membership}=await db.from("chat_participants").select("conversation_id").eq("conversation_id",conversationId).eq("user_id",user.id).maybeSingle();
  if(!membership)return NextResponse.json({error:"You do not have access to this conversation."},{status:403});
  const {data:saved,error}=await db.from("chat_messages").insert({conversation_id:conversationId,sender_id:user.id,body:message}).select("id,conversation_id,sender_id,body,created_at").single();
  if(error||!saved)return NextResponse.json({error:"Message could not be sent."},{status:500});
  await db.from("chat_conversations").update({updated_at:saved.created_at,last_message:message.slice(0,180)}).eq("id",conversationId);
  return NextResponse.json({message:saved});
 }
 return NextResponse.json({error:"Unknown action."},{status:400});
}
