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
  const courseList = courses || [];
  const courseIds = courseList.map((c:any) => c.id);
  const {data:enrollments} = courseIds.length
    ? await sb.from("enrollments").select("id,course_id,status").in("course_id",courseIds)
    : {data:[] as any[]};
  const {data:classes} = await sb.from("live_classes").select("id,status").eq("teacher_id",user.id);
  const activeLearners = (enrollments || []).filter((e:any) => ["active","paid","completed"].includes(e.status)).length;
  const publishedCourses = courseList.filter((c:any) => c.status === "published").length;
  const liveClasses = (classes || []).filter((c:any) => c.status === "live").length;
  const courseEnrollmentCount = (courseId:string) => (enrollments || []).filter((e:any) => e.course_id === courseId && ["active","paid","completed"].includes(e.status)).length;

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>TEACHER</b></Link>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Link href="/profile" className="outline">My profile</Link>
        <form action="/auth/signout" method="post"><button className="outline">Sign out</button></form>
      </div>
    </header>
    <section className="portalContent" style={{maxWidth:1120}}>
      <div className="eyebrow">TEACHING WORKSPACE</div>
      <h1>Welcome, <em>{profile.full_name || user.email}</em></h1>
      <p>Your teaching control centre: manage courses, upload lesson videos, track learners and run live classes.</p>

      <div className="portalMetrics" style={{margin:"26px 0"}}>
        <div><small>MY COURSES</small><strong>{courseList.length}</strong></div>
        <div><small>PUBLISHED COURSES</small><strong>{publishedCourses}</strong></div>
        <div><small>ENROLLED LEARNERS</small><strong>{activeLearners}</strong></div>
        <div><small>LIVE CLASSES NOW</small><strong>{liveClasses}</strong></div>
      </div>

      <section className="portalPanel" style={{marginBottom:20}}>
        <div className="eyebrow" style={{marginBottom:8}}>TEACHER QUICK ACTIONS</div>
        <h2 style={{marginTop:0}}>Your teaching tools</h2>
        <p>Open your course studio to create modules, add lessons and upload private class videos. You can also schedule live sessions for your learners.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Link className="primary inlineButton" href="/teacher/live-classes">Schedule a live class ↗</Link>
          <Link className="outline" href="/live-classes">Open classrooms</Link>
          <Link className="outline" href="/profile">Update teacher profile</Link>
        </div>
      </section>

      <div className="portalPanel">
        <div className="eyebrow" style={{marginBottom:8}}>COURSE PERFORMANCE</div>
        <h2 style={{marginTop:0}}>My courses & learners</h2>
        {courseList.length ? courseList.map((c:any) => {
          const learners = courseEnrollmentCount(c.id);
          return <article className="portalCourse" key={c.id}>
            <div style={{flex:1,minWidth:190}}>
              <b>{c.title}</b>
              <span>{c.status} · {learners} enrolled learner{learners===1?"":"s"}</span>
            </div>
            <Link className="primary inlineButton" href={"/teacher/courses/"+c.id+"/content"}>Open lesson studio ↗</Link>
          </article>;
        }) : <div style={{padding:16}}>
          <b>No courses assigned yet</b>
          <p>Ask the administrator to assign a course to your teacher account. Your course studio will appear here automatically.</p>
        </div>}
      </div>

      <TeacherPanel/>
    </section>
  </main>;
}
