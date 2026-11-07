"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";

const menus={
 student:{label:"Student workspace",links:[["Dashboard","/student"],["My courses","/student/courses"],["Live classes","/live-classes"],["My profile","/profile"],["Support","/support"]]},
 teacher:{label:"Teacher workspace",links:[["Dashboard","/teacher"],["My live classes","/teacher/live-classes"],["All classrooms","/live-classes"],["My profile","/profile"],["Support","/support"]]},
 admin:{label:"Admin control center",links:[["Dashboard","/admin"],["Users & roles","/admin/users"],["Courses","/admin/courses"],["Assessments","/admin/assessments"],["Enrollments","/admin/enrollments"],["Payments","/admin/payments"],["Live classes","/admin/live-classes"],["Attendance","/admin/live-classes/attendance"],["Support inbox","/admin/support"],["Website editor","/admin/website"],["Settings","/admin/settings"],["My profile","/profile"]]}
};

export default function PanelDrawer(){
 const pathname=usePathname();
 const role=pathname.startsWith("/admin")?"admin":pathname.startsWith("/teacher")?"teacher":pathname.startsWith("/student")?"student":null;
 const [open,setOpen]=useState(false);
 if(!role)return null;
 const menu=menus[role];
 return <>
  <button className="panelMenuTrigger" aria-label="Open dashboard menu" aria-expanded={open} onClick={()=>setOpen(true)}><span>⋮</span></button>
  {open&&<div className="panelDrawerShade" onClick={()=>setOpen(false)}>
   <aside className="panelDrawer" onClick={e=>e.stopPropagation()} aria-label={menu.label}>
    <div className="panelDrawerHead"><div><small>DUKU BUSINESS FCA LAB</small><strong>{menu.label}</strong></div><button aria-label="Close menu" onClick={()=>setOpen(false)}>×</button></div>
    <nav>{menu.links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={pathname===href?"active":""}>{label}<span>↗</span></Link>)}</nav>
    <form action="/auth/signout" method="post"><button className="panelDrawerSignout">Sign out <span>↗</span></button></form>
    <p>SHREEJI BEAUTY MAKEOVER<br/>A DuKu Business FCA Lab platform</p>
   </aside>
  </div>}
 </>;
}
