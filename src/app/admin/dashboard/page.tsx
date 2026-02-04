// src/app/admin/dashboard/page.tsx
"use client";
import { useState } from "react";

export default function AdminDashboard() {
  const [sessionId, setSessionId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");

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
          Passcode: <code>{passcode}</code>
        </p>
      )}
    </main>
  );
}
