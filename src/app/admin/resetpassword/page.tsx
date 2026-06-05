// my-counseling-game/src/app/admin/resetpassword/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    // Dummy functionality for UI testing
    setTimeout(() => {
      setLoading(false);
      if (email.trim() === "error@example.com") {
        setError("User not found. Please try again.");
      } else {
        setSuccess(true);
      }
    }, 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 shadow-2xl rounded-3xl p-10">
        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Counselor admin portal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Reset Password
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            Enter your email address and we will send you a link to reset your
            password.
          </p>
        </header>

        {success ? (
          <div className="text-center space-y-6">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Check your email
              </h3>
              <p className="text-sm text-green-700">
                We have sent a password reset link to{" "}
                <span className="font-semibold">{email}</span>.
              </p>
            </div>
            <Link
              href="/admin/login"
              className="inline-flex justify-center items-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-white"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <div className="mt-6 text-center">
              <Link
                href="/admin/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                &larr; Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
