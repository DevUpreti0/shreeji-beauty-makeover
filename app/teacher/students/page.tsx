import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import StudentDirectory from "./student-directory";
export const dynamic="force-dynamic";
export default async function TeacherStudentsPage(){
 let sb;try{sb=await createSupabaseServerClient();}catch{redirect("/login");}
 const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await sb.from("profiles").select("full_name,role").eq("id",user.id).single();
 if(profile?.role!=="teacher"&&profile?.role!=="admin")redirect("/login");
 return <main className="portalPage"><header className="portalHeader"><Link href="/" className="brand">SHREEJI <b>TEACHER</b></Link><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/teacher" className="outline">← Teacher dashboard</Link><Link href="/profile" className="outline">My profile</Link></div></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">TEACHER WORKSPACE · LEARNER MANAGEMENT</div><h1>Student <em>management</em></h1><p>Search learners enrolled in your courses, review their progress and attendance, and export a report.</p><StudentDirectory/></section></main>;
}
