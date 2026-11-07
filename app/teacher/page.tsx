import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import TeacherPanel from "./teacher-panel";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  let sb;
  try { sb = await createSupabaseServerClient(); } catch { redirect("/login"); }
  const {data:{user}} = await sb.auth.getUser();
  if (!user) redirect("/login");
  const {data:profile} = await sb.from("profiles").select("full_name,role").eq("id",user.id).single();
  if (profile?.role !== "teacher" && profile?.role !== "admin") redirect("/login");
  const {data:courses} = await sb.from("courses").select("id,title,status,created_at").eq("teacher_id",user.id).order("created_at",{ascending:false});
  const courseCount = courses?.length ?? 0;

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>TEACHER</b></Link>
      <form action="/auth/signout" method="post"><button className="outline">Sign out</button></form>
    </header>
    <section className="portalContent">
      <div className="eyebrow">TEACHING WORKSPACE</div>
      <h1>Welcome, <em>{profile.full_name || user.email}</em></h1>
      <p>Your teaching control centre: manage courses, upload lesson videos, and run live classes.</p>

      <div className="portalMetrics">
        <div><small>MY COURSES</small><strong>{courseCount}</strong></div>
        <div><small>VIDEO & LESSON STUDIO</small><strong>↗</strong></div>
        <div><small>LIVE CLASSROOM</small><strong>●</strong></div>
      </div>

      <section className="portalPanel" style={{marginBottom:20}}>
        <div className="eyebrow">TEACHER TOOLS</div>
        <h2>Video & lesson studio</h2>
        <p>Choose one of your assigned courses, open its studio, create or edit a lesson, and upload an MP4, WEBM or MOV video. Uploaded videos are stored privately for enrolled students.</p>
        {courseCount > 0 ? <div style={{display:"grid",gap:10}}>
          {(courses || []).map(c => <article className="portalCourse" key={c.id}>
            <div style={{flex:1}}>
              <b>{c.title}</b>
              <span>{c.status}</span>
            </div>
            <Link className="primary" href={"/teacher/courses/"+c.id+"/content"}>Open video upload studio ↗</Link>
          </article>)}
        </div> : <div style={{padding:16,background:"#faf7f2",border:"1px solid #eee5de"}}>
          <b>No courses assigned yet</b>
          <p style={{marginBottom:8}}>Ask the administrator to assign a course to your teacher account. The upload studio appears here as soon as a course is assigned.</p>
          <Link className="outline" href="/teacher/live-classes">Open live-class tools</Link>
        </div>}
      </section>

      <p style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Link className="outline" href="/teacher/live-classes">Schedule & manage my live classes</Link>
        <Link className="outline" href="/live-classes">View classrooms</Link>
      </p>
      <TeacherPanel/>
      <div className="portalPanel" style={{marginTop:20}}>
        <h2>My courses</h2>
        {courseCount ? (courses || []).map(c => <article className="portalCourse" key={c.id}>
          <div style={{flex:1}}><b>{c.title}</b><span>{c.status}</span></div>
          <Link className="outline" href={"/teacher/courses/"+c.id+"/content"}>Manage lessons & upload videos ↗</Link>
        </article>) : <p>No courses assigned yet. Create a draft course above or ask an administrator to assign an existing course to you.</p>}
      </div>
    </section>
  </main>;
}
