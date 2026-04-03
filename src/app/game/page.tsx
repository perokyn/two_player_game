// src/app/game/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import usePresencePusher from "./userPresencePusher";
import Link from "next/link";
import GameGrid from "./matching/GameGrid";

type QuestionShape = {
  id: number;
  text: string;
  order: number;
};

export default function GamePage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // question set state
  const [questions, setQuestions] = useState<QuestionShape[] | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // fetch user info
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/user/me");
        if (!res.ok) {
          setStatusMsg("Not logged in or session expired.");
          setLoading(false);
          return;
        }
        const j = await res.json();
        if (!mounted) return;
        if (j.ok) {
          setPlayerName(j.name ?? null);
          setSessionId(j.sessionId ?? null);
          setStatusMsg(null);
        } else {
          setStatusMsg("Unable to read session.");
        }
      } catch (err) {
        console.error("user/me error", err);
        setStatusMsg("Failed to load user info.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // When sessionId becomes available, fetch the questions
  useEffect(() => {
    setQuestions(null);
    setQuestionsError(null);

    if (typeof sessionId !== "number" || !Number.isFinite(sessionId)) return;

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      setLoadingQuestions(true);
      try {
        const res = await fetch(`/api/session/${sessionId}/questions`, {
          method: "GET",
          signal: ac.signal,
        });

        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        if (!res.ok) {
          const maybe = (
            json && typeof json === "object" ? json.error || json.message : null
          ) as string | null;
          throw new Error(maybe ?? `Failed to load questions (${res.status})`);
        }

        const qset = json?.questionSet;
        if (qset && !cancelled) {
          setQuestions(
            Array.isArray(qset.questions)
              ? qset.questions.map((q: any) => ({
                  id: Number(q.id),
                  text: String(q.text ?? ""),
                  order: Number(q.order ?? 0),
                }))
              : [],
          );
        }
      } catch (err: any) {
        if (ac.signal.aborted) return;
        if (!cancelled) {
          setQuestionsError(err.message || "Failed loading questions");
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [sessionId]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  // connect to presence channel
  const [shouldConnect, setShouldConnect] = useState<boolean>(true);
  const effectiveSessionId = shouldConnect ? sessionId : null;
  const { connected, members, error } = usePresencePusher(effectiveSessionId);
  const isAdmin = typeof playerName === "string" && /admin/i.test(playerName);

  function copySessionLink() {
    if (!sessionId) return;
    const url = `${window.location.origin}/game?sessionId=${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setStatusMsg("Session link copied to clipboard");
      setTimeout(() => setStatusMsg(null), 1500);
    });
  }

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <main
      style={{
        padding: 20,
        maxWidth: 900,
        margin: "0 auto",
        background: "var(--background)",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--background)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              letterSpacing: 0.2,
              color: "var(--foreground)",
            }}
          >
            Card Matching Game
          </h1>
          <button
            onClick={toggleTheme}
            style={{
              background: "var(--muted-bg)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
            }}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && (
            <Link href="/admin/dashboard">
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--accent-primary)",
                  background: "var(--accent-primary)",
                  color: "var(--accent-foreground)",
                  cursor: "pointer",
                }}
              >
                Admin
              </button>
            </Link>
          )}
          <Link href="/">
            <button
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--muted-bg)",
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              Home
            </button>
          </Link>
        </div>
      </header>

      {/* Admin-only Section */}
      {isAdmin && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 12, color: "var(--foreground)" }}>
            Player
          </h2>
          {loading ? (
            <div style={{ color: "var(--muted-foreground)" }}>
              Loading session...
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                background:
                  "linear-gradient(180deg, var(--background), var(--muted-bg))",
                boxShadow: "var(--shadow-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--accent-soft-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "var(--accent-soft-foreground)",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {playerName
                  ? String(
                      (playerName || "")
                        .split(" ")
                        .map((p) => p[0] ?? "")
                        .slice(0, 2)
                        .join("")
                        .toUpperCase(),
                    )
                  : "—"}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        color: "var(--foreground)",
                      }}
                    >
                      {playerName ?? "Not signed in"}
                    </div>
                    <div
                      style={{ color: "var(--muted-foreground)", marginTop: 4 }}
                    >
                      Session:{" "}
                      <strong style={{ color: "var(--foreground)" }}>
                        {sessionId ?? "—"}
                      </strong>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      onClick={copySessionLink}
                      disabled={!sessionId}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        background: sessionId
                          ? "var(--accent-primary)"
                          : "var(--muted-bg)",
                        color: sessionId
                          ? "var(--accent-foreground)"
                          : "var(--muted-foreground)",
                        cursor: sessionId ? "pointer" : "not-allowed",
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                </div>

                {statusMsg && (
                  <div
                    style={{
                      color: "var(--destructive)",
                      marginTop: 10,
                      fontSize: 13,
                    }}
                  >
                    {statusMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Everyone can see Presence */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 12, color: "var(--foreground)" }}>
          Presence
        </h2>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "var(--background)",
            boxShadow: "var(--shadow-subtle)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                Connection
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 9999,
                  background: connected
                    ? "var(--success-bg)"
                    : "var(--error-bg)",
                  color: connected
                    ? "var(--success-foreground)"
                    : "var(--error-foreground)",
                  border: `1px solid ${connected ? "var(--success-border)" : "var(--error-border)"}`,
                  fontSize: 13,
                }}
              >
                {connected ? "Connected" : "Disconnected"}
              </div>
            </div>

            {/* Admin-only connect button */}
            {isAdmin && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setShouldConnect((s) => !s)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: shouldConnect
                      ? "var(--destructive)"
                      : "var(--constructive)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {shouldConnect ? "Disconnect" : "Connect"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: "var(--destructive)", marginTop: 12 }}>
              Pusher error: {error}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 10px 0", color: "var(--foreground)" }}>
              Players in this session
            </h3>
            {members && Object.keys(members).length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(members).map(([id, info]) => (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "var(--muted-bg)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        background: "var(--accent-soft-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "var(--accent-soft-foreground)",
                        fontSize: 13,
                      }}
                    >
                      {info?.name
                        ? String(
                            (info.name || "")
                              .split(" ")
                              .map((p: string) => p[0] || "")
                              .slice(0, 2)
                              .join(""),
                          ).toUpperCase()
                        : "?"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "var(--foreground)",
                        }}
                      >
                        {info?.name ?? "(no name)"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted-foreground)",
                        }}
                      >
                        ID: {id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--muted-foreground)" }}>
                No players connected yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Everyone can see the Matching Game */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ color: "var(--foreground)" }}>Matching Game</h2>
        {loadingQuestions ? (
          <div style={{ color: "var(--muted-foreground)" }}>
            Loading game...
          </div>
        ) : questionsError ? (
          <div style={{ color: "var(--destructive)" }}>{questionsError}</div>
        ) : questions && questions.length > 0 ? (
          <GameGrid
            questions={questions}
            sessionId={sessionId}
            playerName={playerName}
            isLoading={loadingQuestions}
          />
        ) : (
          <div style={{ color: "var(--muted-foreground)" }}>
            No questions attached to this session.
          </div>
        )}
      </section>
    </main>
  );
}
