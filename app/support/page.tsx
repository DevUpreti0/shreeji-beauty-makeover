import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import DukuAiSupport from "@/app/components/duku-ai-support";

export const dynamic = "force-dynamic";

export default async function CustomerSupportPage() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/support");

  const db = createSupabaseAdminClient();
  const { data: threads } = await db
    .from("support_conversations")
    .select("id,subject,status,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const ids = (threads || []).map((thread) => thread.id);
  const { data: messages } = ids.length
    ? await db.from("support_messages")
        .select("id,conversation_id,sender_id,body,created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  return (
    <main className="portalPage">
      <header className="portalHeader">
        <Link href="/student" className="brand">← MY LEARNING</Link>
        <Link href="/" className="brand">SHREEJI <b>BEAUTY MAKEOVER</b></Link>
      </header>
      <section className="portalContent" style={{ maxWidth: 900 }}>
        <div className="eyebrow">CUSTOMER CARE / DUku AI</div>
        <h1>Help & <em>support.</em></h1>
        <p>Ask DuKu AI for instant answers or review your conversations with our support team.</p>
        <div className="portalPanel" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: "0 0 5px" }}>Your support requests</h2>
              <small>Replies from our team are shown here.</small>
            </div>
            <span className="outline">{threads?.length || 0} tickets</span>
          </div>
          {(threads || []).length ? (
            (threads || []).map((thread) => (
              <article key={thread.id} style={{ padding: "17px 0", borderTop: "1px solid #8883", marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <b>{thread.subject}</b>
                  <span className="eyebrow">{thread.status.toUpperCase()}</span>
                </div>
                <small>Updated {new Date(thread.updated_at).toLocaleString("en-IN")}</small>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {(messages || []).filter((message) => message.conversation_id === thread.id).map((message) => (
                    <div key={message.id} style={{ padding: 11, borderRadius: 9, background: message.sender_id === user.id ? "#c6a56a16" : "#8882", fontSize: 12 }}>
                      <b>{message.sender_id === user.id ? "YOU" : "SHREEJI SUPPORT"}</b>
                      <p style={{ whiteSpace: "pre-wrap", margin: "5px 0 0" }}>{message.body}</p>
                      <small>{new Date(message.created_at).toLocaleString("en-IN")}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p style={{ marginTop: 18 }}>You have not contacted the support team yet. Open DuKu AI to ask a question or request a person.</p>
          )}
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 18 }}>Need help now? Use the DuKu AI button in the corner to get instant answers or create a support request.</p>
      </section>
      <DukuAiSupport />
    </main>
  );
}
