// src/app/api/admin/attach-question-set/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

function safeParseBody(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    const body = safeParseBody(rawText);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { setId: rawSetId, sessionId: rawSessionId } = body as {
      setId?: unknown;
      sessionId?: unknown;
    };

    // auth
    const adminCookie = req.cookies.get("cg_admin_session")?.value;
    if (!adminCookie)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminPayload = verifyJwt(adminCookie);
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // validate numeric ids
    const setId = Number(rawSetId);
    const sessionId = Number(rawSessionId);
    if (!Number.isFinite(setId) || setId <= 0) {
      return NextResponse.json({ error: "Invalid setId" }, { status: 400 });
    }
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid sessionId" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();

    // ensure QuestionSet exists
    const foundSet = await prisma.questionSet.findUnique({
      where: { id: setId },
    });
    if (!foundSet) {
      return NextResponse.json(
        { error: "Question set not found" },
        { status: 404 },
      );
    }

    // ensure GameSession exists
    const foundSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    if (!foundSession) {
      return NextResponse.json(
        { error: "Game session not found" },
        { status: 404 },
      );
    }

    // attach (connect) the set to the session
    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        questionSet: {
          connect: { id: setId },
        },
      },
      include: { questionSet: true },
    });

    return NextResponse.json({
      ok: true,
      session: { id: updated.id, questionSet: updated.questionSet },
    });
  } catch (err: unknown) {
    console.error("attach-question-set error", err);
    return NextResponse.json(
      { error: "Server error attaching set" },
      { status: 500 },
    );
  }
}
