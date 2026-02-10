// src/app/api/admin/join-current-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt, signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1) Verify admin cookie
    const adminCookie = req.cookies.get("cg_admin_session")?.value;
    if (!adminCookie) {
      return NextResponse.json(
        { error: "Unauthorized (no admin cookie)" },
        { status: 401 },
      );
    }

    const adminPayload = verifyJwt(adminCookie);
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized (invalid admin token)" },
        { status: 401 },
      );
    }

    const adminName =
      typeof adminPayload.name === "string"
        ? adminPayload.name
        : String(adminPayload.email ?? "Admin");

    const prisma = await getPrisma();

    // 2) Find the most recent passcode that has a sessionId
    const latestPasscode = await prisma.passcode.findFirst({
      where: { sessionId: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    // 3) Determine sessionId to join; fallback to latest GameSession if necessary
    let sessionId: number | null = null;
    if (latestPasscode && latestPasscode.sessionId) {
      sessionId = latestPasscode.sessionId;
    } else {
      // fallback to the most recent GameSession
      const latestSession = await prisma.gameSession.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (!latestSession) {
        return NextResponse.json(
          { error: "No active session found to join" },
          { status: 404 },
        );
      }
      sessionId = latestSession.id;
    }

    // 4) Create or reuse Player record for admin in this session
    let player = await prisma.player.findFirst({
      where: { sessionId, name: adminName },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          name: adminName,
          sessionId,
          joinedAt: new Date(),
        },
      });
    }

    // 5) Issue cg_user_session cookie (admin acts as a player)
    const userJwtPayload = {
      userId: player.id,
      name: player.name,
      sessionId,
    };

    const token = signJwt(userJwtPayload, "8h");

    const res = NextResponse.json({ ok: true, sessionId });
    res.headers.append(
      "Set-Cookie",
      `cg_user_session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Strict`,
    );

    return res;
  } catch (err) {
    console.error("admin/join-current-session error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
