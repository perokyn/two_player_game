// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // basic client validation
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body?.error || "Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      // success -> redirect to dashboard
      router.push("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const demoHint = (
    <div className="text-sm text-muted-foreground mt-2">
      (If you used the signup endpoint for local dev, use those credentials
      here.)
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-800">
            Counseling Game — Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to access the counselor dashboard
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-describedby="login-help"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50"
              placeholder="you@yourorg.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                aria-label="Remember me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                Remember me
              </label>
            </div>
            <div>
              <a href="#" className="text-sm text-indigo-600 hover:underline">
                Forgot?
              </a>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full inline-flex justify-center items-center rounded-md px-4 py-2 text-white font-medium ${
              loading
                ? "bg-indigo-400 cursor-wait"
                : "bg-indigo-600 hover:bg-indigo-700"
            } focus:outline-none focus:ring-2 focus:ring-indigo-300`}
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            ) : null}
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div
            id="login-help"
            className="text-center text-sm text-slate-500 mt-2"
          >
            {demoHint}
            <div className="mt-2">
              <Link
                href="/"
                className="text-indigo-600 hover:underline"
                onClick={() => {
                  /* no-op: just allow back to home */
                }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// // src/app/admin/login/page.tsx
// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function AdminLoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [msg, setMsg] = useState("");
//   const router = useRouter();

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     setMsg("Signing in...");
//     const res = await fetch("/api/admin/login", {
//       method: "POST",
//       body: JSON.stringify({ email, password }),
//       headers: { "Content-Type": "application/json" },
//     });
//     const j = await res.json();
//     if (res.ok) {
//       router.push("/admin/dashboard");
//     } else {
//       setMsg(j.error || "Sign-in failed");
//     }
//   }

//   return (
//     <main style={{ padding: 20 }}>
//       <h1>Admin sign in</h1>
//       <form onSubmit={submit}>
//         <div>
//           <label>Email</label>
//           <br />
//           <input value={email} onChange={(e) => setEmail(e.target.value)} />
//         </div>
//         <div>
//           <label>Password</label>
//           <br />
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//           />
//         </div>
//         <button type="submit">Sign in</button>
//       </form>
//       <div>{msg}</div>
//     </main>
//   );
// }
