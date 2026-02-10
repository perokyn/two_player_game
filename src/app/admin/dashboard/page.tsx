// src/app/admin/dashboard/page.tsx
"use client";
import { useState } from "react";

import { useRouter } from "next/navigation";

function JoinCurrentGameButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch("/api/admin/join-current-session", {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j?.error ?? "Failed to join session");
        return;
      }
      // The endpoint sets cg_user_session cookie — now navigate to /game
      router.push("/game");
    } catch (e) {
      setErr(String((e as Error)?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleJoin} disabled={loading}>
        {loading ? "Joining..." : "Join current game"}
      </button>
      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [sessionId, setSessionId] = useState("");
  const [passcode, setPasscode] = useState<PasscodeResponse | null>(null);
  const [message, setMessage] = useState("");

  type PasscodeResponse = {
    id: number;
    code: string;
    sessionId: number;
    expiresAt: string;
  };

  async function createPass(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Creating...");
    const res = await fetch("/api/admin/generate-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId || undefined,
        expiresMinutes: 10,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setPasscode(j.passcode);
      setMessage(
        `Passcode generated (expires at ${new Date(j.expiresAt).toLocaleTimeString()})`,
      );
    } else {
      setMessage(j.error || "Failed to create passcode");
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>
      <form onSubmit={createPass}>
        <div>
          <label>Session ID (optional)</label>
          <br />
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
        </div>
        <button type="submit">Create Passcode</button>
      </form>

      {message && <p>{message}</p>}
      {passcode && (
        <p>
          Passcode: <code style={{ fontSize: "1.2em" }}>{passcode.code}</code>
        </p>
      )}
      <div>
        <JoinCurrentGameButton />
      </div>
    </main>
  );
}
