import Link from "next/link";
import {redirect} from "next/navigation";
import {isSuperAdminSessionValid} from "@/lib/admin-session";
import {createSupabaseServerClient} from "@/lib/supabase-server";

export const dynamic="force-dynamic";

export default async function AccessAuditPage(){
 if(!await isSuperAdminSessionValid())redirect("/admin");
 const sb=await createSupabaseServerClient();
 const {data:events,error}=await sb.from("admin_access_audit").select("id,actor_id,target_admin_id,action,section_key,details,created_at").order("created_at",{ascending:false}).limit(200);
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin/super-admin" className="brand">← SUPER ADMIN</Link><span className="meetLivePill isLive">OWNER ONLY</span></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">SECURITY & GOVERNANCE</div><h1>Admin access <em>audit log.</em></h1><p>Recent administrator appointments, removals and section permission changes.</p>{error?<div className="portalPanel">Audit records could not be loaded. Check the database connection and audit table permissions.</div>:<div className="portalPanel" style={{marginTop:20,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}><thead><tr><th align="left">Date</th><th align="left">Action</th><th align="left">Section</th><th align="left">Target admin</th><th align="left">Details</th></tr></thead><tbody>{(events||[]).map((e:any)=><tr key={e.id} style={{borderTop:"1px solid #ffffff20"}}><td style={{padding:"12px 8px",whiteSpace:"nowrap"}}>{new Date(e.created_at).toLocaleString("en-IN")}</td><td style={{padding:"12px 8px"}}>{e.action}</td><td style={{padding:"12px 8px"}}>{e.section_key||"—"}</td><td style={{padding:"12px 8px"}}>{String(e.target_admin_id).slice(0,8)}…</td><td style={{padding:"12px 8px"}}>{JSON.stringify(e.details||{})}</td></tr>)}</tbody></table>{!events?.length&&<p>No access changes recorded yet.</p>}</div>}</section></main>;
}
