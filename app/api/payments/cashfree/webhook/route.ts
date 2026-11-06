import {NextRequest,NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const secret=process.env.CASHFREE_SECRET_KEY;if(!secret)return NextResponse.json({error:"Webhook secret not configured."},{status:503});
  const raw=await req.text(),signature=req.headers.get("x-webhook-signature")||"",timestamp=req.headers.get("x-webhook-timestamp")||"";
  const expected=createHmac("sha256",secret).update(timestamp+raw).digest("base64");const a=Buffer.from(expected),b=Buffer.from(signature);
  if(!signature||!timestamp||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
  const event=JSON.parse(raw),data=event.data||{},orderId=data.order?.order_id,payment=data.payment||{};
  if(orderId&&payment.cf_payment_id){
   const db=createAdminDb();const {data:row}=await db.from("payments").select("id,student_id,course_id,amount_paise").eq("provider_order_id",orderId).eq("provider","cashfree").maybeSingle();
   if(row&&payment.payment_status==="SUCCESS"&&Math.round(Number(payment.payment_amount)*100)===row.amount_paise&&payment.payment_currency==="INR"){
    await db.from("payments").update({status:"paid",provider_payment_id:String(payment.cf_payment_id),paid_at:new Date().toISOString()}).eq("id",row.id);
    await db.from("enrollments").upsert({student_id:row.student_id,course_id:row.course_id,status:"active"},{onConflict:"student_id,course_id"});
   }else if(row&&payment.payment_status==="FAILED"){
    await db.from("payments").update({status:"failed",provider_payment_id:String(payment.cf_payment_id)}).eq("id",row.id);
   }
  }
  return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:"Webhook processing failed."},{status:500});}
}
