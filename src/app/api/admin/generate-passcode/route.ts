// src/app/api/admin/generate-passcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import crypto from "crypto";

function makeCode(len = 6) {
  return crypto
    .randomBytes(Math.ceil(len * 0.6))
    .toString("base64")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, len)
    .toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get("cg_admin_session")?.value;
    if (!adminCookie)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminPayload = verifyJwt(adminCookie);
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // parse body safely
    const bodyText = await req.text();
    let body: unknown = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const questionSetIdRaw =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)["questionSetId"]
        : undefined;

    const questionSetId =
      typeof questionSetIdRaw === "number"
        ? questionSetIdRaw
        : typeof questionSetIdRaw === "string" && questionSetIdRaw.trim()
          ? Number(questionSetIdRaw)
          : undefined;

    const prisma = await getPrisma();

    // validate question set if provided
    if (questionSetId !== undefined) {
      const exists = await prisma.questionSet.findUnique({
        where: { id: questionSetId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "Invalid question set selected" },
          { status: 400 },
        );
      }
    }

    // create session with or without attached question set (explicit branches to satisfy TypeScript)
    let newSession;
    if (questionSetId !== undefined) {
      newSession = await prisma.gameSession.create({
        data: {
          questionSet: { connect: { id: questionSetId } },
        },
      });
    } else {
      newSession = await prisma.gameSession.create({
        data: {},
      });
    }

    const code = makeCode(6);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // ensure createdBy is a number | undefined
    const adminId =
      adminPayload &&
      typeof (adminPayload as { userId?: unknown }).userId === "number"
        ? (adminPayload as { userId: number }).userId
        : undefined;

    const passcode = await prisma.passcode.create({
      data: {
        code,
        sessionId: newSession.id,
        expiresAt,
        used: false,
        createdBy: adminId, // number | undefined
      },
    });

    return NextResponse.json({
      ok: true,
      passcode: {
        id: passcode.id,
        code: passcode.code,
        sessionId: passcode.sessionId,
        expiresAt: passcode.expiresAt,
      },
    });
  } catch (err) {
    console.error("generate-passcode error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
// // src/app/api/admin/generate-passcode/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getPrisma } from "@/lib/prisma";
// import { verifyJwt } from "@/lib/auth";
// import crypto from "crypto";

// /**
//  * Create a passcode for the current (or new) session.
//  * - Ensures Passcode.sessionId is set (creates GameSession if needed).
//  * - Returns { ok: true, passcode: { id, code, sessionId, expiresAt } }
//  */

// function makeCode(len = 6) {
//   // base36 uppercase, guaranteed alpha-numeric
//   return crypto
//     .randomBytes(Math.ceil(len * 0.6))
//     .toString("base64")
//     .replace(/[^A-Za-z0-9]/g, "")
//     .slice(0, len)
//     .toUpperCase();
// }

// export async function POST(req: NextRequest) {
//   try {
//     const adminCookie = req.cookies.get("cg_admin_session")?.value;
//     if (!adminCookie)
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const adminPayload = verifyJwt(adminCookie);
//     if (!adminPayload || adminPayload.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const prisma = await getPrisma();

//     // Option A: create a fresh GameSession for each passcode (isolated)
//     // Option B: reuse latest session. Choose your preferred behavior.
//     // I'll create a new session per passcode to avoid collision and make joins deterministic.
//     const newSession = await prisma.gameSession.create({
//       data: {
//         // add any initial metadata your schema expects
//       },
//     });

//     const code = makeCode(6);
//     // optional: expiry in minutes
//     const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

//     const passcode = await prisma.passcode.create({
//       data: {
//         code,
//         sessionId: newSession.id,
//         expiresAt,
//         used: false,
//         // optionally: createdByAdminId: adminPayload.userId (if schema has it)
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       passcode: {
//         id: passcode.id,
//         code: passcode.code,
//         sessionId: passcode.sessionId,
//         expiresAt: passcode.expiresAt,
//       },
//     });
//   } catch (err) {
//     console.error("generate-passcode error", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }
