// src/app/game/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import usePresencePusher from "./userPresencePusher";
import Link from "next/link";

import GameGrid from "./matching/GameGrid";
/**
 * Game page (client) — shows player info, presence members and small demo controls.
 *
 * Requires:
 * - /api/user/me (GET) to return { ok: true, name, sessionId }
 * - usePresencePusher hook at ./usePresencePusher
 * - pusher presence auth endpoint at /api/pusher/auth (already created)
 * - /api/session/[id]/questions to return the session's questionSet (optional)
 */

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
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  // question set state (loaded from /api/session/[id]/questions)
  const [questionSetName, setQuestionSetName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionShape[] | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // fetch user info (reads HttpOnly cookie server-side)
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

  // When sessionId becomes available, fetch the attached question set (if any).
  useEffect(() => {
    // reset per-session state
    setQuestionSetName(null);
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
        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        if (!res.ok) {
          const maybe = (
            json && typeof json === "object" && json !== null
              ? ((json as Record<string, unknown>)["error"] ??
                (json as Record<string, unknown>)["message"])
              : null
          ) as string | null;
          const errMsg = maybe ?? `Failed to load questions (${res.status})`;
          throw new Error(errMsg);
        }

        // parse successful payload
        const payload = json as { ok?: boolean; questionSet?: unknown } | null;
        const qset = payload?.questionSet as
          | { id: number; name: string; questions: QuestionShape[] }
          | null
          | undefined;

        if (!qset) {
          if (!cancelled) {
            setQuestionSetName(null);
            setQuestions(null);
            setQuestionsError(null);
          }
        } else {
          if (!cancelled) {
            setQuestionSetName(String(qset.name ?? "Unnamed set"));
            setQuestions(
              Array.isArray(qset.questions)
                ? qset.questions.map((q) => ({
                    id: Number(q.id),
                    text: String(q.text ?? ""),
                    order: Number(q.order ?? 0),
                  }))
                : [],
            );
            setQuestionsError(null);
          }
        }
      } catch (err: unknown) {
        if (ac.signal.aborted) return;
        console.error("load session questions error", err);
        if (!cancelled) {
          setQuestions(null);
          setQuestionSetName(null);
          setQuestionsError(
            err instanceof Error ? err.message : "Failed loading questions",
          );
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

  // connect to presence channel using the hook
  const [shouldConnect, setShouldConnect] = useState<boolean>(true);
  // pass sessionId only when shouldConnect is true
  const effectiveSessionId = shouldConnect ? sessionId : null;
  const { connected, members, error } = usePresencePusher(effectiveSessionId);
  // admin check: show full controls only to Admin or names containing "admin"
  const isAdmin = typeof playerName === "string" && /admin/i.test(playerName);
  // Might need ot be removed, only be used by admin!!
  function copySessionLink() {
    if (!sessionId) return;
    const url = `${window.location.origin}/game?sessionId=${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setStatusMsg("Session link copied to clipboard");
      setTimeout(() => setStatusMsg(null), 1500);
    });
  }

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: "1px solid #e6e9f2",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 20,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, letterSpacing: 0.2 }}>
            Card Matching Game
          </h1>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            Play and match cards
          </span>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/">
              <button
                style={{
                  marginRight: 0,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e6e9f2",
                  background: "#f8fafc",
                  color: "#111827",
                }}
              >
                Home
              </button>
            </Link>
            <Link href="/admin/dashboard">
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #4f46e5",
                  background: "#4f46e5",
                  color: "white",
                }}
              >
                Admin
              </button>
            </Link>
          </div>
        )}
      </header>
      {/* Game info and player name section (admin-only) */}
      {isAdmin && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 12 }}>Player</h2>
          {loading ? (
            <div>Loading session...</div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                background: "linear-gradient(180deg,#fff,#fbfbff)",
                boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "#3730a3",
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
                      }}
                    >
                      {playerName ?? "Not signed in"}
                    </div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>
                      Session:{" "}
                      <strong style={{ color: "#111827" }}>
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
                        border: "1px solid #e6e9f2",
                        background: sessionId ? "#4f46e5" : "#f3f4f6",
                        color: sessionId ? "white" : "#9ca3af",
                        cursor: sessionId ? "pointer" : "not-allowed",
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                </div>

                {statusMsg && (
                  <div
                    style={{ color: "#ef4444", marginTop: 10, fontSize: 13 }}
                  >
                    {statusMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
      {/* PLayer list and discommection section */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Presence</h2>
        {isAdmin ? (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 6px 18px rgba(2,6,23,0.04)",
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
                <div style={{ fontWeight: 700 }}>Connection</div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 9999,
                    background: connected ? "#ecfeff" : "#fff1f2",
                    color: connected ? "#065f46" : "#b91c1c",
                    border: connected
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                    fontSize: 13,
                  }}
                >
                  {connected ? "Connected" : "Disconnected"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setShouldConnect((s) => !s)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e6e9f2",
                    background: shouldConnect ? "#ef4444" : "#10b981",
                    color: "white",
                  }}
                >
                  {shouldConnect ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ color: "#ef4444", marginTop: 12 }}>
                Pusher error: {error}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <h3 style={{ margin: "0 0 10px 0" }}>Players in this session</h3>
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
                        background: "#f8fafc",
                        border: "1px solid #eef2ff",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9999,
                          background: "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#3730a3",
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
                          }}
                        >
                          {info?.name ?? "(no name)"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          ID: {id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#6b7280" }}>
                  No players connected yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          // non-admin view: only show the player list (no controls or connection pill)
          <div style={{ marginTop: 8 }}>
            {members && Object.keys(members).length > 0 ? (
              <ul
                style={{
                  padding: 0,
                  margin: 0,
                  listStyle: "none",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {Object.entries(members).map(([id, info]) => (
                  <li
                    key={id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px solid #eef2ff",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9999,
                        background: "#eef2ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#3730a3",
                        fontSize: 12,
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
                    <div style={{ fontWeight: 700 }}>
                      {info?.name ?? "(no name)"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "#6b7280" }}>No players connected yet.</div>
            )}
          </div>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Matching Game</h2>
        {loadingQuestions ? (
          <div>Loading game...</div>
        ) : questionsError ? (
          <div style={{ color: "crimson" }}>{questionsError}</div>
        ) : questions && questions.length > 0 ? (
          <GameGrid
            questions={questions}
            sessionId={sessionId}
            playerName={playerName}
            isLoading={loadingQuestions}
          />
        ) : (
          <div>No questions attached to this session.</div>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Session: {sessionId}</h2>
      </section>
    </main>
  );
}
