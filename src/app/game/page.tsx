// src/app/game/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import usePresencePusher from "./userPresencePusher";
import Link from "next/link";
import FlipFeed from "@/components/FlipFeed";
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

  async function broadcastCardFlip() {
    try {
      setLastEvent(null);
      const ch = `presence-game-${sessionId}`;
      const payload = {
        channel: ch,
        event: "card-flip",
        data: { who: playerName ?? "unknown", card: "A1" },
      };

      console.debug("broadcastCardFlip -> sending", payload);

      const res = await fetch("/api/pusher/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Read text once (avoids "body disturbed" errors)
      const bodyText = await res.text();

      if (!res.ok) {
        // Try parse JSON error, otherwise show single-line trimmed text
        let errMsg = `Trigger failed ${res.status}`;
        try {
          const parsed = JSON.parse(bodyText);
          errMsg = String(parsed?.error ?? parsed?.message ?? errMsg);
        } catch {
          const trimmed = bodyText.replace(/\s+/g, " ").slice(0, 300);
          if (trimmed) errMsg = trimmed + (bodyText.length > 300 ? "..." : "");
        }
        console.error("broadcastCardFlip error detail:", bodyText);
        throw new Error(errMsg);
      }

      // success
      let json = null;
      try {
        json = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        json = null;
      }
      console.debug("broadcast success response:", json ?? bodyText);
      setLastEvent("card-flip sent");
    } catch (err: unknown) {
      console.error("broadcast error:", err);
      if (err instanceof Error) setLastEvent(err.message);
      else setLastEvent("Unknown error while broadcasting");
    }
  }

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
        }}
      >
        <h1 style={{ margin: 0 }}>Counseling Game — Play</h1>
        <div>
          <Link href="/">
            <button style={{ marginRight: 8 }}>Home</button>
          </Link>
          <Link href="/admin/dashboard">
            <button>Admin</button>
          </Link>
        </div>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2>Player</h2>
        {loading ? (
          <div>Loading session...</div>
        ) : (
          <>
            <div>
              <strong>Name:</strong> {playerName ?? "Not signed in"}
            </div>
            <div>
              <strong>Session:</strong> {sessionId ?? "—"}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={copySessionLink} disabled={!sessionId}>
                Copy session link
              </button>
            </div>
            {statusMsg && (
              <div style={{ color: "crimson", marginTop: 8 }}>{statusMsg}</div>
            )}
          </>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Presence</h2>
        <div>
          <strong>Connection:</strong>{" "}
          {connected ? "Connected" : "Disconnected"}
        </div>
        {error && <div style={{ color: "crimson" }}>Pusher error: {error}</div>}
        <div style={{ marginTop: 12 }}>
          <h3>Players in this session</h3>
          {members && Object.keys(members).length > 0 ? (
            <ul>
              {Object.entries(members).map(([id, info]) => (
                <li key={id}>
                  <strong>{info?.name ?? "(no name)"}</strong>{" "}
                  <small>({id})</small>
                </li>
              ))}
            </ul>
          ) : (
            <div>No players connected yet.</div>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShouldConnect((s) => !s)}>
              {shouldConnect ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Demo Controls</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={broadcastCardFlip} disabled={!connected}>
            Broadcast card-flip
          </button>
          <button onClick={() => setLastEvent(null)}>Clear</button>
        </div>
        {lastEvent && <div style={{ marginTop: 8 }}>Last: {lastEvent}</div>}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Question set</h2>
        {loadingQuestions ? (
          <div>Loading questions...</div>
        ) : questionsError ? (
          <div style={{ color: "crimson" }}>{questionsError}</div>
        ) : questions ? (
          <div>
            <div>
              <strong>Set:</strong> {questionSetName ?? "(unnamed)"}
            </div>
            <div>
              <strong>Questions:</strong> {questions.length}
            </div>
            <ul style={{ marginTop: 8 }}>
              {questions.slice(0, 6).map((q) => (
                <li key={q.id}>
                  <small>{q.order + 1}.</small> {q.text}
                </li>
              ))}
              {questions.length > 6 && <li>...and more</li>}
            </ul>
          </div>
        ) : (
          <div>No question set attached to this session.</div>
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
        <h2>Flip Feed</h2>
        <FlipFeed sessionId={sessionId} />
      </section>
    </main>
  );
}
