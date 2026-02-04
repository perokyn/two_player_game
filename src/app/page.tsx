"use client";

import { useEffect, useRef, useState } from "react";
import Pusher, { Channel } from "pusher-js";

/**
 * Event payload types
 */
interface PlayerJoinedPayload {
  name: string;
}

interface CardFlipPayload {
  player: string;
  cardId: string;
  timestamp?: number;
}

interface MatchResultPayload {
  player: string;
  cards: string[];
  matched: boolean;
}

export default function Home() {
  const [gameId, setGameId] = useState<string>("test-room");

  const [playerName, setPlayerName] = useState<string>(() => {
    return "Player" + Math.floor(Math.random() * 1000);
  });

  const [connected, setConnected] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    return () => {
      channelRef.current?.unbind_all();
      pusherRef.current?.disconnect();
    };
  }, []);

  function addLog(line: string) {
    setLogs((l) =>
      [new Date().toLocaleTimeString() + " — " + line, ...l].slice(0, 200),
    );
  }

  const connect = () => {
    if (connected) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      addLog("Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER");
      return;
    }

    const pusher = new Pusher(key, { cluster, forceTLS: true });
    pusherRef.current = pusher;

    const ch = pusher.subscribe(`game-${gameId}`) as Channel;
    channelRef.current = ch;

    ch.bind("pusher:subscription_succeeded", () => {
      addLog(`Subscribed to game-${gameId} as ${playerName}`);
      setConnected(true);

      void fetch("/api/pusher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          event: "player-joined",
          payload: { name: playerName },
        }),
      });
    });

    ch.bind("player-joined", (data: PlayerJoinedPayload) => {
      addLog(`(event) player-joined: ${JSON.stringify(data)}`);
    });

    ch.bind("card-flip", (data: CardFlipPayload) => {
      addLog(`(event) card-flip from ${data.player}: ${data.cardId}`);
    });

    ch.bind("match-result", (data: MatchResultPayload) => {
      addLog(`(event) match-result: ${JSON.stringify(data)}`);
    });

    pusher.connection.bind("error", (err: unknown) => {
      addLog("Pusher error: " + JSON.stringify(err));
    });
  };

  const disconnect = () => {
    channelRef.current?.unbind_all();
    pusherRef.current?.disconnect();
    setConnected(false);
    addLog("Disconnected");
  };

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Two-player realtime test</h1>

      <div style={{ marginBottom: 12 }}>
        <input value={gameId} onChange={(e) => setGameId(e.target.value)} />
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        {!connected ? (
          <button onClick={connect}>Connect</button>
        ) : (
          <button onClick={disconnect}>Disconnect</button>
        )}
      </div>

      <div>
        <button onClick={() => sendEvent("A1")}>Flip A1</button>
        <button onClick={() => sendEvent("B2")}>Flip B2</button>
      </div>

      <ul>
        {logs.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </main>
  );

  function sendEvent(cardId: string) {
    fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        event: "card-flip",
        payload: { player: playerName, cardId },
      }),
    });
  }
}
