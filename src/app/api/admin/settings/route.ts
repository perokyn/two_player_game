// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get("cg_admin_session")?.value;
    if (!adminCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminPayload = verifyJwt(adminCookie);
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId =
      adminPayload &&
      typeof (adminPayload as { userId?: unknown }).userId === "number"
        ? (adminPayload as { userId: number }).userId
        : undefined;

    if (!adminId) {
      return NextResponse.json({ error: "Invalid admin user ID" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Fetch user settings
    const user = await prisma.user.findUnique({
      where: { id: adminId },
      select: { cardCoverUrl: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Optionally check if we have a specific or active session ID
    const url = new URL(req.url);
    const sessionIdParam = url.searchParams.get("sessionId");
    let targetSessionId = sessionIdParam ? Number(sessionIdParam) : null;

    if (!targetSessionId || isNaN(targetSessionId)) {
      // Find latest passcode session as fallback
      const latestPasscode = await prisma.passcode.findFirst({
        where: { sessionId: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (latestPasscode && latestPasscode.sessionId) {
        targetSessionId = latestPasscode.sessionId;
      }
    }

    let sessionCardCoverUrl: string | null = null;
    if (targetSessionId && !isNaN(targetSessionId)) {
      const session = await prisma.gameSession.findUnique({
        where: { id: targetSessionId },
        select: { cardCoverUrl: true },
      });
      if (session) {
        sessionCardCoverUrl = session.cardCoverUrl;
      }
    }

    return NextResponse.json({
      ok: true,
      defaultCardCoverUrl: user.cardCoverUrl ?? null,
      sessionCardCoverUrl,
      sessionId: targetSessionId,
    });
  } catch (err) {
    console.error("GET settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get("cg_admin_session")?.value;
    if (!adminCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminPayload = verifyJwt(adminCookie);
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId =
      adminPayload &&
      typeof (adminPayload as { userId?: unknown }).userId === "number"
        ? (adminPayload as { userId: number }).userId
        : undefined;

    if (!adminId) {
      return NextResponse.json({ error: "Invalid admin user ID" }, { status: 400 });
    }

    const bodyText = await req.text();
    let body: unknown = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const cardCoverUrl =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)["cardCoverUrl"]
        : undefined;

    const sessionIdParam =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)["sessionId"]
        : undefined;

    const sessionId = sessionIdParam ? Number(sessionIdParam) : undefined;

    if (cardCoverUrl !== undefined && cardCoverUrl !== null && typeof cardCoverUrl !== "string") {
      return NextResponse.json({ error: "cardCoverUrl must be a string or null" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // 1. Update Counselor's default cardCoverUrl
    const updatedUser = await prisma.user.update({
      where: { id: adminId },
      data: {
        cardCoverUrl: cardCoverUrl ? cardCoverUrl.trim() : null,
      },
    });

    // 2. If a sessionId is provided/active, update the GameSession record too
    let updatedSession = null;
    if (sessionId && !isNaN(sessionId)) {
      const exists = await prisma.gameSession.findUnique({
        where: { id: sessionId },
      });
      if (exists) {
        updatedSession = await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            cardCoverUrl: cardCoverUrl ? cardCoverUrl.trim() : null,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      cardCoverUrl: updatedUser.cardCoverUrl,
      sessionCardCoverUrl: updatedSession?.cardCoverUrl ?? null,
      sessionId: sessionId ?? null,
    });
  } catch (err) {
    console.error("POST settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
