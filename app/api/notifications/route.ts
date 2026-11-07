import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
export const dynamic="force-dynamic";
export async function GET(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {data,error}=await sb.from("user_notifications").select("id,title,body,href,kind,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(40);
 if(error)return NextResponse.json({error:"Could not load notifications."},{status:500});
 return NextResponse.json({notifications:data||[],unread:(data||[]).filter((n:any)=>!n.read_at).length});
}
export async function PATCH(req:NextRequest){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await req.json();const id=String(body.id||"");if(!id)return NextResponse.json({error:"Notification ID required."},{status:400});
 const {error}=await sb.from("user_notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
 if(error)return NextResponse.json({error:"Could not update notification."},{status:500});
 return NextResponse.json({ok:true});
}
