import {NextResponse} from "next/server";import {createSupabaseServerClient} from "@/lib/supabase-server";
export const dynamic="force-dynamic";
export async function GET(){try{const db=await createSupabaseServerClient();const {data,error}=await db.from("courses").select("id,title,description,category,level,price_paise,status").eq("status","published").order("created_at",{ascending:false}).limit(100);if(error)throw error;return NextResponse.json({courses:data||[]},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({courses:[]},{headers:{"Cache-Control":"no-store"}});}}
