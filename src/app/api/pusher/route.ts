// src/app/api/pusher/route.ts
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
  process.env;

if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
  throw new Error("Missing one or more required Pusher environment variables");
}

const pusherServer = new Pusher({
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * POST /api/pusher/route
 * Body expected (JSON):
 * { channel: string, event: string, data: any }
 *
 * For development you can call this to broadcast events to clients.
 * In production you should guard this endpoint (require admin or signed requests).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

    let body: { channel?: string; event?: string; data?: unknown } | null =
      null;
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // try to parse text as JSON fallback
      const txt = await req.text();
      try {
        body = JSON.parse(txt);
      } catch {
        // last resort: fail
        return NextResponse.json(
          { error: "Unsupported content type or invalid body" },
          { status: 400 },
        );
      }
    }

    const { channel, event, data } = body ?? {};

    if (!channel || typeof channel !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid channel" },
        { status: 400 },
      );
    }
    if (!event || typeof event !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid event" },
        { status: 400 },
      );
    }

    // Optionally: require an admin cookie / JWT here for safety in production
    // e.g. verify JWT from cookie, or check Authorization header.

    // Trigger the event
    await pusherServer.trigger(channel, event, data ?? {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pusher trigger error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// // src/app/api/pusher/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import Pusher from "pusher";

// const pusher = new Pusher({
//   appId: process.env.PUSHER_APP_ID as string,
//   key: process.env.PUSHER_KEY as string,
//   secret: process.env.PUSHER_SECRET as string,
//   cluster: process.env.PUSHER_CLUSTER as string,
//   useTLS: true,
// });

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { gameId, event, payload } = body ?? {};

//     if (!gameId || !event) {
//       return NextResponse.json(
//         { error: "Missing gameId or event" },
//         { status: 400 },
//       );
//     }

//     const channel = `game-${String(gameId)}`;

//     await pusher.trigger(channel, event, payload ?? {});

//     return NextResponse.json({ ok: true });
//   } catch (err) {
//     console.error("Pusher trigger error:", err);
//     return NextResponse.json(
//       { error: "Pusher trigger failed" },
//       { status: 500 },
//     );
//   }
// }
