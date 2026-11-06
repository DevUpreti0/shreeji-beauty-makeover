import Link from "next/link";import {redirect,notFound} from "next/navigation";import {createSupabaseServerClient} from "@/lib/supabase-server";import CheckoutButton from "./checkout-button";
export const dynamic="force-dynamic";
export default async function CheckoutPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;let db;try{db=await createSupabaseServerClient();}catch{redirect("/login");}
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:course}=await db.from("courses").select("id,title,description,price_paise,status").eq("id",id).single();if(!course||course.status!=="published")notFound();
 const {data:enrollment}=await db.from("enrollments").select("id,status").eq("student_id",user.id).eq("course_id",id).maybeSingle();
 if(enrollment&&["active","paid","completed"].includes(enrollment.status))redirect("/student");
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>CHECKOUT</b></Link></header><section className="portalContent" style={{maxWidth:720}}><div className="eyebrow">SECURE COURSE CHECKOUT</div><h1>Start learning <em>today.</em></h1><div className="portalPanel"><h2>{course.title}</h2><p>{course.description}</p><h1>₹{(course.price_paise/100).toLocaleString("en-IN",{maximumFractionDigits:2})}</h1><p>One-time course payment · INR</p><CheckoutButton courseId={course.id}/><p style={{fontSize:12,opacity:.7}}>Payments are processed by Razorpay. Your course access is enabled only after the server verifies a captured payment.</p></div></section></main>;
}
