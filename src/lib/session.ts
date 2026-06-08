import { cookies } from "next/headers";

const COOKIE = "cl_session";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET env var is not set");
  return s;
}

async function getKey(usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function createToken(): Promise<string> {
  const payload = btoa(JSON.stringify({ iat: Date.now() }));
  const key = await getKey(["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let sigBuffer: ArrayBuffer;
  try {
    const chars = Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    sigBuffer = new Uint8Array(chars).buffer as ArrayBuffer;
  } catch {
    return false;
  }

  try {
    const key = await getKey(["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, sigBuffer, new TextEncoder().encode(payload));
    if (!valid) return false;
    const { iat } = JSON.parse(atob(payload));
    return Date.now() - iat < TTL_MS;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_MS / 1000,
  };
}

export function clearCookieOptions() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
