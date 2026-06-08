import { NextRequest, NextResponse } from "next/server";
import { createToken, sessionCookieOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || password !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(await createToken()));
  return res;
}
