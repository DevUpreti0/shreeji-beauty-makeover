"use client";
import { FormEvent,useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignupPage(){
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [pendingEmail,setPendingEmail]=useState("");
 const [resending,setResending]=useState(false);

 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");setPendingEmail("");
  try{
   const sb=createSupabaseBrowserClient();
   const {data,error}=await sb.auth.signUp({
    email:email.trim(),password,
    options:{
     data:{full_name:name},
     emailRedirectTo:`${window.location.origin}/auth/callback?next=/student`
    }
   });
   if(error)throw error;
   if(data.session){window.location.href="/student";return;}
   setPendingEmail(email.trim());
   setMessage("Your account request was submitted. Check your inbox and spam folder for the confirmation email. If it does not arrive, use the resend button below.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to create account.");}
  finally{setBusy(false);}
 }

 async function resend(){
  if(!pendingEmail && !email.trim()){setMessage("Enter the email address you used to register first.");return;}
  setResending(true);setMessage("");
  try{
   const sb=createSupabaseBrowserClient();
   const {error}=await sb.auth.resend({
    type:"signup",
    email:(pendingEmail || email).trim(),
    options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/student`}
   });
   if(error)throw error;
   setMessage("A new confirmation email request was accepted. Check your inbox, Spam, Promotions and Updates folders. If it still does not arrive, the email provider may be blocking delivery or rate-limiting this project.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to resend confirmation email.");}
  finally{setResending(false);}
 }

 return <main className="authPage"><form className="authCard" onSubmit={submit}>
  <Link href="/" className="backLink">← Shreeji Beauty Makeover</Link>
  <div className="eyebrow">START YOUR JOURNEY</div><h1>Create your <em>account.</em></h1>
  <p>Student registration. Teacher access is granted by an administrator.</p>
  <label>Full name</label><input value={name} onChange={e=>setName(e.target.value)} required/>
  <label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
  <label>Password</label><input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/>
  <button className="primary full" disabled={busy}>{busy?"Creating…":"Create student account ↗"}</button>
  {message&&<div className="formMessage" role="status">{message}</div>}
  {pendingEmail&&<button type="button" className="secondary full" onClick={resend} disabled={resending}>{resending?"Sending…":"Resend verification email ↻"}</button>}
  {!pendingEmail&&<button type="button" className="secondary full" onClick={resend} disabled={resending}>{resending?"Sending…":"Already registered? Resend verification email ↻"}</button>}
  <div className="authFoot">Already registered? <Link href="/login">Log in</Link></div>
 </form></main>;
}
