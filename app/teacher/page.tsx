import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import TeacherPanel from "./teacher-panel";
import TeacherToolkit from "./teacher-toolkit";
import NotificationCenter from "@/app/components/notification-center";

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
  const {data:classes} = await sb.from("live_classes").select("id,title,starts_at,duration_minutes,status").eq("teacher_id",user.id).order("starts_at",{ascending:true}).limit(10);
  const {data:modules} = courseIds.length
    ? await sb.from("modules").select("id,course_id").in("course_id",courseIds)
    : {data:[] as any[]};
  const moduleIds=(modules||[]).map((m:any)=>m.id);
  const {data:lessons} = moduleIds.length
    ? await sb.from("lessons").select("id,module_id").in("module_id",moduleIds)
    : {data:[] as any[]};
  const lessonIds=(lessons||[]).map((l:any)=>l.id);
  const {data:lessonProgress} = lessonIds.length
    ? await sb.from("lesson_progress").select("lesson_id,completed").in("lesson_id",lessonIds)
    : {data:[] as any[]};
  const totalLessons=lessonIds.length;
  const completedLessonRecords=(lessonProgress||[]).filter((p:any)=>p.completed).length;
  const lessonCompletions=(lessonProgress||[]).length;
  const completionRate=lessonCompletions?Math.round(completedLessonRecords/lessonCompletions*100):0;
  const upcomingTeacherClasses=(classes||[]).filter((c:any)=>new Date(c.starts_at).getTime()>=Date.now()-2*60*60*1000).slice(0,5);

  const activeLearners = (enrollments || []).filter((e:any) => ["active","paid","completed"].includes(e.status)).length;
  const publishedCourses = courseList.filter((c:any) => c.status === "published").length;
  const liveClasses = (classes || []).filter((c:any) => c.status === "live").length;
  const courseEnrollmentCount = (courseId:string) => (enrollments || []).filter((e:any) => e.course_id === courseId && ["active","paid","completed"].includes(e.status)).length;
  const courseLearningStats = (courseId:string) => {
    const mids=new Set((modules||[]).filter((m:any)=>m.course_id===courseId).map((m:any)=>m.id));
    const lids=new Set((lessons||[]).filter((l:any)=>mids.has(l.module_id)).map((l:any)=>l.id));
    const records=(lessonProgress||[]).filter((p:any)=>lids.has(p.lesson_id));
    const done=records.filter((p:any)=>p.completed).length;
    return {done,total:records.length,rate:records.length?Math.round(done/records.length*100):0};
  };

  return <main className="portalPage">
    <header className="portalHeader">
      <Link href="/" className="brand">SHREEJI <b>TEACHER</b></Link>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <NotificationCenter/>
        <Link href="/chat" className="outline">DuKu Chat</Link>
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
        <div><small>COURSE LESSONS</small><strong>{totalLessons}</strong></div>
        <div><small>LESSON COMPLETION</small><strong>{completionRate}%</strong></div>
      </div>

      <section className="portalPanel teacherAnalytics" style={{marginBottom:20}}>
        <div className="eyebrow" style={{marginBottom:8}}>TEACHER ANALYTICS</div>
        <h2 style={{marginTop:0}}>Learning performance</h2>
        <p>Track course content and learner activity across your teaching catalogue.</p>
        <div className="teacherAnalyticsGrid">
          <div><small>ACTIVE ENROLLMENTS</small><strong>{activeLearners}</strong><span>Across all your courses</span></div>
          <div><small>LESSON COMPLETIONS</small><strong>{completedLessonRecords}</strong><span>Completed lesson records</span></div>
          <div><small>LEARNING ACTIVITY</small><strong>{lessonCompletions}</strong><span>Progress records received</span></div>
          <div><small>CONTENT COVERAGE</small><strong>{totalLessons}</strong><span>Lessons published in your modules</span></div>
        </div>
        <div style={{marginTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:8,fontSize:12}}><b>Completion rate across recorded activity</b><strong>{completionRate}%</strong></div>
          <div style={{height:9,borderRadius:20,background:"#ffffff18",overflow:"hidden"}}><div style={{height:"100%",width:completionRate+"%",borderRadius:20,background:"linear-gradient(90deg,#756be0,#a98af2)"}}/></div>
          <small style={{display:"block",marginTop:8,color:"#b9c5da"}}>Calculated from lesson progress records visible to your teacher account.</small>
        </div>
      </section>

      <TeacherToolkit />

      <section className="portalPanel" style={{marginBottom:20}}>
        <div className="eyebrow" style={{marginBottom:8}}>DUKU MEET PLANNER</div>
        <h2 style={{marginTop:0}}>Your class schedule</h2>
        <p>Keep upcoming sessions close and open the classroom when it is time to teach.</p>
        {upcomingTeacherClasses.length ? <div style={{display:"grid",gap:10,marginTop:14}}>
          {upcomingTeacherClasses.map((item:any)=><article className="portalCourse" key={item.id}>
            <div style={{flex:1,minWidth:180}}><b>{item.title}</b><span>{new Date(item.starts_at).toLocaleString("en-IN")} · {item.duration_minutes} minutes</span><small style={{display:"block",marginTop:6,color:item.status==="live"?"#8df0bf":"#c8bbff"}}>{item.status==="live"?"● LIVE NOW":item.status.toUpperCase()}</small></div>
            <Link className="primary inlineButton" href={"/live-classes/"+item.id}>{item.status==="live"?"Open classroom ↗":"View class ↗"}</Link>
          </article>)}
        </div>:<p style={{marginTop:14}}>No upcoming classes. Schedule your next DuKu Meet session to see it here.</p>}
      </section>

      <section className="portalPanel" style={{marginBottom:20}}>
        <div className="eyebrow" style={{marginBottom:8}}>TEACHER QUICK ACTIONS</div>
        <h2 style={{marginTop:0}}>Your teaching tools</h2>
        <p>Open your course studio to create modules, add lessons and upload private class videos. You can also schedule live sessions for your learners.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Link className="primary inlineButton" href="/teacher/live-classes">Schedule a live class ↗</Link>
          <Link className="outline" href="/teacher/students">Manage students ↗</Link>
          <Link className="outline" href="/chat">DuKu Chat ↗</Link>
          <Link className="outline" href="/teacher/assignments">Assignments & grading ↗</Link>
          <Link className="outline" href="/teacher/quiz-results">Quiz results ↗</Link>
          <Link className="outline" href="/live-classes">Open classrooms</Link>
          <Link className="outline" href="/profile">Update teacher profile</Link>
        </div>
      </section>

      <div className="portalPanel">
        <div className="eyebrow" style={{marginBottom:8}}>COURSE PERFORMANCE</div>
        <h2 style={{marginTop:0}}>My courses & learners</h2>
        {courseList.length ? courseList.map((c:any) => {
          const learners = courseEnrollmentCount(c.id);
          const stats = courseLearningStats(c.id);
          return <article className="portalCourse" key={c.id}>
            <div style={{flex:1,minWidth:190}}>
              <b>{c.title}</b>
              <span>{c.status} · {learners} enrolled learner{learners===1?"":"s"}</span>
              <small style={{display:"block",marginTop:10,opacity:.75}}>Learner lesson completion: {stats.rate}% · {stats.done}/{stats.total} recorded</small>
              <div style={{height:7,maxWidth:320,background:"#ffffff20",borderRadius:20,overflow:"hidden",marginTop:7}}><div style={{height:"100%",width:stats.rate+"%",background:"linear-gradient(90deg,#756be0,#a98af2)"}}/></div>
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
