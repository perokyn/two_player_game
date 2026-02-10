// src/app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("cg_user_session")?.value;
    if (!cookie) return NextResponse.json({ ok: false }, { status: 401 });

    const payload = verifyJwt(cookie);
    if (!payload) return NextResponse.json({ ok: false }, { status: 401 });

    // payload includes passcodeId, name, sessionId (if you signed that way)
    const userName =
      typeof payload["name"] === "string" ? payload["name"] : null;
    const sessionId =
      typeof payload["sessionId"] === "number"
        ? payload["sessionId"]
        : Number(payload["sessionId"] ?? null);

    // Optionally fetch DB records if you need more info (e.g., player id)
    if (sessionId) {
      const prisma = await getPrisma();
      // find the player record if you want player's DB id etc.
      const player = await prisma.player.findFirst({
        where: { name: userName ?? "", sessionId },
      });
      return NextResponse.json({
        ok: true,
        name: userName,
        sessionId,
        playerId: player?.id ?? null,
      });
    }

    return NextResponse.json({
      ok: true,
      name: userName,
      sessionId: sessionId ?? null,
    });
  } catch (err) {
    console.error("user/me error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
