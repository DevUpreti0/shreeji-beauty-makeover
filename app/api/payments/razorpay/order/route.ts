import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please log in before purchasing."},{status:401});
  const body=await req.json();const courseId=body.courseId;if(typeof courseId!=="string")return NextResponse.json({error:"Invalid course."},{status:400});
  const db=createAdminDb();const [{data:course,error:courseError},{data:existing}]=await Promise.all([db.from("courses").select("id,title,price_paise,status").eq("id",courseId).single(),db.from("enrollments").select("id,status").eq("student_id",user.id).eq("course_id",courseId).maybeSingle()]);
  if(courseError||!course||course.status!=="published")return NextResponse.json({error:"This course is not available for purchase."},{status:404});
  if(existing&&["active","paid","completed"].includes(existing.status))return NextResponse.json({error:"You are already enrolled in this course."},{status:409});
  if(!Number.isSafeInteger(course.price_paise)||course.price_paise<=0)return NextResponse.json({error:"Course price is not configured."},{status:400});
  let coupon:any=null,discount=0;
  if(body.couponCode){const {data}=await db.from("course_coupons").select("*").eq("code",String(body.couponCode).trim().toUpperCase()).eq("is_active",true).maybeSingle();coupon=data;if(!coupon||(coupon.course_id&&coupon.course_id!==courseId))return NextResponse.json({error:"Coupon is not valid for this course."},{status:400});const now=Date.now();if((coupon.starts_at&&new Date(coupon.starts_at).getTime()>now)||(coupon.expires_at&&new Date(coupon.expires_at).getTime()<now)||(coupon.max_uses!==null&&coupon.used_count>=coupon.max_uses))return NextResponse.json({error:"Coupon is expired or its usage limit has been reached."},{status:400});discount=coupon.discount_type==="percent"?Math.floor(course.price_paise*coupon.discount_value/100):Math.min(course.price_paise,coupon.discount_value*100);if(discount>=course.price_paise)return NextResponse.json({error:"This coupon makes the course free. Use Claim free course instead."},{status:400});}
  const amount=course.price_paise-discount;
  const {data:gatewaySetting}=await db.from("platform_settings").select("value").eq("key","payment_provider").maybeSingle();if(gatewaySetting?.value!=="razorpay")return NextResponse.json({error:"Razorpay is not selected as the active payment provider. Ask the admin to enable it in Platform Settings."},{status:503});
  const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!secret)return NextResponse.json({error:"Razorpay is not connected yet. Admin must add the Razorpay API keys in Vercel."},{status:503});
  const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(keyId+":"+secret).toString("base64"),"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt:"course_"+course.id.slice(0,8)+"_"+user.id.slice(0,8),notes:{course_id:course.id,student_id:user.id,coupon_code:coupon?.code||""}}),cache:"no-store"});
  const gatewayOrder=await response.json();if(!response.ok||!gatewayOrder.id)return NextResponse.json({error:gatewayOrder.error?.description||"Razorpay could not create the order."},{status:502});
  if(coupon){let q=db.from("course_coupons").update({used_count:coupon.used_count+1}).eq("id",coupon.id).eq("used_count",coupon.used_count);if(coupon.max_uses!==null)q=q.lt("used_count",coupon.max_uses);const {data:claimed,error}=await q.select("id").maybeSingle();if(error||!claimed)return NextResponse.json({error:"Coupon was just used up. Please try again."},{status:409});}
  const {error:saveError}=await db.from("payments").insert({student_id:user.id,course_id:course.id,provider:"razorpay",provider_order_id:gatewayOrder.id,amount_paise:amount,original_amount_paise:course.price_paise,discount_paise:discount,coupon_id:coupon?.id||null,currency:"INR",status:"pending"});
  if(saveError){if(coupon)await db.from("course_coupons").update({used_count:coupon.used_count}).eq("id",coupon.id);return NextResponse.json({error:"Could not save payment order. Please contact support before retrying."},{status:500});}
  return NextResponse.json({keyId,orderId:gatewayOrder.id,amount:gatewayOrder.amount,currency:gatewayOrder.currency,courseName:course.title,studentName:user.user_metadata?.full_name||user.email||"Student",email:user.email||""});
 }catch{return NextResponse.json({error:"Unable to start checkout. Please try again."},{status:500});}
}
