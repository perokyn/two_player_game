// src/app/user-login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserLogin() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Signing in...");
    const res = await fetch("/api/user/login-with-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), name }),
    });
    const j = await res.json();
    if (res.ok) {
      // redirect to game
      router.push("/game");
    } else {
      setMsg(j.error || "Invalid code");
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Enter your passcode</h1>
      <form onSubmit={submit}>
        <div>
          <label>Passcode</label>
          <br />
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label>Your display name (optional)</label>
          <br />
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit">Join</button>
      </form>
      <div>{msg}</div>
    </main>
  );
}
