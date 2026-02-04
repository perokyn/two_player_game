// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signJwt, setCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 },
      );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "admin")
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );

    const ok = await verifyPassword(password, user.password);
    if (!ok)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );

    const token = signJwt({ userId: user.id, role: user.role }, "8h");
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
    });
    setCookie(res, "cg_admin_session", token, 8 * 3600);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
