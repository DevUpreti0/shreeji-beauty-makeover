import {NextRequest,NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Not signed in."},{status:401});
  const b=await req.json();const orderId=String(b.razorpay_order_id||""),paymentId=String(b.razorpay_payment_id||""),signature=String(b.razorpay_signature||"");
  if(!orderId||!paymentId||!signature)return NextResponse.json({error:"Missing payment verification details."},{status:400});
  const secret=process.env.RAZORPAY_KEY_SECRET;if(!secret)return NextResponse.json({error:"Payment provider is not configured."},{status:503});
  const db=createAdminDb();const {data:record,error}=await db.from("payments").select("id,student_id,course_id,amount_paise,status").eq("provider_order_id",orderId).eq("provider","razorpay").single();
  if(error||!record||record.student_id!==user.id)return NextResponse.json({error:"Payment order was not found for this account."},{status:404});
  const expected=createHmac("sha256",secret).update(orderId+"|"+paymentId).digest("hex");
  const a=Buffer.from(expected,"hex"),z=Buffer.from(signature,"hex");if(a.length!==z.length||!timingSafeEqual(a,z))return NextResponse.json({error:"Payment signature verification failed."},{status:400});
  const keyId=process.env.RAZORPAY_KEY_ID;if(!keyId)return NextResponse.json({error:"Razorpay is not configured."},{status:503});
  const check=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Basic "+Buffer.from(keyId+":"+secret).toString("base64")},cache:"no-store"});
  const payment=await check.json();if(!check.ok||payment.order_id!==orderId||payment.amount!==record.amount_paise||payment.currency!=="INR"||payment.status!=="captured")return NextResponse.json({error:"Payment is not captured yet. If money was deducted, contact support with your payment ID."},{status:402});
  const {error:updateError}=await db.from("payments").update({provider_payment_id:paymentId,status:"paid",paid_at:new Date().toISOString()}).eq("id",record.id);
  if(updateError)return NextResponse.json({error:"Payment verified but access update failed. Contact support with payment ID "+paymentId},{status:500});
  const {error:enrollError}=await db.from("enrollments").upsert({student_id:user.id,course_id:record.course_id,status:"active"},{onConflict:"student_id,course_id"});
  if(enrollError)return NextResponse.json({error:"Payment received, but enrollment could not be created. Contact support with payment ID "+paymentId},{status:500});
  return NextResponse.json({ok:true,redirect:"/student"});
 }catch{return NextResponse.json({error:"Could not verify payment. Please contact support if money was deducted."},{status:500});}
}
