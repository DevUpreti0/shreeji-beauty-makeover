"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
export default function CashfreeReturnPage(){
 const params=useSearchParams();const orderId=params.get("order_id");const [message,setMessage]=useState("Verifying your payment securely…"),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;(async()=>{if(!orderId){if(active){setMessage("Payment order was not found.");setFailed(true);}return;}try{const r=await fetch("/api/payments/cashfree/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Payment could not be verified.");if(active){setMessage("Payment successful! Your course access and receipt are ready.");window.location.replace(d.receiptUrl||"/student");}}catch(e){if(active){setMessage(e instanceof Error?e.message:"Payment verification failed.");setFailed(true);}}})();return()=>{active=false};},[orderId]);
 return <main className="portalPage"><section className="portalContent" style={{maxWidth:650,margin:"12vh auto"}}><div className="portalPanel"><h1>{failed?"Payment status":"Please wait"}</h1><p>{message}</p>{failed&&<p><Link href="/student">Go to student dashboard</Link> · <Link href="/">Back to website</Link></p>}</div></section></main>;
}
