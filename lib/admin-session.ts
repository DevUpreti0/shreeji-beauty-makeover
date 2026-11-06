import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const COOKIE = "shreeji_admin_session";
const ISSUER = "shreeji-beauty-makeover";
function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Admin session secret is not configured.");
  return new TextEncoder().encode(value);
}
export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER).setSubject("dukubusiness")
    .setIssuedAt().setExpirationTime("8h").sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 });
}
export async function isAdminSessionValid() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
    return payload.role === "admin" && payload.sub === "dukubusiness";
  } catch { return false; }
}
export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
