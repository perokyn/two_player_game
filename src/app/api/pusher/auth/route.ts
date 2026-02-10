// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { verifyJwt } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

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

// parseAuthBody helper: robustly handles x-www-form-urlencoded (pusher-js) OR JSON
async function parseAuthBody(req: NextRequest) {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  // If form-encoded (what pusher client sends), parse URLSearchParams
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("application/x-www-form-urlencoded;charset=utf-8")
  ) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return {
      socket_id: params.get("socket_id") ?? undefined,
      channel_name: params.get("channel_name") ?? undefined,
    };
  }

  // If JSON, try JSON first
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      // fall through to text parse below
    }
  }

  // fallback: try to parse text as URLSearchParams (covers some clients)
  const txt = await req.text();
  const params = new URLSearchParams(txt);
  if (params.has("socket_id") || params.has("channel_name")) {
    return {
      socket_id: params.get("socket_id") ?? undefined,
      channel_name: params.get("channel_name") ?? undefined,
    };
  }

  // nothing parsed
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseAuthBody(req);
    if (!body) {
      return NextResponse.json(
        { error: "Bad request: cannot parse body" },
        { status: 400 },
      );
    }

    const { socket_id, channel_name } = body as {
      socket_id?: string;
      channel_name?: string;
    };

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 },
      );
    }

    // read user cookie and verify
    const cookie = req.cookies.get("cg_user_session")?.value;
    if (!cookie) {
      return NextResponse.json(
        { error: "Unauthorized (no cookie)" },
        { status: 401 },
      );
    }

    const payload = verifyJwt(cookie);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized (invalid token)" },
        { status: 401 },
      );
    }

    const sessionId =
      typeof payload["sessionId"] === "number"
        ? payload["sessionId"]
        : Number(payload["sessionId"] ?? NaN);
    const playerName =
      typeof payload["name"] === "string"
        ? payload["name"]
        : String(payload["name"] ?? "Unknown");

    let user_id = `session:${sessionId || "anon"}:${playerName}`;

    try {
      if (!Number.isNaN(sessionId)) {
        const prisma = await getPrisma();
        const player = await prisma.player.findFirst({
          where: { sessionId: sessionId, name: playerName },
          select: { id: true },
        });
        if (player && typeof player.id === "number") {
          user_id = String(player.id);
        } else {
          user_id = `session:${sessionId}:${playerName}`;
        }
      }
    } catch (dbErr) {
      console.warn(
        "pusher auth: player DB lookup failed, falling back to payload-based id",
        dbErr,
      );
    }

    const user_info = { name: playerName };

    const authResponse = pusherServer.authenticate(socket_id, channel_name, {
      user_id,
      user_info,
    });

    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("pusher/auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
