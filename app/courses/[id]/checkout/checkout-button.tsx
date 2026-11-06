"use client";
import {useState} from "react";
declare global{interface Window{Razorpay?:new(options:any)=>{open:()=>void};Cashfree?:(options:{mode:"sandbox"|"production"})=>{checkout:(options:{paymentSessionId:string,redirectTarget:"_self"})=>Promise<any>}}}
export default function CheckoutButton({courseId,provider}:{courseId:string,provider:"razorpay"|"cashfree"}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[phone,setPhone]=useState("");
 async function loadScript(src:string){await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=()=>resolve();s.onerror=()=>reject(new Error("Could not load secure payment checkout."));document.body.appendChild(s);});}
 async function pay(){
  setBusy(true);setMessage("");
  try{
   if(provider==="cashfree"){
    if(!/^\\d{10}$/.test(phone))throw new Error("Enter your 10-digit mobile number to continue with Cashfree.");
    const res=await fetch("/api/payments/cashfree/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId,phone})});const order=await res.json();if(!res.ok)throw new Error(order.error||"Unable to create Cashfree order.");
    if(!window.Cashfree)await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
    if(!window.Cashfree)throw new Error("Cashfree checkout is unavailable.");
    const cashfree=window.Cashfree({mode:order.mode});await cashfree.checkout({paymentSessionId:order.paymentSessionId,redirectTarget:"_self"});setBusy(false);return;
   }
   const orderRes=await fetch("/api/payments/razorpay/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId})});const order=await orderRes.json();if(!orderRes.ok)throw new Error(order.error||"Unable to create order.");
   if(!window.Razorpay)await loadScript("https://checkout.razorpay.com/v1/checkout.js");
   if(!window.Razorpay)throw new Error("Razorpay checkout is unavailable.");
   const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Shreeji Beauty Makeover",description:order.courseName,order_id:order.orderId,prefill:{name:order.studentName,email:order.email},theme:{color:"#9a7655"},handler:async(response:any)=>{
    const verify=await fetch("/api/payments/razorpay/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(response)});const result=await verify.json();if(!verify.ok){setMessage(result.error||"Payment verification failed.");setBusy(false);return;}window.location.href="/student";
   },modal:{ondismiss:()=>setBusy(false)}});checkout.open();
  }catch(e){setMessage(e instanceof Error?e.message:"Payment could not be started.");setBusy(false);}
 }
 return <div style={{display:"grid",gap:10}}>
  {provider==="cashfree"&&<label style={{display:"grid",gap:6}}>Mobile number for payment<input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\\D/g,"").slice(0,10))} placeholder="10-digit mobile number" required/></label>}
  <button className="primary" onClick={pay} disabled={busy}>{busy?"Preparing secure checkout…":provider==="cashfree"?"Pay securely with Cashfree ↗":"Pay securely with Razorpay ↗"}</button>
  {message&&<p role="alert" className="formMessage">{message}</p>}
 </div>;
}
