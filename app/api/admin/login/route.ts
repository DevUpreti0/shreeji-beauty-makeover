import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  const body=await request.json();
  const id=String(body?.id||"");
  const password=String(body?.password||"");
  if(!process.env.ADMIN_USERNAME||id!==process.env.ADMIN_USERNAME)return NextResponse.json({error:"Invalid admin ID or password."},{status:401});
  const email=process.env.ADMIN_LOGIN_EMAIL;
  if(!email)return NextResponse.json({error:"Admin login email is not configured."},{status:503});
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.user)return NextResponse.json({error:"Invalid admin ID or password."},{status:401});
  const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();
  if(profileError||profile?.role!=="admin"){await supabase.auth.signOut();return NextResponse.json({error:"This account has not been granted administrator access yet."},{status:403});}
  return NextResponse.json({ok:true,redirect:"/admin"});
 }catch{return NextResponse.json({error:"Unable to sign in. Please try again."},{status:500});}
}
