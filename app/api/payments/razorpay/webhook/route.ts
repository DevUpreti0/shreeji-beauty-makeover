import {NextRequest,NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook secret not configured."},{status:503});
  const raw=await req.text(),signature=req.headers.get("x-razorpay-signature")||"",expected=createHmac("sha256",secret).update(raw).digest("hex");
  const a=Buffer.from(expected,"hex"),b=Buffer.from(signature,"hex");if(!signature||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
  const event=JSON.parse(raw);if(event.event==="payment.captured"||event.event==="order.paid"){
   const entity=event.payload?.payment?.entity||event.payload?.order?.entity;const orderId=entity?.order_id||entity?.id;const paymentId=entity?.id;
   if(orderId){const db=createAdminDb();const {data:row}=await db.from("payments").select("id,student_id,course_id,amount_paise").eq("provider_order_id",orderId).eq("provider","razorpay").maybeSingle();
    if(row){const amount=event.payload?.payment?.entity?.amount||entity?.amount;if(amount===row.amount_paise){await db.from("payments").update({status:"paid",provider_payment_id:paymentId||null,paid_at:new Date().toISOString()}).eq("id",row.id);await db.from("enrollments").upsert({student_id:row.student_id,course_id:row.course_id,status:"active"},{onConflict:"student_id,course_id"});}}
   }
  }
  return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:"Webhook processing failed."},{status:500});}
}
