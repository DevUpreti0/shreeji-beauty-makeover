"use client";
import {useState} from "react";
declare global{interface Window{Razorpay?:new(options:any)=>{open:()=>void}}}
export default function CheckoutButton({courseId}:{courseId:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function pay(){
  setBusy(true);setMessage("");
  try{
   const orderRes=await fetch("/api/payments/razorpay/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId})});const order=await orderRes.json();if(!orderRes.ok)throw new Error(order.error||"Unable to create order.");
   if(!window.Razorpay){await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=()=>resolve();s.onerror=()=>reject(new Error("Could not load Razorpay checkout."));document.body.appendChild(s);});}
   if(!window.Razorpay)throw new Error("Razorpay checkout is unavailable.");
   const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Shreeji Beauty Makeover",description:order.courseName,order_id:order.orderId,prefill:{name:order.studentName,email:order.email},theme:{color:"#9a7655"},handler:async(response:any)=>{
    const verify=await fetch("/api/payments/razorpay/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(response)});const result=await verify.json();if(!verify.ok){setMessage(result.error||"Payment verification failed.");setBusy(false);return;}window.location.href="/student";
   },modal:{ondismiss:()=>setBusy(false)}});
   checkout.open();
  }catch(e){setMessage(e instanceof Error?e.message:"Payment could not be started.");setBusy(false);}
 }
 return <div style={{display:"grid",gap:10}}><button className="primary" onClick={pay} disabled={busy}>{busy?"Preparing secure checkout…":"Pay securely with Razorpay ↗"}</button>{message&&<p role="alert" className="formMessage">{message}</p>}</div>;
}
