import {NextRequest,NextResponse} from "next/server";
import {createHash,timingSafeEqual} from "node:crypto";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
const sha512=(value:string)=>createHash("sha512").update(value,"utf8").digest("hex");
function safeEqual(a:string,b:string){const x=Buffer.from(a.toLowerCase(),"utf8"),y=Buffer.from(b.toLowerCase(),"utf8");return x.length===y.length&&timingSafeEqual(x,y);}
export async function POST(req:NextRequest){
 const origin=new URL(req.url).origin;let txnid="";
 try{
  const form=await req.formData(),p:Record<string,string>={};for(const [k,v] of form.entries())if(typeof v==="string")p[k]=v;
  txnid=p.txnid||"";const key=process.env.PAYU_KEY,salt=process.env.PAYU_SALT;if(!key||!salt||!txnid)return NextResponse.redirect(new URL("/?payment=verification-error",origin),303);
  const db=createAdminDb(),{data:row}=await db.from("payments").select("id,student_id,course_id,amount_paise,status").eq("provider_order_id",txnid).eq("provider","payu").maybeSingle();
  if(!row)return NextResponse.redirect(new URL("/?payment=order-not-found",origin),303);
  if(row.status==="paid")return NextResponse.redirect(new URL("/student/receipts/"+row.id,origin),303);
  const reverse=[salt,p.status||"","","","","",p.udf5||"",p.udf4||"",p.udf3||"",p.udf2||"",p.udf1||"",p.email||"",p.firstname||"",p.productinfo||"",p.amount||"",txnid,p.key||""].join("|");
  const expected=sha512(p.additional_charges?String(p.additional_charges)+"|"+reverse:reverse);
  if(p.key!==key||!safeEqual(expected,p.hash||""))return NextResponse.redirect(new URL("/checkout/"+row.course_id+"?payment=invalid-response",origin),303);
  if(p.udf2!==row.student_id||p.udf1!==row.course_id||Math.round(Number(p.amount)*100)!==row.amount_paise)return NextResponse.redirect(new URL("/checkout/"+row.course_id+"?payment=details-mismatch",origin),303);
  const mode=process.env.PAYU_ENV==="production"?"production":"test",verifyUrl=mode==="production"?"https://info.payu.in/merchant/postservice.php?form=2":"https://test.payu.in/merchant/postservice.php?form=2";
  const command="verify_payment",verifyHash=sha512([key,command,txnid,salt].join("|")),body=new URLSearchParams({key,command,var1:txnid,hash:verifyHash});
  const verifyRes=await fetch(verifyUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});const verified=await verifyRes.json(),details=verified?.transaction_details?.[txnid];
  if(!verifyRes.ok||verified.status!==1||!details||String(details.status).toLowerCase()!=="success"||Math.round(Number(details.amt||details.transaction_amount)*100)!==row.amount_paise){await db.from("payments").update({status:"failed"}).eq("id",row.id).eq("status","pending");return NextResponse.redirect(new URL("/checkout/"+row.course_id+"?payment=failed",origin),303);}
  const {error:updateError}=await db.from("payments").update({provider_payment_id:String(details.mihpayid||txnid),status:"paid",paid_at:new Date().toISOString()}).eq("id",row.id);
  if(updateError)return NextResponse.redirect(new URL("/checkout/"+row.course_id+"?payment=contact-support",origin),303);
  const {error:enrollError}=await db.from("enrollments").upsert({student_id:row.student_id,course_id:row.course_id,status:"active"},{onConflict:"student_id,course_id"});
  if(enrollError)return NextResponse.redirect(new URL("/checkout/"+row.course_id+"?payment=enrollment-error",origin),303);
  return NextResponse.redirect(new URL("/student/receipts/"+row.id,origin),303);
 }catch{return NextResponse.redirect(new URL("/?payment=verification-error",origin),303);}
}