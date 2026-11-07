import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdminSessionValid} from "@/lib/admin-session";
import {createAdminDb} from "@/lib/supabase/admin";
import PaymentsTable from "./payments-table";
export const dynamic="force-dynamic";
export default async function PaymentsPage(){
 if(!await isAdminSessionValid())redirect("/login");
 const db=createAdminDb();
 const {data:payments,error}=await db.from("payments").select("id,student_id,course_id,provider,provider_order_id,amount_paise,currency,status,created_at,paid_at").order("created_at",{ascending:false}).limit(200);
 const rows=payments||[];
 const studentIds=[...new Set(rows.map(x=>x.student_id))],courseIds=[...new Set(rows.map(x=>x.course_id))];
 const [{data:profiles},{data:courses}]=await Promise.all([
  studentIds.length?db.from("profiles").select("id,full_name").in("id",studentIds):Promise.resolve({data:[] as any[]}),
  courseIds.length?db.from("courses").select("id,title").in("id",courseIds):Promise.resolve({data:[] as any[]})
 ]);
 const names=new Map((profiles||[]).map(x=>[x.id,x.full_name||"Learner"]));
 const titles=new Map((courses||[]).map(x=>[x.id,x.title||"Course"]));
 const tableRows=rows.map(x=>({id:x.id,student_name:names.get(x.student_id)||"Learner",student_email:"",course_title:titles.get(x.course_id)||"Course",provider:x.provider,provider_order_id:x.provider_order_id,amount_paise:x.amount_paise||0,currency:x.currency,status:x.status||"unknown",created_at:x.created_at,paid_at:x.paid_at}));
 return <main className="portalPage"><header className="portalHeader"><Link href="/admin" className="brand">← ADMIN DASHBOARD</Link></header><section className="portalContent"><div className="eyebrow">FINANCE & TRANSACTIONS</div><h1>Payment <em>control centre.</em></h1><p>Search transactions, review payment states, filter by gateway and export a CSV for your records. Refunds and gateway settlement actions are not enabled yet.</p>{error&&<p className="formMessage">Payment records could not be loaded. Check the Supabase service-role configuration.</p>}<PaymentsTable rows={tableRows}/></section></main>;
}
