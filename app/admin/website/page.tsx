import Link from "next/link";
import {redirect} from "next/navigation";
import {canAdminAccess} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
import WebsiteEditorClient from "./editor-client";
export const dynamic="force-dynamic";
export default async function WebsiteEditor(){
 if(!await canAdminAccess("website"))redirect("/admin");
 const {data,error}=await createAdminDb().from("platform_settings").select("value").eq("key","website_content").maybeSingle();
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">ADVANCED WEBSITE CMS</div><h1>Website <em>control studio.</em></h1><p>Manage branding, homepage copy, navigation, feature cards, custom sections, public pages and theme colors. Image uploads are stored in your private project’s public site-assets bucket. Publishing updates the public website configuration.</p>{error&&<p className="formMessage">Could not load saved website content.</p>}<WebsiteEditorClient initial={data?.value||{}}/></section></main>;
}
