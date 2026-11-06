import {NextRequest,NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const auth=await createSupabaseServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Please log in before purchasing."},{status:401});
  const {courseId}=await req.json();if(typeof courseId!=="string")return NextResponse.json({error:"Invalid course."},{status:400});
  const db=createAdminDb();const [{data:course,error:courseError},{data:existing}]=await Promise.all([
   db.from("courses").select("id,title,price_paise,status").eq("id",courseId).single(),
   db.from("enrollments").select("id,status").eq("student_id",user.id).eq("course_id",courseId).maybeSingle()
  ]);
  if(courseError||!course||course.status!=="published")return NextResponse.json({error:"This course is not available for purchase."},{status:404});
  if(existing&&["active","paid","completed"].includes(existing.status))return NextResponse.json({error:"You are already enrolled in this course."},{status:409});
  if(!Number.isSafeInteger(course.price_paise)||course.price_paise<=0)return NextResponse.json({error:"Course price is not configured."},{status:400});
  const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!secret)return NextResponse.json({error:"Razorpay is not connected yet. Admin must add the Razorpay API keys in Vercel."},{status:503});
  const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(keyId+":"+secret).toString("base64"),"Content-Type":"application/json"},body:JSON.stringify({amount:course.price_paise,currency:"INR",receipt:"course_"+course.id.slice(0,8)+"_"+user.id.slice(0,8),notes:{course_id:course.id,student_id:user.id}}),cache:"no-store"});
  const order=await response.json();if(!response.ok||!order.id)return NextResponse.json({error:order.error?.description||"Razorpay could not create the order."},{status:502});
  const {error:saveError}=await db.from("payments").insert({student_id:user.id,course_id:course.id,provider:"razorpay",provider_order_id:order.id,amount_paise:course.price_paise,currency:"INR",status:"pending"});
  if(saveError)return NextResponse.json({error:"Could not save payment order. Please contact support before retrying."},{status:500});
  return NextResponse.json({keyId,orderId:order.id,amount:order.amount,currency:order.currency,courseName:course.title,studentName:user.user_metadata?.full_name||user.email||"Student",email:user.email||""});
 }catch{return NextResponse.json({error:"Unable to start checkout. Please try again."},{status:500});}
}
