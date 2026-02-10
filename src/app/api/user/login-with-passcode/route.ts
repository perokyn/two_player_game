// src/app/api/user/login-with-passcode/route.ts
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { signJwt, setCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name } = body ?? {};

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing passcode" },
        { status: 400 },
      );
    }

    const prisma = await getPrisma();

    const passcode = await prisma.passcode.findUnique({
      where: { code },
    });

    if (!passcode) {
      return NextResponse.json(
        { error: "Passcode not found" },
        { status: 404 },
      );
    }

    if (passcode.used) {
      return NextResponse.json(
        { error: "Passcode already used" },
        { status: 400 },
      );
    }

    if (passcode.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Passcode expired" }, { status: 400 });
    }

    const playerName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : `Player${Math.floor(Math.random() * 10000)}`;

    // Transaction: mark passcode used, ensure session exists (create if missing), create player
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // mark passcode used
        await tx.passcode.update({
          where: { id: passcode.id },
          data: { used: true },
        });

        // determine sessionId to use: if passcode.sessionId exists, use it.
        // otherwise create a new GameSession and use its id
        let sessionIdToUse = passcode.sessionId ?? null;

        if (sessionIdToUse === null || sessionIdToUse === undefined) {
          const newSession = await tx.gameSession.create({
            data: {
              title: `Session for ${playerName}`,
              createdAt: new Date(),
            },
          });
          sessionIdToUse = newSession.id;
        } else {
          // Optional: confirm session exists to avoid FK violation
          const existing = await tx.gameSession.findUnique({
            where: { id: sessionIdToUse },
          });
          if (!existing) {
            // If session referenced by passcode doesn't exist, create a new session instead
            const newSession = await tx.gameSession.create({
              data: {
                title: `Session (recreated) for ${playerName}`,
                createdAt: new Date(),
              },
            });
            sessionIdToUse = newSession.id;
          }
        }

        // create the player linked to a valid sessionId
        const player = await tx.player.create({
          data: {
            name: playerName,
            sessionId: sessionIdToUse,
          },
        });

        return { player, sessionId: sessionIdToUse };
      },
    );

    const token = signJwt(
      {
        name: playerName,
        passcodeId: passcode.id,
        sessionId: result.sessionId,
      },
      "2h",
    );

    const res = NextResponse.json({
      ok: true,
      name: playerName,
      sessionId: result.sessionId,
    });
    setCookie(res, "cg_user_session", token, 2 * 60 * 60);
    return res;
  } catch (err: unknown) {
    console.error("login-with-passcode error:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma error code:", err.code, err.meta ?? {});
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// // src/app/api/user/login-with-passcode/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getPrisma } from "@/lib/prisma";
// import { signJwt, setCookie } from "@/lib/auth";

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { code, name } = body ?? {};

//     if (!code || typeof code !== "string") {
//       return NextResponse.json(
//         { error: "Invalid or missing passcode" },
//         { status: 400 },
//       );
//     }

//     const prisma = await getPrisma();

//     const passcode = await prisma.passcode.findUnique({
//       where: { code },
//     });

//     if (!passcode) {
//       return NextResponse.json(
//         { error: "Passcode not found" },
//         { status: 404 },
//       );
//     }

//     if (passcode.used) {
//       return NextResponse.json(
//         { error: "Passcode already used" },
//         { status: 400 },
//       );
//     }

//     if (passcode.expiresAt < new Date()) {
//       return NextResponse.json({ error: "Passcode expired" }, { status: 400 });
//     }

//     const playerName =
//       typeof name === "string" && name.trim().length > 0
//         ? name.trim()
//         : `Player${Math.floor(Math.random() * 10000)}`;

//     await prisma.$transaction(async (tx) => {
//       await tx.passcode.update({
//         where: { id: passcode.id },
//         data: { used: true },
//       });

//       await tx.player.create({
//         data: {
//           name: playerName,
//           sessionId: passcode.sessionId ?? 0,
//         },
//       });
//     });

//     const token = signJwt({ name: playerName, passcodeId: passcode.id }, "2h");

//     const res = NextResponse.json({ ok: true, name: playerName });
//     setCookie(res, "cg_user_session", token, 2 * 60 * 60);
//     return res;
//   } catch (err) {
//     console.error("login-with-passcode error:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }
