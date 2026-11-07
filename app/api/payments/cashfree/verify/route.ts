import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please sign in again to verify your payment."},{status:401});
  const {orderId}=await req.json();if(typeof orderId!=="string"||!/^smb_[a-zA-Z0-9]+$/.test(orderId))return NextResponse.json({error:"Invalid Cashfree order."},{status:400});
  const db=createAdminDb();const {data:row}=await db.from("payments").select("id,student_id,course_id,amount_paise,status").eq("provider_order_id",orderId).eq("provider","cashfree").maybeSingle();if(!row||row.student_id!==user.id)return NextResponse.json({error:"Payment order not found for this account."},{status:404});
  if(row.status==="paid")return NextResponse.json({ok:true,receiptUrl:"/student/receipts/"+row.id});
  const appId=process.env.CASHFREE_APP_ID,secret=process.env.CASHFREE_SECRET_KEY;if(!appId||!secret)return NextResponse.json({error:"Cashfree credentials are not configured."},{status:503});
  const base=process.env.CASHFREE_ENV==="production"?"https://api.cashfree.com/pg":"https://sandbox.cashfree.com/pg",headers={"x-client-id":appId,"x-client-secret":secret,"x-api-version":"2025-01-01"};
  const [orderRes,paymentsRes]=await Promise.all([fetch(base+"/orders/"+encodeURIComponent(orderId),{headers,cache:"no-store"}),fetch(base+"/orders/"+encodeURIComponent(orderId)+"/payments",{headers,cache:"no-store"})]);
  const order=await orderRes.json(),payments=await paymentsRes.json(),paid=Array.isArray(payments)?payments.find((p:any)=>p.payment_status==="SUCCESS"&&p.payment_currency==="INR"&&Math.round(Number(p.payment_amount)*100)===row.amount_paise):null;
  if(!orderRes.ok||order.order_status!=="PAID"||Math.round(Number(order.order_amount)*100)!==row.amount_paise||!paid)return NextResponse.json({error:"Cashfree has not confirmed a successful payment yet. If money was deducted, contact support."},{status:402});
  const {error:updateError}=await db.from("payments").update({status:"paid",provider_payment_id:String(paid.cf_payment_id),paid_at:paid.payment_time||new Date().toISOString()}).eq("id",row.id);if(updateError)return NextResponse.json({error:"Payment verified, but the payment record could not be updated. Contact support."},{status:500});
  const {error:enrollError}=await db.from("enrollments").upsert({student_id:user.id,course_id:row.course_id,status:"active"},{onConflict:"student_id,course_id"});if(enrollError)return NextResponse.json({error:"Payment received, but enrollment could not be created. Contact support."},{status:500});
  return NextResponse.json({ok:true,receiptUrl:"/student/receipts/"+row.id});
 }catch{return NextResponse.json({error:"Unable to verify Cashfree payment. Please contact support if money was deducted."},{status:500});}
}
