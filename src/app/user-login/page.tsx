// src/app/user-login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserLogin() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const trimmed = code.trim();
    if (!trimmed) {
      setMsg("Please enter a passcode.");
      return;
    }

    setLoading(true);
    setMsg("Signing in...");

    try {
      const res = await fetch("/api/user/login-with-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: keep same request body shape as your original working code
        body: JSON.stringify({ code: trimmed, name }),
      });

      // the original route used res.json(); keep the same behavior
      const j = await res.json();

      if (res.ok) {
        // redirect to game
        router.push("/game");
      } else {
        // show server-provided error or fallback message
        setMsg(j?.error || j?.message || "Invalid code");
      }
    } catch (err) {
      console.error("login-with-passcode error", err);
      setMsg("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Join your session</h1>
        <p style={styles.subtitle}>
          Enter the passcode your counselor gave you and a display name
          (optional).
        </p>

        <form
          onSubmit={submit}
          style={styles.form}
          aria-labelledby="join-session"
        >
          <div style={styles.field}>
            <label htmlFor="passcode" style={styles.label}>
              Passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 62R5UP"
              style={styles.input}
              autoComplete="off"
              inputMode="text"
              aria-required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="displayName" style={styles.label}>
              Display name (optional)
            </label>
            <input
              id="displayName"
              name="displayName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jula"
              style={styles.input}
            />
            <div style={styles.hint}>
              This name will appear to the counselor during the session.
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              disabled={loading}
              className="
    px-5 py-2.5
    bg-indigo-600
    text-white
    font-medium
    rounded-lg
    shadow-sm
    transition-all duration-200 ease-in-out
    hover:bg-indigo-700
    hover:shadow-md
    hover:-translate-y-0.5
    active:translate-y-0
    focus:outline-none
    focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
    disabled:opacity-50
    disabled:cursor-not-allowed
  "
            >
              {loading ? "Joining…" : "Join session"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCode("");
                setName("");
                setMsg("");
              }}
              style={styles.reset}
            >
              Reset
            </button>
          </div>

          <div style={styles.messageArea} role="status" aria-live="polite">
            {msg && (
              <div
                style={msg.startsWith("Invalid") ? styles.error : styles.info}
              >
                {msg}
              </div>
            )}
          </div>
        </form>

        <hr style={styles.hr} />

        <div style={styles.footer}>
          <strong>Need help?</strong>
          <div style={{ marginTop: 6 }}>
            Ask your counselor to generate a new passcode from the admin
            dashboard.
          </div>
        </div>
      </div>
    </main>
  );
}

/* Inline styles so this works without Tailwind. Replace with your CSS/Tailwind classes if you prefer. */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "#f7fafc",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 4px 18px rgba(2,6,23,0.08)",
    padding: 24,
  },
  title: { fontSize: 22, margin: 0, fontWeight: 600, color: "#0f172a" },
  subtitle: { marginTop: 6, color: "#475569", fontSize: 14 },
  form: { marginTop: 16 },
  field: { marginBottom: 12 },
  label: { display: "block", fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e6edf3",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  },
  hint: { marginTop: 6, fontSize: 12, color: "#6b7280" },
  actions: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  button: {
    padding: "10px 14px",
    borderRadius: 8,
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  reset: {
    padding: "8px 12px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e6edf3",
    color: "#0f172a",
    cursor: "pointer",
  },
  messageArea: { marginTop: 12, minHeight: 22 },
  info: {
    color: "#065f46",
    background: "#ecfdf5",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 13,
  },
  error: {
    color: "#b91c1c",
    background: "#fff1f2",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 13,
  },
  hr: { margin: "18px 0", border: 0, borderTop: "1px solid #eef2f7" },
  footer: { fontSize: 13, color: "#475569" },
};

// // src/app/user-login/page.tsx
// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function UserLogin() {
//   const [code, setCode] = useState("");
//   const [name, setName] = useState("");
//   const [msg, setMsg] = useState("");
//   const router = useRouter();

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     setMsg("Signing in...");
//     const res = await fetch("/api/user/login-with-passcode", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ code: code.trim(), name }),
//     });
//     const j = await res.json();
//     if (res.ok) {
//       // redirect to game
//       router.push("/game");
//     } else {
//       setMsg(j.error || "Invalid code");
//     }
//   }

//   return (
//     <main style={{ padding: 20 }}>
//       <h1>Enter your passcode</h1>
//       <form onSubmit={submit}>
//         <div>
//           <label>Passcode</label>
//           <br />
//           <input value={code} onChange={(e) => setCode(e.target.value)} />
//         </div>
//         <div>
//           <label>Your display name (optional)</label>
//           <br />
//           <input value={name} onChange={(e) => setName(e.target.value)} />
//         </div>
//         <button type="submit">Join</button>
//       </form>
//       <div>{msg}</div>
//     </main>
//   );
// }
