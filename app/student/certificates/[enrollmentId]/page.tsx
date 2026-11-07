import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import {createAdminDb} from "@/lib/supabase/admin";

export const dynamic="force-dynamic";

export default async function CertificateDetail({params}:{params:Promise<{enrollmentId:string}>}){
 const {enrollmentId}=await params;
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/login");
 const {data:enrollment}=await sb.from("enrollments").select("id,student_id,created_at,courses(id,title)").eq("id",enrollmentId).eq("student_id",user.id).maybeSingle();
 if(!enrollment||!enrollment.courses)notFound();
 const {data:modules}=await sb.from("modules").select("id").eq("course_id",enrollment.courses.id);
 const mids=(modules||[]).map((m:any)=>m.id);
 const {data:lessons}=mids.length?await sb.from("lessons").select("id").in("module_id",mids):{data:[] as any[]};
 const lids=(lessons||[]).map((l:any)=>l.id);
 const {data:progress}=lids.length?await sb.from("lesson_progress").select("lesson_id,completed").eq("student_id",user.id).in("lesson_id",lids):{data:[] as any[]};
 const done=new Set((progress||[]).filter((p:any)=>p.completed).map((p:any)=>p.lesson_id));
 if(!lids.length||done.size!==lids.length)notFound();
 const {data:profile}=await sb.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
 const {data:certificate}=await createAdminDb().from("certificates").select("certificate_number,issued_at").eq("student_id",user.id).eq("course_id",enrollment.courses.id).maybeSingle();
 if(!certificate)notFound();
 return <main className="portalPage"><header className="portalHeader noPrint"><Link href="/student/certificates" className="brand">← MY CERTIFICATES</Link><span className="outline">Print using browser menu</span></header><section className="portalContent" style={{maxWidth:980}}><article style={{background:"#fffdf7",color:"#28231e",border:"10px double #b58a5b",padding:"clamp(24px,6vw,64px)",textAlign:"center",boxShadow:"0 20px 60px #0005",marginTop:24}}><div style={{fontSize:13,letterSpacing:5,color:"#9a744b"}}>SHREEJI BEAUTY MAKEOVER</div><h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(34px,6vw,58px)",fontWeight:500,margin:"30px 0 8px"}}>Certificate of Completion</h1><p style={{letterSpacing:1}}>THIS CERTIFICATE IS PROUDLY PRESENTED TO</p><h2 style={{fontFamily:"Georgia,serif",fontSize:"clamp(28px,5vw,42px)",color:"#8c633c",margin:"18px 0"}}>{profile?.full_name||user.email}</h2><p>for successfully completing the course</p><h2 style={{fontSize:24}}>{enrollment.courses.title}</h2><p style={{marginTop:30}}>Awarded on {new Date(certificate.issued_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p><div style={{display:"flex",justifyContent:"space-between",gap:20,marginTop:52,flexWrap:"wrap"}}><span>Certificate No: {certificate.certificate_number}</span><span>Shreeji Beauty Makeover · Academic Team</span></div></article><p className="noPrint" style={{textAlign:"center",marginTop:18}}>Use your browser's print option to save this certificate as a PDF.</p></section><style>{'@media print{body{background:#fff!important}.noPrint{display:none!important}.portalPage{padding:0!important}.portalContent{max-width:none!important;padding:0!important}article{box-shadow:none!important;min-height:90vh;display:flex;flex-direction:column;justify-content:center}}'}</style></main>;
}
