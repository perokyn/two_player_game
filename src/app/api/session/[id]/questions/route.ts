// src/app/api/session/[id]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id?: string }> },
) {
  try {
    const resolvedParams = await params;
    const idRaw = resolvedParams?.id;
    if (!idRaw) {
      return NextResponse.json(
        { error: "Missing session id" },
        { status: 400 },
      );
    }
    const sessionId = Number(idRaw);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();

    // find session and include attached questionSet + questions ordered by `order`
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        // include attached questionSet (if any) with ordered questions
        questionSet: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const qs = session.questionSet
      ? {
          id: session.questionSet.id,
          name: session.questionSet.name,
          createdAt: session.questionSet.createdAt,
          questions: (session.questionSet.questions ?? []).sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          ),
        }
      : null;

    return NextResponse.json({
      ok: true,
      questionSet: qs,
      cardCoverUrl: session.cardCoverUrl ?? null,
    });
  } catch (err) {
    console.error("session questions error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
