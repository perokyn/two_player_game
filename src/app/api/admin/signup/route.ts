// src/app/api/admin/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, signJwt, setCookie } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    const { email, password, name } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: "User exists" }, { status: 400 });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: "admin" },
    });

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
