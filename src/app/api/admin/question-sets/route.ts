// src/app/api/admin/question-sets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const MAX_QUESTION_LEN = 1000;
const MAX_QUESTIONS = 200;

function safeParseBody(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // read text once then parse safely
    const rawText = await req.text();
    const body = safeParseBody(rawText);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { name: rawName, questions: rawQuestions } = body as {
      name?: unknown;
      questions?: unknown;
    };

    // name validation
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return NextResponse.json({ error: "Missing set name" }, { status: 400 });
    }
    const name = rawName.trim();

    // questions validation + normalization
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return NextResponse.json(
        { error: "Questions must be a non-empty array" },
        { status: 400 },
      );
    }

    // sanitize each question: coerce to string, trim, drop empties
    const questions: string[] = rawQuestions
      .map((q: unknown) =>
        typeof q === "string" ? q.trim() : String(q ?? "").trim(),
      )
      .filter((q) => q.length > 0)
      .slice(0, MAX_QUESTIONS) // enforce a hard limit for safety
      .map((q) =>
        q.length > MAX_QUESTION_LEN ? q.slice(0, MAX_QUESTION_LEN) : q,
      );

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions provided" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();

    const created = await prisma.questionSet.create({
      data: {
        name,
        createdAt: new Date(),
        questions: {
          create: questions.map((text, idx) => ({
            text,
            order: idx,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ ok: true, set: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("save question set error", err);
    return NextResponse.json(
      { error: "Server error saving set" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    const idParam = req.nextUrl.searchParams.get("id");

    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }

      const found = await prisma.questionSet.findUnique({
        where: { id },
        include: { questions: { orderBy: { order: "asc" } } },
      });

      if (!found)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, set: found });
    }

    // list sets (metadata) ordered by createdAt desc
    const sets = await prisma.questionSet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      take: 200,
    });

    // normalize to useful summary shape
    const summary = sets.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      questionCount: s._count.questions,
    }));

    return NextResponse.json({ ok: true, sets: summary });
  } catch (err: unknown) {
    console.error("list question sets error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// // src/app/api/admin/question-sets/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getPrisma } from "@/lib/prisma";

// const MAX_QUESTION_LEN = 1000;
// const MAX_QUESTIONS = 200;

// function safeParseBody(text: string) {
//   try {
//     return text ? JSON.parse(text) : {};
//   } catch {
//     return null;
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     // read text once then parse safely
//     const rawText = await req.text();
//     const body = safeParseBody(rawText);
//     if (body === null) {
//       return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//     }

//     const { name: rawName, questions: rawQuestions } = body as {
//       name?: unknown;
//       questions?: unknown;
//     };

//     // name validation
//     if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
//       return NextResponse.json({ error: "Missing set name" }, { status: 400 });
//     }
//     const name = rawName.trim();

//     // questions validation + normalization
//     if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
//       return NextResponse.json(
//         { error: "Questions must be a non-empty array" },
//         { status: 400 },
//       );
//     }

//     // sanitize each question: coerce to string, trim, drop empties
//     const questions: string[] = rawQuestions
//       .map((q: unknown) =>
//         typeof q === "string" ? q.trim() : String(q ?? "").trim(),
//       )
//       .filter((q) => q.length > 0)
//       .slice(0, MAX_QUESTIONS) // enforce a hard limit for safety
//       .map((q) =>
//         q.length > MAX_QUESTION_LEN ? q.slice(0, MAX_QUESTION_LEN) : q,
//       );

//     if (questions.length === 0) {
//       return NextResponse.json(
//         { error: "No valid questions provided" },
//         { status: 400 },
//       );
//     }

//     const prisma = await getPrisma();

//     const created = await prisma.questionSet.create({
//       data: {
//         name,
//         createdAt: new Date(),
//         questions: {
//           create: questions.map((text, idx) => ({
//             text,
//             order: idx,
//           })),
//         },
//       },
//       include: { questions: true },
//     });

//     return NextResponse.json({ ok: true, set: created }, { status: 201 });
//   } catch (err: unknown) {
//     console.error("save question set error", err);
//     return NextResponse.json(
//       { error: "Server error saving set" },
//       { status: 500 },
//     );
//   }
// }
