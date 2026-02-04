// src/app/api/pusher/route.ts
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID as string,
  key: process.env.PUSHER_KEY as string,
  secret: process.env.PUSHER_SECRET as string,
  cluster: process.env.PUSHER_CLUSTER as string,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, event, payload } = body ?? {};

    if (!gameId || !event) {
      return NextResponse.json(
        { error: "Missing gameId or event" },
        { status: 400 },
      );
    }

    const channel = `game-${String(gameId)}`;

    await pusher.trigger(channel, event, payload ?? {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Pusher trigger error:", err);
    return NextResponse.json(
      { error: "Pusher trigger failed" },
      { status: 500 },
    );
  }
}
