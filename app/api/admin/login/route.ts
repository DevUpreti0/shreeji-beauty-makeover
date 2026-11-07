import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  const body=await request.json();const id=String(body?.id||"").trim();const password=String(body?.password||"");
  if(!id||!password)return NextResponse.json({error:"Enter your Admin ID and password."},{status:400});
  const db=createAdminDb();let email:string|null=null;
  const {data:account}=await db.from("admin_login_accounts").select("user_id").eq("login_id",id).maybeSingle();
  if(account){const {data}=await db.auth.admin.getUserById(account.user_id);email=data.user?.email||null;}
  else if(process.env.ADMIN_USERNAME&&id===process.env.ADMIN_USERNAME)email=process.env.ADMIN_LOGIN_EMAIL||null;
  if(!email)return NextResponse.json({error:"Invalid admin ID or password."},{status:401});
  const supabase=await createSupabaseServerClient();const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.user)return NextResponse.json({error:"Invalid admin ID or password."},{status:401});
  const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();
  if(profileError||profile?.role!=="admin"){await supabase.auth.signOut();return NextResponse.json({error:"This account has not been granted administrator access."},{status:403});}
  return NextResponse.json({ok:true,redirect:"/admin"});
 }catch{return NextResponse.json({error:"Unable to sign in. Please try again."},{status:500});}
}
