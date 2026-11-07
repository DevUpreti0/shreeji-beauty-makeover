import Link from "next/link";
import {redirect} from "next/navigation";
import {isSuperAdminSessionValid} from "@/lib/admin-session";
import SuperAdminManager from "./super-admin-manager";
import AnnouncementComposer from "./announcement-composer";
export const dynamic="force-dynamic";
export default async function SuperAdminPage(){if(!await isSuperAdminSessionValid())redirect("/admin");return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link><span className="meetLivePill isLive">SUPER ADMIN</span></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">DUKU BUSINESS · ROOT CONTROL</div><h1>Super <em>admin.</em></h1><p>Appoint administrators and decide exactly which platform sections each administrator can view or edit. Super admin access remains exclusive to the owner.</p><SuperAdminManager/><AnnouncementComposer/></section></main>}
