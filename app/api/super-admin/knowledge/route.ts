import {NextRequest,NextResponse} from "next/server";
import {currentAdminIdentity} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
async function owner(){const identity=await currentAdminIdentity();return identity?.isSuperAdmin&&identity.profile.role==="admin"?identity:null;}
const clean=(v:unknown,max:number)=>String(v??"").trim().slice(0,max);
function valid(body:any){return !!clean(body.category,80)&&clean(body.question,240).length>=3&&clean(body.answer,5000).length>=3;}
export async function GET(){
 const identity=await owner();if(!identity)return NextResponse.json({error:"Super admin access required."},{status:403});
 const {data,error}=await createAdminDb().from("duku_ai_knowledge_base").select("*").order("sort_order").order("updated_at",{ascending:false}).limit(500);
 if(error)return NextResponse.json({error:"Could not load knowledge entries."},{status:500});
 return NextResponse.json({entries:data||[]});
}
export async function POST(req:NextRequest){
 const identity=await owner();if(!identity)return NextResponse.json({error:"Super admin access required."},{status:403});
 try{const body=await req.json();if(!valid(body))return NextResponse.json({error:"Add a category, a question and an answer."},{status:400});
 const keywords=Array.isArray(body.keywords)?body.keywords.map((x:unknown)=>clean(x,50).toLowerCase()).filter(Boolean).slice(0,20):[];
 const {data,error}=await createAdminDb().from("duku_ai_knowledge_base").insert({category:clean(body.category,80),question:clean(body.question,240),answer:clean(body.answer,5000),keywords,is_published:!!body.is_published,sort_order:Number.isFinite(Number(body.sort_order))?Math.max(-10000,Math.min(10000,Number(body.sort_order))):0,created_by:identity.user.id,updated_by:identity.user.id}).select("*").single();
 if(error)throw error;return NextResponse.json({entry:data});
 }catch{return NextResponse.json({error:"Could not save this knowledge entry."},{status:500});}
}
export async function PATCH(req:NextRequest){
 const identity=await owner();if(!identity)return NextResponse.json({error:"Super admin access required."},{status:403});
 try{const body=await req.json(),id=clean(body.id,80);if(!id||!valid(body))return NextResponse.json({error:"Check the entry details."},{status:400});
 const keywords=Array.isArray(body.keywords)?body.keywords.map((x:unknown)=>clean(x,50).toLowerCase()).filter(Boolean).slice(0,20):[];
 const {data,error}=await createAdminDb().from("duku_ai_knowledge_base").update({category:clean(body.category,80),question:clean(body.question,240),answer:clean(body.answer,5000),keywords,is_published:!!body.is_published,sort_order:Number.isFinite(Number(body.sort_order))?Math.max(-10000,Math.min(10000,Number(body.sort_order))):0,updated_by:identity.user.id,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
 if(error||!data)throw error||new Error("Not found");return NextResponse.json({entry:data});
 }catch{return NextResponse.json({error:"Could not update this knowledge entry."},{status:500});}
}
export async function DELETE(req:NextRequest){
 const identity=await owner();if(!identity)return NextResponse.json({error:"Super admin access required."},{status:403});
 const id=clean(req.nextUrl.searchParams.get("id"),80);if(!id)return NextResponse.json({error:"Entry ID is required."},{status:400});
 const {error}=await createAdminDb().from("duku_ai_knowledge_base").delete().eq("id",id);if(error)return NextResponse.json({error:"Could not delete this entry."},{status:500});
 return NextResponse.json({ok:true});
}
