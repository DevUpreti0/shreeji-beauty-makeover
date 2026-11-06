import {NextRequest,NextResponse} from "next/server";
import {isAdminSessionValid} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
import {revalidatePath} from "next/cache";
export const runtime="nodejs";
const maxText=(v:any,n:number)=>String(v??"").trim().slice(0,n);
export async function PUT(req:NextRequest){
 if(!await isAdminSessionValid())return NextResponse.json({error:"Admin access required."},{status:401});
 try{
  const b=await req.json();
  const pages=Array.isArray(b.pages)?b.pages.slice(0,30).map((p:any)=>({id:maxText(p.id,80),slug:maxText(p.slug,70).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/^-|-$/g,""),title:maxText(p.title,120),description:maxText(p.description,500),body:maxText(p.body,12000),imageUrl:maxText(p.imageUrl,1000),published:p.published===true})).filter((p:any)=>p.slug&&p.title):[];
  const sections=Array.isArray(b.customSections)?b.customSections.slice(0,20).map((s:any)=>({id:maxText(s.id,80),kind:["content","image","callout"].includes(s.kind)?s.kind:"content",title:maxText(s.title,160),body:maxText(s.body,3000),imageUrl:maxText(s.imageUrl,1000),ctaText:maxText(s.ctaText,80),ctaUrl:maxText(s.ctaUrl,500),visible:s.visible!==false})): [];
  const features=Array.isArray(b.features)?b.features.slice(0,8).map((f:any)=>({title:maxText(f.title,100),body:maxText(f.body,500)})):[];
  const navItems=Array.isArray(b.navItems)?b.navItems.slice(0,8).map((x:any)=>maxText(x,40)).filter(Boolean):["Home","Courses","About","Contact"];
  const value={
   brandName:maxText(b.brandName,100),brandTagline:maxText(b.brandTagline,120),logoUrl:maxText(b.logoUrl,1000),announcement:maxText(b.announcement,240),
   heroLine1:maxText(b.heroLine1,120),heroLine2:maxText(b.heroLine2,120),heroAccent:maxText(b.heroAccent,120),heroDescription:maxText(b.heroDescription,800),heroImageUrl:maxText(b.heroImageUrl,1000),heroCtaText:maxText(b.heroCtaText,80),heroCtaUrl:maxText(b.heroCtaUrl,500),
   coursesHeading:maxText(b.coursesHeading,160),coursesDescription:maxText(b.coursesDescription,500),featureHeading:maxText(b.featureHeading,180),featureDescription:maxText(b.featureDescription,800),
   aboutHeading:maxText(b.aboutHeading,160),aboutDescription:maxText(b.aboutDescription,1000),contactHeading:maxText(b.contactHeading,160),contactDescription:maxText(b.contactDescription,1000),contactEmail:maxText(b.contactEmail,180),footerTagline:maxText(b.footerTagline,180),
   primaryColor:/^#[0-9a-fA-F]{6}$/.test(b.primaryColor)?b.primaryColor:"#a75e51",backgroundColor:/^#[0-9a-fA-F]{6}$/.test(b.backgroundColor)?b.backgroundColor:"#faf7f2",textColor:/^#[0-9a-fA-F]{6}$/.test(b.textColor)?b.textColor:"#332a26",
   navItems,features,customSections:sections,pages
  };
  const db=createAdminDb();const {error}=await db.from("platform_settings").upsert({key:"website_content",value,updated_at:new Date().toISOString()},{onConflict:"key"});if(error)throw error;
  revalidatePath("/");revalidatePath("/admin/website");revalidatePath("/pages/[slug]","page");
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:"Could not publish website content. Please retry."},{status:500});}
}
