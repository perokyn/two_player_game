// src/app/api/admin/generate-passcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function makePasscode(length = 6) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < length; i++)
    s += charset[Math.floor(Math.random() * charset.length)];
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, expiresMinutes = 10 } = await req.json();
    const code = makePasscode(6);
    const expiresAt = new Date(
      Date.now() + (Number(expiresMinutes) || 10) * 60000,
    );

    const pass = await prisma.passcode.create({
      data: {
        code,
        sessionId: sessionId ? Number(sessionId) : undefined,
        createdBy: admin.id,
        expiresAt,
      },
    });

    return NextResponse.json({ ok: true, passcode: pass.code, expiresAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
