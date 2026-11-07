import {redirect} from "next/navigation";
import Link from "next/link";
import {createSupabaseServerClient} from "@/lib/supabase-server";
import ChatWorkspace from "./chat-workspace";
export const dynamic="force-dynamic";
export default async function ChatPage({searchParams}:{searchParams:Promise<{conversationId?:string}>}){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await sb.from("profiles").select("full_name,role").eq("id",user.id).maybeSingle();if(!profile)redirect("/login");const params=await searchParams;
 return <main className="portalPage"><header className="portalHeader"><Link href={profile.role==="admin"?"/admin":profile.role==="teacher"?"/teacher":"/student"} className="brand">← DASHBOARD</Link><span className="outline">DUKU CHAT · {profile.role?.toUpperCase()}</span><Link href="/profile" className="outline">My profile</Link></header><section className="portalContent" style={{maxWidth:1120}}><div className="eyebrow">PRIVATE MESSAGING</div><h1>DuKu <em>Chat.</em></h1><p>Chat privately with students, teachers and administrators.</p><ChatWorkspace currentUserId={user.id} initialConversationId={params.conversationId||""}/></section></main>;
}
