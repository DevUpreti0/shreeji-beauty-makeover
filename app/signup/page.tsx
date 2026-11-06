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

 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const sb=createSupabaseBrowserClient();
   const {data,error}=await sb.auth.signUp({
    email:email.trim(),password,
    options:{data:{full_name:name}}
   });
   if(error)throw error;
   if(data.session){
    window.location.href="/student";
    return;
   }
   setMessage("Your account was created, but Supabase is still asking for email confirmation. The project owner must switch OFF Confirm email in Supabase Authentication settings, then try signing up again.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to create account.");}
  finally{setBusy(false);}
 }

 return <main className="authPage"><form className="authCard" onSubmit={submit}>
  <Link href="/" className="backLink">← Shreeji Beauty Makeover</Link>
  <div className="eyebrow">START YOUR JOURNEY</div><h1>Create your <em>account.</em></h1>
  <p>Create your student account using your email and password. No email OTP or confirmation email is needed once confirmation is disabled.</p>
  <label>Full name</label><input value={name} onChange={e=>setName(e.target.value)} required autoComplete="name"/>
  <label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/>
  <label>Password</label><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/>
  <button className="primary full" disabled={busy}>{busy?"Creating…":"Create student account ↗"}</button>
  {message&&<div className="formMessage" role="status">{message}</div>}
  <div className="authFoot">Already registered? <Link href="/login">Log in</Link></div>
 </form></main>;
}
