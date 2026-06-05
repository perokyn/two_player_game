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

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 shadow-2xl rounded-3xl p-10">
        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Counselor admin portal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Sign in to manage sessions
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            Secure access to the counselor dashboard for setting sessions,
            managing questions, and viewing active players.
          </p>
        </header>

        <div className="space-y-4">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M22.54 12.24c0-.78-.07-1.53-.2-2.26H12v4.28h5.92c-.25 1.35-1 2.5-2.1 3.28v2.72h3.4c1.98-1.82 3.12-4.55 3.12-7.98z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.84 0 5.23-.94 6.97-2.56l-3.4-2.72c-.94.63-2.15 1.01-3.57 1.01-2.74 0-5.05-1.84-5.88-4.33H2.24v2.72A10 10 0 0012 22z"
                fill="#34A853"
              />
              <path
                d="M6.12 13.4a5.99 5.99 0 010-2.8V8.0H2.24a10 10 0 000 8h3.88z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.5c1.54 0 2.92.53 4.01 1.58l3.01-3.01C17.2 2.9 14.9 2 12 2a10 10 0 00-9.76 6.0l3.88 2.8A5.99 5.99 0 0112 6.5z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-slate-500">
                or sign in with email
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
          aria-describedby="login-help"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center text-sm text-slate-600">
              <input
                id="remember"
                aria-label="Remember me"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
              />
              <span className="ml-2">Remember me</span>
            </label>
            <Link
              href="/admin/resetpassword"
              className="text-indigo-600 hover:text-indigo-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full inline-flex justify-center items-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
              loading
                ? "bg-indigo-400 cursor-wait"
                : "bg-indigo-600 hover:bg-indigo-700"
            } focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-white`}
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : null}
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* Integrated Card Footer */}
          <div
            id="login-help"
            className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center justify-center gap-3"
          >
            <div className="flex gap-4 text-sm text-slate-500">
              <Link
                href="/privacy"
                className="hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/terms"
                className="hover:text-indigo-600 transition-colors"
              >
                Terms & Conditions
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Copyrights © ChCounseling 2026
            </p>
            <div className="mt-1">
              <Link
                href="/"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                onClick={() => {
                  /* no-op: just allow back to home */
                }}
              >
                &larr; Back to home
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

// // src/app/admin/login/page.tsx
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";

// export default function AdminLoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const router = useRouter();

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError(null);

//     // basic client validation
//     if (!email.trim() || !password) {
//       setError("Please enter both email and password.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await fetch("/api/admin/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: email.trim(), password }),
//       });

//       const body = await res.json();

//       if (!res.ok) {
//         setError(body?.error || "Sign-in failed. Please try again.");
//         setLoading(false);
//         return;
//       }

//       // success -> redirect to dashboard
//       router.push("/admin/dashboard");
//     } catch (err) {
//       console.error("Login error:", err);
//       setError("Network error. Please try again.");
//       setLoading(false);
//     }
//   }

//   const demoHint = (
//     <div className="text-sm text-muted-foreground mt-2">
//       (If you used the signup endpoint for local dev, use those credentials
//       here.)
//     </div>
//   );

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
//       <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
//         <header className="mb-6 text-center">
//           <h1 className="text-2xl font-semibold text-slate-800">
//             Counseling Game — Admin
//           </h1>
//           <p className="text-sm text-slate-500 mt-1">
//             Sign in to access the counselor dashboard
//           </p>
//         </header>

//         <form
//           onSubmit={handleSubmit}
//           className="space-y-4"
//           aria-describedby="login-help"
//         >
//           <div>
//             <label
//               htmlFor="email"
//               className="block text-sm font-medium text-slate-700"
//             >
//               Email
//             </label>
//             <input
//               id="email"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50"
//               placeholder="you@yourorg.com"
//               autoComplete="email"
//             />
//           </div>

//           <div>
//             <label
//               htmlFor="password"
//               className="block text-sm font-medium text-slate-700"
//             >
//               Password
//             </label>
//             <input
//               id="password"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50"
//               placeholder="••••••••"
//               autoComplete="current-password"
//             />
//           </div>

//           <div className="flex items-center justify-between">
//             <div className="flex items-center">
//               <input
//                 id="remember"
//                 aria-label="Remember me"
//                 type="checkbox"
//                 className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
//               />
//               <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
//                 Remember me
//               </label>
//             </div>
//             <div>
//               <a href="#" className="text-sm text-indigo-600 hover:underline">
//                 Forgot?
//               </a>
//             </div>
//           </div>

//           {error && (
//             <div
//               role="alert"
//               className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2"
//             >
//               {error}
//             </div>
//           )}

//           <button
//             type="submit"
//             disabled={loading}
//             className={`w-full inline-flex justify-center items-center rounded-md px-4 py-2 text-white font-medium ${
//               loading
//                 ? "bg-indigo-400 cursor-wait"
//                 : "bg-indigo-600 hover:bg-indigo-700"
//             } focus:outline-none focus:ring-2 focus:ring-indigo-300`}
//           >
//             {loading ? (
//               <svg
//                 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 ></circle>
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//                 ></path>
//               </svg>
//             ) : null}
//             {loading ? "Signing in..." : "Sign in"}
//           </button>

//           <div
//             id="login-help"
//             className="text-center text-sm text-slate-500 mt-2"
//           >
//             {demoHint}
//             <div className="mt-2">
//               <Link
//                 href="/"
//                 className="text-indigo-600 hover:underline"
//                 onClick={() => {
//                   /* no-op: just allow back to home */
//                 }}
//               >
//                 Back to home
//               </Link>
//             </div>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
