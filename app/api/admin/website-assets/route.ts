import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {canAdminAccess} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!await canAdminAccess("website"))return NextResponse.json({error:"Admin access required."},{status:401});
 try{
  const form=await req.formData();const file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Choose an image file."},{status:400});
  const allowed=["image/jpeg","image/png","image/webp","image/gif"];if(!allowed.includes(file.type))return NextResponse.json({error:"Only JPG, PNG, WEBP and GIF images are supported."},{status:415});
  if(file.size>5*1024*1024)return NextResponse.json({error:"Image must be 5 MB or smaller."},{status:413});
  const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"} as Record<string,string>)[file.type];
  const path="website/"+Date.now()+"-"+randomUUID()+"."+ext;const db=createAdminDb();
  const {error}=await db.storage.from("site-assets").upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false,cacheControl:"31536000"});if(error)throw error;
  const {data}=db.storage.from("site-assets").getPublicUrl(path);return NextResponse.json({url:data.publicUrl});
 }catch{return NextResponse.json({error:"Image upload failed. Check that the site-assets storage bucket is configured."},{status:500});}
}
