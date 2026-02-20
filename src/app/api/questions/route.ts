// src/app/api/session/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionParam = req.nextUrl.searchParams.get("sessionId");
    if (!sessionParam) {
      return NextResponse.json(
        { error: "Missing session id" },
        { status: 400 },
      );
    }
    const sessionId = Number(sessionParam);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        // include the attached questionSet with its questions ordered
        questionSet: {
          include: { questions: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // if no questionSet attached, return ok:true with empty questions
    const questions =
      session.questionSet?.questions?.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      questions,
      questionSetId: session.questionSet?.id ?? null,
    });
  } catch (err) {
    console.error("load session questions error", err);
    return NextResponse.json(
      { error: "Server error loading session questions" },
      { status: 500 },
    );
  }
}
