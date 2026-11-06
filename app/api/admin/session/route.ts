import { NextResponse } from "next/server";
import { clearAdminSession, isAdminSessionValid } from "@/lib/admin-session";
export async function GET() { return NextResponse.json({ authenticated: await isAdminSessionValid() }); }
export async function DELETE() { await clearAdminSession(); return NextResponse.json({ ok: true }); }
