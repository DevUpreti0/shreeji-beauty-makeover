"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
 const [role,setRole]=useState("Student"),[id,setId]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError("");setBusy(true);
  try{
   if(role==="Admin"){
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,password})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"Admin login failed.");window.location.href=data.redirect||"/admin";return;
   }
   const supabase=createSupabaseBrowserClient();
   const {data,error}=await supabase.auth.signInWithPassword({email:id,password});
   if(error)throw error;
   const {data:profile}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();
   if(role==="Teacher"&&profile?.role!=="teacher")throw new Error("This account is not assigned the Teacher role.");
   if(role==="Student"&&profile?.role!=="student")throw new Error("Please choose the role assigned to your account.");
   window.location.href=role==="Teacher"?"/teacher":"/student";
  }catch(err){setError(err instanceof Error?err.message:"Sign in failed.");}finally{setBusy(false);}
 }
 return <main className="authPage"><form className="authCard" onSubmit={submit}><Link href="/" className="backLink">← Shreeji Beauty Makeover</Link><div className="eyebrow">SECURE ACCOUNT ACCESS</div><h1>Welcome <em>back.</em></h1><p>Sign in to continue to your learning space.</p><label>Account type</label><select value={role} onChange={e=>setRole(e.target.value)}><option>Student</option><option>Teacher</option><option>Admin</option></select><label>{role==="Admin"?"Admin ID":"Email address"}</label><input value={id} onChange={e=>setId(e.target.value)} required type={role==="Admin"?"text":"email"} placeholder={role==="Admin"?"Enter admin ID":"you@example.com"}/><label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} required type="password" placeholder="Your password"/>{error&&<div className="formError">{error}</div>}<button className="primary full" disabled={busy}>{busy?"Signing in…":"Sign in securely ↗"}</button><small>Admin sessions expire automatically after 8 hours. Student and teacher accounts use Supabase Auth.</small><div className="authFoot">New learner? <Link href="/signup">Create a student account</Link></div></form></main>;
}
