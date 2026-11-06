import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
function digest(value: string) { return createHash("sha256").update(value, "utf8").digest(); }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? "");
    const password = String(body?.password ?? "");
    const expectedId = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedId || !expectedPassword || !process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ error: "Admin credentials are not configured on the server." }, { status: 503 });
    }
    const idOk = timingSafeEqual(digest(id), digest(expectedId));
    const passwordOk = timingSafeEqual(digest(password), digest(expectedPassword));
    if (!idOk || !passwordOk) return NextResponse.json({ error: "Invalid admin ID or password." }, { status: 401 });
    await createAdminSession();
    return NextResponse.json({ ok: true, redirect: "/admin" });
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
