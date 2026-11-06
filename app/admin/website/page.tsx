import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdminSessionValid} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
async function saveContent(formData:FormData){
 "use server";if(!await isAdminSessionValid())redirect("/login");
 const value={announcement:String(formData.get("announcement")||"").slice(0,180),heroLine1:String(formData.get("heroLine1")||"").slice(0,100),heroLine2:String(formData.get("heroLine2")||"").slice(0,100),heroAccent:String(formData.get("heroAccent")||"").slice(0,100),heroDescription:String(formData.get("heroDescription")||"").slice(0,500),coursesHeading:String(formData.get("coursesHeading")||"").slice(0,140),contactEmail:String(formData.get("contactEmail")||"").slice(0,180)};
 const {error}=await createAdminDb().from("platform_settings").upsert({key:"website_content",value,updated_at:new Date().toISOString()});
 if(error)throw new Error("Could not save website content. Check the platform_settings table.");
 revalidatePath("/");revalidatePath("/admin/website");
}
export default async function WebsiteEditor(){
 if(!await isAdminSessionValid())redirect("/login");
 const {data}=await createAdminDb().from("platform_settings").select("value").eq("key","website_content").maybeSingle();
 const v=(data?.value||{}) as Record<string,string>;
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">WEBSITE CMS</div><h1>Website <em>content editor.</em></h1><p>Edit the homepage message and contact details. Publishing saves the content in the database; the public homepage must be connected to this CMS content for visitors to see updates.</p><form action={saveContent} className="portalPanel" style={{display:"grid",gap:12,maxWidth:760}}><label>Announcement banner</label><input name="announcement" defaultValue={v.announcement||""} maxLength={180} placeholder="Optional announcement across the website"/><label>Hero heading — first line</label><input name="heroLine1" defaultValue={v.heroLine1||"Turn your passion"} required/><label>Hero heading — second line</label><input name="heroLine2" defaultValue={v.heroLine2||"into"} required/><label>Hero highlighted words</label><input name="heroAccent" defaultValue={v.heroAccent||"your profession."} required/><label>Hero description</label><textarea name="heroDescription" defaultValue={v.heroDescription||"Learn the art of beauty from the basics to professional techniques. Build skills, grow your confidence and create a career you love."} rows={4}/><label>Courses section heading</label><input name="coursesHeading" defaultValue={v.coursesHeading||"Explore our courses."}/><label>Contact email</label><input name="contactEmail" type="email" defaultValue={v.contactEmail||""}/><button className="primary">Save website content</button></form></section></main>;
}
