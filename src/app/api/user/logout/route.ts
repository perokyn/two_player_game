// src/app/api/user/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // expire cookie
  res.headers.append(
    "Set-Cookie",
    `cg_user_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
  );
  return res;
}
