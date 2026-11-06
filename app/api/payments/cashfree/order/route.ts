import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please log in before purchasing."},{status:401});
  const {courseId,phone}=await req.json();if(typeof courseId!=="string"||typeof phone!=="string"||!/^\\d{10}$/.test(phone))return NextResponse.json({error:"Enter a valid 10-digit mobile number for Cashfree checkout."},{status:400});
  const db=createAdminDb();const [{data:course,error:courseError},{data:existing},{data:gatewaySetting}]=await Promise.all([
   db.from("courses").select("id,title,price_paise,status").eq("id",courseId).single(),
   db.from("enrollments").select("id,status").eq("student_id",user.id).eq("course_id",courseId).maybeSingle(),
   db.from("platform_settings").select("value").eq("key","payment_provider").maybeSingle()
  ]);
  if(courseError||!course||course.status!=="published")return NextResponse.json({error:"This course is not available for purchase."},{status:404});
  if(existing&&["active","paid","completed"].includes(existing.status))return NextResponse.json({error:"You are already enrolled in this course."},{status:409});
  if(!Number.isSafeInteger(course.price_paise)||course.price_paise<=0)return NextResponse.json({error:"Course price is not configured."},{status:400});
  if(gatewaySetting?.value!=="cashfree")return NextResponse.json({error:"Cashfree is not selected as the active payment provider."},{status:503});
  const appId=process.env.CASHFREE_APP_ID,secret=process.env.CASHFREE_SECRET_KEY;if(!appId||!secret)return NextResponse.json({error:"Cashfree is not connected yet. Admin must add Cashfree API credentials in Vercel."},{status:503});
  const mode=process.env.CASHFREE_ENV==="production"?"production":"sandbox";const base=mode==="production"?"https://api.cashfree.com/pg":"https://sandbox.cashfree.com/pg";
  const orderId="smb_"+crypto.randomUUID().replace(/-/g,"").slice(0,28);
  const origin=new URL(req.url).origin;
  const response=await fetch(base+"/orders",{method:"POST",headers:{"x-client-id":appId,"x-client-secret":secret,"x-api-version":"2025-01-01","Content-Type":"application/json"},body:JSON.stringify({order_id:orderId,order_amount:Number((course.price_paise/100).toFixed(2)),order_currency:"INR",customer_details:{customer_id:user.id.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,50),customer_name:String(user.user_metadata?.full_name||"Student").replace(/[^a-zA-Z0-9 ]/g,"").slice(0,100),customer_email:user.email||"student@example.com",customer_phone:phone},order_meta:{return_url:origin+"/payments/cashfree/return?order_id={order_id}",notify_url:origin+"/api/payments/cashfree/webhook"}}),cache:"no-store"});
  const order=await response.json();if(!response.ok||!order.payment_session_id)return NextResponse.json({error:order.message||"Cashfree could not create the order."},{status:502});
  const {error:saveError}=await db.from("payments").insert({student_id:user.id,course_id:course.id,provider:"cashfree",provider_order_id:orderId,amount_paise:course.price_paise,currency:"INR",status:"pending"});
  if(saveError)return NextResponse.json({error:"Could not save payment order. Contact support before retrying."},{status:500});
  return NextResponse.json({paymentSessionId:order.payment_session_id,orderId,mode});
 }catch{return NextResponse.json({error:"Unable to start Cashfree checkout. Please try again."},{status:500});}
}
