import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  let sb;
  try { sb = await createSupabaseServerClient(); } catch { redirect("/login"); }
  const {data:{user}} = await sb.auth.getUser();
  if (!user) redirect("/login");
  const {data:profile} = await sb.from("profiles").select("full_name,role").eq("id",user.id).single();
  if (profile?.role !== "student") redirect("/login");

  const {data:enrollments} = await sb.from("enrollments")
    .select("id,status,courses(id,title,description,thumbnail_url,category,level)")
    .eq("student_id",user.id).order("created_at",{ascending:false});
  const enrolled = (enrollments || []).filter((e:any) => e.courses?.id);
  const courseIds = enrolled.map((e:any) => e.courses.id);
  const {data:modules} = courseIds.length
    ? await sb.from("modules").select("id,course_id").in("course_id",courseIds)
    : {data:[] as any[]};
  const moduleIds = (modules || []).map((m:any) => m.id);
  const {data:lessons} = moduleIds.length
    ? await sb.from("lessons").select("id,module_id").in("module_id",moduleIds)
    : {data:[] as any[]};
  const {data:progress} = await sb.from("lesson_progress")
    .select("lesson_id,completed").eq("student_id",user.id);
  const completedIds = new Set((progress || []).filter((p:any) => p.completed).map((p:any) => p.lesson_id));
  const courseStats = enrolled.map((enrollment:any) => {
    const course = enrollment.courses;
    const courseModuleIds = new Set((modules || []).filter((m:any) => m.course_id === course.id).map((m:any) => m.id));
    const courseLessons = (lessons || []).filter((l:any) => courseModuleIds.has(l.module_id));
    const completed = courseLessons.filter((l:any) => completedIds.has(l.id)).length;
    const total = courseLessons.length;
    return {...enrollment, course, completed, total, percent:total ? Math.round(completed / total * 100) : 0};
  });
  const totalLessons = courseStats.reduce((sum:any,c:any) => sum + c.total,0);
  const totalCompleted = courseStats.reduce((sum:any,c:any) => sum + c.completed,0);
  const overall = totalLessons ? Math.round(totalCompleted / totalLessons * 100) : 0;
  const activeCount = courseStats.filter((c:any) => ["active","paid"].includes(c.status)).length;

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>LEARNER</b></Link>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Link href="/profile" className="outline">My profile</Link>
        <form action="/auth/signout" method="post"><button className="outline">Sign out</button></form>
      </div>
    </header>
    <section className="portalContent" style={{maxWidth:1120}}>
      <div className="eyebrow">YOUR PERSONAL LEARNING SPACE</div>
      <h1>Welcome back, <em>{profile.full_name || user.email}</em></h1>
      <p>Pick up where you left off and keep building your skills.</p>
      <p><Link className="primary inlineButton" href="/live-classes">Join live course classes ↗</Link></p>

      <div className="portalMetrics" style={{margin:"26px 0"}}>
        <div><small>MY COURSES</small><strong>{courseStats.length}</strong></div>
        <div><small>ACTIVE COURSES</small><strong>{activeCount}</strong></div>
        <div><small>LESSONS COMPLETED</small><strong>{totalCompleted}<span style={{fontSize:14,opacity:.65}}> / {totalLessons}</span></strong></div>
        <div><small>OVERALL PROGRESS</small><strong>{overall}%</strong></div>
      </div>

      <div className="portalPanel" style={{marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><div className="eyebrow" style={{marginBottom:8}}>LEARNING OVERVIEW</div><h2 style={{margin:"0 0 6px"}}>Your progress at a glance</h2><p style={{margin:0}}>Completed lessons across all your enrolled courses.</p></div>
          <strong style={{fontSize:30,color:"#d5ad86"}}>{overall}%</strong>
        </div>
        <div style={{height:9,background:"rgba(150,150,150,.2)",borderRadius:20,overflow:"hidden",marginTop:20}}>
          <div style={{height:"100%",width:overall+"%",background:"linear-gradient(90deg,#b98a61,#e3c39b)",borderRadius:20,transition:"width .4s"}} />
        </div>
      </div>

      <div className="portalPanel">
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><div className="eyebrow" style={{marginBottom:8}}>YOUR ENROLLMENTS</div><h2 style={{margin:0}}>My courses</h2></div>
          <Link className="outline" href="/#courses">Explore courses ↗</Link>
        </div>
        {courseStats.length ? courseStats.map((c:any) => <article className="portalCourse" key={c.id}>
          <div style={{flex:1,minWidth:180}}>
            <b>{c.course.title || "Course"}</b>
            <p>{c.course.description || "Your course workspace."}</p>
            <span>{c.course.category || "Beauty course"} · {c.status}</span>
            <div style={{height:6,background:"rgba(150,150,150,.2)",borderRadius:20,overflow:"hidden",marginTop:12,maxWidth:360}}>
              <div style={{height:"100%",width:c.percent+"%",background:"#c69b72",borderRadius:20}} />
            </div>
            <small style={{display:"block",marginTop:7,opacity:.75}}>{c.completed} of {c.total} lessons completed · {c.percent}%</small>
          </div>
          {c.course.id && <Link className="primary inlineButton" href={"/student/courses/"+c.course.id}>{c.percent ? "Continue learning ↗" : "Start learning ↗"}</Link>}
        </article>) : <div style={{padding:"22px 0"}}><p>No enrollments yet. Browse the course catalogue to get started.</p><Link className="primary inlineButton" href="/#courses">Browse courses ↗</Link></div>}
      </div>
    </section>
  </main>;
}
