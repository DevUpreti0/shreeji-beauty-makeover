import { scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-session";
export const runtime = "nodejs";
function verifyPassword(candidate: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = scryptSync(candidate, Buffer.from(salt, "hex"), 64);
  const expected = Buffer.from(expectedHex, "hex");
  return timingSafeEqual(actual, expected);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? "");
    const password = String(body?.password ?? "");
    const expectedId = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!expectedId || !passwordHash || !process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ error: "Admin credentials are not fully configured on the server." }, { status: 503 });
    }
    const idOk = timingSafeEqual(Buffer.from(id.padEnd(128, "\0").slice(0,128)), Buffer.from(expectedId.padEnd(128, "\0").slice(0,128)));
    if (!idOk || !verifyPassword(password, passwordHash)) return NextResponse.json({ error: "Invalid admin ID or password." }, { status: 401 });
    await createAdminSession();
    return NextResponse.json({ ok: true, redirect: "/admin" });
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
