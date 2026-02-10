// src/app/api/admin/generate-passcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import crypto from "crypto";

/**
 * Create a passcode for the current (or new) session.
 * - Ensures Passcode.sessionId is set (creates GameSession if needed).
 * - Returns { ok: true, passcode: { id, code, sessionId, expiresAt } }
 */

function makeCode(len = 6) {
  // base36 uppercase, guaranteed alpha-numeric
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

    const prisma = await getPrisma();

    // Option A: create a fresh GameSession for each passcode (isolated)
    // Option B: reuse latest session. Choose your preferred behavior.
    // I'll create a new session per passcode to avoid collision and make joins deterministic.
    const newSession = await prisma.gameSession.create({
      data: {
        // add any initial metadata your schema expects
      },
    });

    const code = makeCode(6);
    // optional: expiry in minutes
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    const passcode = await prisma.passcode.create({
      data: {
        code,
        sessionId: newSession.id,
        expiresAt,
        used: false,
        // optionally: createdByAdminId: adminPayload.userId (if schema has it)
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
// import { requireAdmin } from "@/lib/auth";

// function makePasscode(length = 6): string {
//   const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
//   let result = "";
//   for (let i = 0; i < length; i++) {
//     result += charset[Math.floor(Math.random() * charset.length)];
//   }
//   return result;
// }

// export async function POST(req: NextRequest) {
//   try {
//     // 🔐 ensure admin is authenticated
//     const admin = await requireAdmin(req);
//     if (!admin) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await req.json();
//     const { sessionId, expiresMinutes = 10 } = body ?? {};

//     const prisma = await getPrisma();

//     const code = makePasscode(6);
//     const expiresAt = new Date(Date.now() + Number(expiresMinutes) * 60_000);

//     const passcode = await prisma.passcode.create({
//       data: {
//         code,
//         createdBy: admin.id,
//         sessionId: typeof sessionId === "number" ? sessionId : undefined,
//         expiresAt,
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       passcode: passcode.code,
//       expiresAt: passcode.expiresAt,
//     });
//   } catch (err) {
//     console.error("generate-passcode error:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }
