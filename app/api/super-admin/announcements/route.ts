import {NextRequest,NextResponse} from "next/server";
import {currentAdminIdentity} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const identity=await currentAdminIdentity();if(!identity?.isSuperAdmin||identity.profile.role!=="admin")return NextResponse.json({error:"Super admin access required."},{status:403});
  const body=await req.json();const title=String(body.title||"").trim();const message=String(body.message||"").trim();const target=String(body.target||"all");const href=String(body.href||"").trim();
  if(!title||title.length>160||!message||message.length>1500||!["all","student","teacher","admin"].includes(target))return NextResponse.json({error:"Check the announcement details."},{status:400});
  if(href&&(!href.startsWith("/")||href.startsWith("//")))return NextResponse.json({error:"Announcement links must be internal website paths."},{status:400});
  const db=createAdminDb();let query=db.from("profiles").select("id");if(target!=="all")query=query.eq("role",target);
  const {data:users,error}=await query.limit(10000);if(error)throw error;
  const rows=(users||[]).filter((u:any)=>u.id!==identity.user.id).map((u:any)=>({user_id:u.id,title,body:message,href:href||null,kind:"announcement"}));
  for(let i=0;i<rows.length;i+=500){const {error:insertError}=await db.from("user_notifications").insert(rows.slice(i,i+500));if(insertError)throw insertError;}
  await db.from("admin_access_audit").insert({actor_id:identity.user.id,target_admin_id:identity.user.id,action:"broadcast_announcement",details:{target,recipient_count:rows.length,title}});
  return NextResponse.json({ok:true,recipients:rows.length});
 }catch(e){console.error("Announcement broadcast failed",e);return NextResponse.json({error:"Could not send announcement."},{status:500});}
}
