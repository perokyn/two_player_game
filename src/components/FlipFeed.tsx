// components/FlipFeed.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Pusher, { Channel } from "pusher-js";

type FlipEvent = {
  who: string;
  card: string;
  ts: string; // ISO
};

export default function FlipFeed({
  sessionId,
}: {
  sessionId: number | string | null;
}) {
  const [flips, setFlips] = useState<FlipEvent[]>([]);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  // read env (bundled at build time)
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";

  useEffect(() => {
    // nothing to do yet if misconfigured or no session
    if (!sessionId || !key || !cluster) return;

    // create pusher client
    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      forceTLS: true,
    });
    pusherRef.current = pusher;

    const channelName = `presence-game-${sessionId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // receive card-flip events
    const onFlip = (data: unknown) => {
      try {
        // defensive parsing
        const payload = data as
          | { who?: string; card?: string; ts?: string }
          | string;
        let who = "Unknown";
        let card = "unknown";
        if (typeof payload === "string") {
          // if server sent string
          try {
            const parsed = JSON.parse(payload);
            who = String(parsed.who ?? "Unknown");
            card = String(parsed.card ?? "unknown");
          } catch {
            who = payload;
          }
        } else if (payload && typeof payload === "object") {
          const obj = data as Record<string, unknown>;
          if (typeof obj.who === "string") who = obj.who;
          if (typeof obj.card === "string") card = obj.card;
        }
        const event: FlipEvent = { who, card, ts: new Date().toISOString() };

        setFlips((prev) => {
          const next = [event, ...prev].slice(0, 10);
          return next;
        });
      } catch (err) {
        // ignore malformed payloads
        // eslint-disable-next-line no-console
        console.warn("FlipFeed: malformed card-flip payload", err);
      }
    };

    channel.bind("card-flip", onFlip);

    // cleanup
    return () => {
      try {
        if (channelRef.current) {
          channel.unbind("card-flip", onFlip);
          pusher.unsubscribe(channelName);
        }
        pusher.disconnect();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("FlipFeed cleanup error", e);
      } finally {
        pusherRef.current = null;
        channelRef.current = null;
      }
    };
  }, [sessionId, key, cluster]);

  // auto remove older items after a minute (UI-only)
  useEffect(() => {
    if (flips.length === 0) return;
    const timers = flips.map(
      (f, i) =>
        setTimeout(() => {
          setFlips((prev) => prev.filter((x) => x.ts !== f.ts));
        }, 60_000), // 60s
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [flips]);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        width: 360,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <strong>Recent flips</strong>
        <small style={{ color: "#6b7280" }}>{flips.length}</small>
      </div>

      {flips.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: 14 }}>
          No flips yet — try clicking “Broadcast card-flip”
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {flips.map((f) => (
            <li
              key={f.ts}
              style={{
                background: "#fff",
                border: "1px solid #edf2f7",
                padding: "8px 10px",
                borderRadius: 6,
                boxShadow: "0 1px 0 rgba(15,23,42,0.02)",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ marginRight: 6 }}>{f.who}</strong>
                  <span style={{ color: "#374151" }}>flipped</span>
                  <code
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      background: "#f3f4f6",
                      borderRadius: 4,
                    }}
                  >
                    {f.card}
                  </code>
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>
                  {new Date(f.ts).toLocaleTimeString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={() => setFlips([])}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Clear
        </button>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}
