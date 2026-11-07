import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import StudyPlanner from "./study-planner";
import NotificationCenter from "@/app/components/notification-center";
import {formatIndiaDateTime} from "@/lib/datetime";

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
  const nextCourse=courseStats.find((c:any)=>c.percent<100);
  const completedCourses=courseStats.filter((c:any)=>c.total>0&&c.percent===100).length;
  const milestones=[
    {label:"First lesson completed",detail:"Your learning journey has started",unlocked:totalCompleted>=1},
    {label:"Halfway there",detail:"Complete at least half of your lessons",unlocked:overall>=50},
    {label:"Course finisher",detail:"Finish all lessons in a course",unlocked:completedCourses>=1},
  ];
  const activeCourseIds = courseStats.filter((c:any) => ["active","paid","completed"].includes(c.status)).map((c:any) => c.course.id);
  const {data:upcomingClasses} = activeCourseIds.length
    ? await sb.from("live_classes").select("id,title,starts_at,duration_minutes,status,courses(title)").in("course_id",activeCourseIds).in("status",["scheduled","live"]).gte("starts_at",new Date(Date.now()-3*60*60*1000).toISOString()).order("starts_at",{ascending:true}).limit(8)
    : {data:[] as any[]};

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>LEARNER</b></Link>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <NotificationCenter/>
        <Link href="/chat" className="outline">DuKu Chat</Link>
        <Link href="/student/assignments" className="outline">Assignments</Link>
        <Link href="/student/quizzes" className="outline">My quizzes</Link>
        <Link href="/student/certificates" className="outline">My certificates</Link>
        <Link href="/student/receipts" className="outline">My receipts</Link>
        <Link href="/profile" className="outline">My profile</Link>
        <form action="/auth/signout" method="post"><button className="outline">Sign out</button></form>
      </div>
    </header>
    <section className="portalContent" style={{maxWidth:1120}}>
      <div className="eyebrow">YOUR PERSONAL LEARNING SPACE</div>
      <h1>Welcome back, <em>{profile.full_name || user.email}</em></h1>
      <p>Pick up where you left off and keep building your skills.</p>
      <p style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="primary inlineButton" href="/live-classes">Join live course classes ↗</Link><Link className="outline" href="/student/live-classes/attendance">My attendance report ↗</Link></p>

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

      <StudyPlanner />

      <section className="portalPanel studentNextStep" style={{marginBottom:22}}>
        <div className="eyebrow" style={{marginBottom:8}}>YOUR NEXT MILESTONE</div>
        {nextCourse ? <>
          <h2 style={{margin:"0 0 6px"}}>Keep your momentum going</h2>
          <p style={{margin:"0 0 14px"}}>Continue <b>{nextCourse.course.title}</b> — you have completed {nextCourse.percent}% of this course.</p>
          <div style={{height:9,borderRadius:20,background:"#ffffff18",overflow:"hidden",maxWidth:520}}><div style={{height:"100%",width:nextCourse.percent+"%",borderRadius:20,background:"linear-gradient(90deg,#756be0,#a98af2)"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:14}}>
            <small style={{color:"#c2cde0"}}>{nextCourse.completed} / {nextCourse.total} lessons completed</small>
            <Link className="primary inlineButton" href={"/student/courses/"+nextCourse.course.id}>Continue this course ↗</Link>
          </div>
        </>:<><h2 style={{margin:"0 0 6px"}}>You completed every course!</h2><p style={{margin:0}}>Amazing work. Explore the catalogue to start your next skill.</p></>}
        <div className="studentMilestones">{milestones.map((m:any)=><div key={m.label} className={m.unlocked?"unlocked":""}><span>{m.unlocked?"✓":"☆"}</span><div><b>{m.label}</b><small>{m.detail}</small></div></div>)}</div>
      </section>

      <section className="portalPanel" style={{marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><div className="eyebrow" style={{marginBottom:8}}>DUKU MEET CLASS SCHEDULE</div><h2 style={{margin:0}}>Upcoming live classes</h2><p style={{margin:"6px 0 0"}}>Your course sessions, all in one place.</p></div>
          <Link className="outline" href="/live-classes">All classrooms ↗</Link>
        </div>
        {upcomingClasses?.length ? <div style={{display:"grid",gap:10,marginTop:16}}>
          {upcomingClasses.map((c:any) => <article className="portalCourse" key={c.id}>
            <div style={{flex:1,minWidth:180}}><b>{c.title}</b><span>{c.courses?.title || "Your course"} · {formatIndiaDateTime(c.starts_at)} · {c.duration_minutes} min</span><small style={{display:"inline-block",marginTop:6,color:c.status==="live"?"#8df0bf":"#c8bbff",letterSpacing:1}}>{c.status==="live"?"● LIVE NOW":"SCHEDULED"}</small></div>
            <Link className="primary inlineButton" href={"/live-classes/"+c.id}>{c.status==="live"?"Join live class ↗":"Open class details ↗"}</Link>
          </article>)}
        </div> : <div style={{padding:"18px 0 4px"}}><p>No upcoming sessions yet. New classes scheduled for your enrolled courses will appear here.</p></div>}
      </section>

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
