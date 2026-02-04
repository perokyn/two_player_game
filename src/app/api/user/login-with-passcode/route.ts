// src/app/api/user/login-with-passcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt, setCookie } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { code, name } = await req.json();
    if (!code)
      return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const pass = await prisma.passcode.findUnique({ where: { code } });
    if (!pass)
      return NextResponse.json({ error: "Invalid passcode" }, { status: 400 });
    if (pass.used)
      return NextResponse.json(
        { error: "Passcode already used" },
        { status: 400 },
      );
    if (pass.expiresAt.getTime() < Date.now())
      return NextResponse.json({ error: "Passcode expired" }, { status: 400 });

    const playerName =
      name?.trim() || `Player${Math.floor(Math.random() * 10000)}`;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.passcode.update({
        where: { id: pass.id },
        data: { used: true },
      });
      await tx.player.create({
        data: {
          name: playerName,
          sessionId: pass.sessionId ?? 0,
        },
      });
    });

    const token = signJwt({ name: playerName, passcodeId: pass.id }, "2h");
    const res = NextResponse.json({ ok: true, name: playerName });
    setCookie(res, "cg_user_session", token, 2 * 3600);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
