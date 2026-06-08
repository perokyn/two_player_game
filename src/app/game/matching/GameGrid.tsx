// src/app/game/matching/GameGrid.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import GameCard from "@/components/GameCard";
import { createSeededRandom } from "@/lib/seededRandom";
import Pusher, { PresenceChannel } from "pusher-js";

type PresenceMember = {
  info?: { name?: string; username?: string };
  id?: string;
};

type QuestionShape = {
  id: number;
  text: string;
  order: number;
};

type CardItem = {
  id: string;
  questionId: number;
  text: string;
  pairIndex: number;
};

type GameGridProps = {
  questions: QuestionShape[] | null;
  sessionId: number | null;
  playerName: string | null;
  isLoading?: boolean;
  cardCoverUrl?: string | null;
};

export default function GameGrid({
  questions,
  sessionId,
  playerName,
  isLoading = false,
  cardCoverUrl = null,
}: GameGridProps) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [myMatches, setMyMatches] = useState<Set<number>>(new Set());
  const [cards, setCards] = useState<CardItem[]>([]);
  const [remoteFlipped, setRemoteFlipped] = useState<Set<string>>(new Set());
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const isResolvingRef = useRef<boolean>(false);
  const lastProcessedQuestionsRef = useRef<string>("");
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);
  const resolveTimeoutRef = useRef<any>(null);
  const resolveFunctionRef = useRef<(() => void) | null>(null);

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";

  // 1. Shuffling Logic
  useEffect(() => {
    if (!questions || questions.length === 0 || !sessionId) return;
    const questionsKey = JSON.stringify(questions.map((q) => q.id));
    if (lastProcessedQuestionsRef.current === questionsKey) return;

    const timeoutId = setTimeout(() => {
      const newCards: CardItem[] = [];
      questions.forEach((q) => {
        newCards.push(
          { id: `q${q.id}-0`, questionId: q.id, text: q.text, pairIndex: 0 },
          { id: `q${q.id}-1`, questionId: q.id, text: q.text, pairIndex: 1 },
        );
      });
      const rng = createSeededRandom(sessionId);
      for (let i = newCards.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
      }
      setCards(newCards);
      setFlipped(new Set());
      setMatched(new Set());
      setMyMatches(new Set());
      lastProcessedQuestionsRef.current = questionsKey;
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [questions, sessionId]);

  // 2. Pusher & Turn Initialization
  useEffect(() => {
    if (!sessionId || !key || !cluster) return;
    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      forceTLS: true,
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(
      `presence-game-${sessionId}`,
    ) as PresenceChannel;
    channelRef.current = channel;

    const onRemoteFlip = (data: { who: string; card: string }) => {
      if (data.who !== playerName)
        setRemoteFlipped((prev) => new Set(prev).add(data.card));
    };

    const onRemoteUnflip = (data: { who: string; cards: string[] }) => {
      if (data.who !== playerName) {
        setRemoteFlipped((prev) => {
          const next = new Set(prev);
          data.cards.forEach((c) => next.delete(c));
          return next;
        });
      }
    };

    const onRemoteMatch = (data: { who: string; questionId: number }) => {
      if (data.who !== playerName) {
        setMatched((prev) => new Set(prev).add(data.questionId));
        setRemoteFlipped((prev) => {
          const next = new Set(prev);
          next.delete(`q${data.questionId}-0`);
          next.delete(`q${data.questionId}-1`);
          return next;
        });
      }
    };

    const onTurnEvent = (data: { who: string }) => {
      if (data.who) setActivePlayer(data.who);
    };

    channel.bind("pusher:subscription_succeeded", () => {
      const members: string[] = [];
      channel.members.each((m: PresenceMember) => {
        const name = m.info?.name ?? m.info?.username ?? m.id;
        if (name) members.push(name);
      });

      if (members.length > 0 && !activePlayer) {
        const starter = members[Math.floor(Math.random() * members.length)];
        fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: `presence-game-${sessionId}`,
            event: "turn-start",
            data: { who: starter },
          }),
        }).catch(() => {});
      }
    });

    channel.bind("card-flip", onRemoteFlip);
    channel.bind("card-unflip", onRemoteUnflip);
    channel.bind("card-match", onRemoteMatch);
    channel.bind("turn-start", onTurnEvent);
    channel.bind("turn-pass", onTurnEvent);
    channel.bind("turn-keep", onTurnEvent);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`presence-game-${sessionId}`);
      pusher.disconnect();
    };
  }, [sessionId, playerName, key, cluster]);

  // 3. Flip Logic
  const handleBoardClick = () => {
    if (isResolving && resolveFunctionRef.current) {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      const resolve = resolveFunctionRef.current;
      resolveFunctionRef.current = null;
      resolve();
    }
  };

  const handleCardFlip = useCallback(
    async (cardId: string) => {
      const qId = parseInt(cardId.split("q")[1]);

      if (matched.has(qId) || isLoading || !sessionId || isResolvingRef.current)
        return;
      if (!activePlayer || activePlayer !== playerName) return;

      setFlipped((prev) => {
        if (prev.has(cardId)) return prev;
        const next = new Set(prev);
        next.add(cardId);

        if (next.size === 2) {
          isResolvingRef.current = true;
          setTimeout(() => setIsResolving(true), 0);
        }
        return next;
      });

      try {
        await fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: `presence-game-${sessionId}`,
            event: "card-flip",
            data: { who: playerName, card: cardId },
          }),
        });
      } catch (err) {
        console.error("Broadcast failed:", err);
      }
    },
    [sessionId, playerName, matched, isLoading, activePlayer],
  );

  // 4. Resolution Logic
  useEffect(() => {
    if (flipped.size !== 2) return;

    const flippedArray = Array.from(flipped);
    const [c1, c2] = flippedArray.map((id) => cards.find((c) => c.id === id));

    if (!c1 || !c2) {
      const resetTimeout = setTimeout(() => {
        isResolvingRef.current = false;
        setIsResolving(false);
      }, 0);
      return () => clearTimeout(resetTimeout);
    }

    const resolveCards = async () => {
      const isMatch = c1.questionId === c2.questionId;
      const ch = `presence-game-${sessionId}`;

      if (isMatch) {
        setMatched((prev) => new Set(prev).add(c1.questionId));
        setMyMatches((prev) => new Set(prev).add(c1.questionId)); // Add point to local user
        setFlipped(new Set());

        fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: ch,
            event: "card-match",
            data: { who: playerName, questionId: c1.questionId },
          }),
        }).catch(() => {});

        fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: ch,
            event: "turn-keep",
            data: { who: playerName },
          }),
        }).catch(() => {});
      } else {
        setFlipped(new Set());
        fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: ch,
            event: "card-unflip",
            data: { who: playerName, cards: [c1.id, c2.id] },
          }),
        }).catch(() => {});

        const members: string[] = [];
        channelRef.current?.members.each((m: PresenceMember) => {
          const name = m.info?.name ?? m.info?.username ?? m.id;
          if (name) members.push(name);
        });

        const next = members.find((m) => m !== playerName) || members[0];
        if (next) {
          fetch("/api/pusher/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: ch,
              event: "turn-pass",
              data: { who: next },
            }),
          }).catch(() => {});
          setActivePlayer(next);
        }
      }

      isResolvingRef.current = false;
      setIsResolving(false);
    };

    resolveFunctionRef.current = resolveCards;
    resolveTimeoutRef.current = setTimeout(() => {
      if (resolveFunctionRef.current) {
        resolveFunctionRef.current = null;
        resolveCards();
      }
    }, 6000); // 6 seconds display time

    return () => {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      resolveFunctionRef.current = null;
    };
  }, [flipped, cards, sessionId, playerName]);

  // 5. Grid Sizing
  const gridCols = useMemo(() => {
    const count = cards.length;
    if (count > 20) return "grid-cols-4 md:grid-cols-6 lg:grid-cols-8";
    if (count > 12) return "grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    return "grid-cols-2 md:grid-cols-4";
  }, [cards.length]);

  return (
    <div onClick={handleBoardClick} className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-4 text-center flex flex-col items-center">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Matching Game
        </h3>
        <div className="flex gap-4 mt-1">
          <p className="text-sm font-bold text-[var(--foreground)]">
            Total Matched: {matched.size} / {questions?.length ?? 0}
          </p>
          <p className="text-sm font-bold text-[var(--accent-primary)]">
            My Matches: {myMatches.size}
          </p>
        </div>
        <div className="mt-2">
          {activePlayer ? (
            <p
              className={`text-sm font-semibold ${
                activePlayer === playerName
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {activePlayer === playerName
                ? "Your Turn"
                : `Turn: ${activePlayer}`}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] italic">
              Connecting to players...
            </p>
          )}
        </div>
      </div>

      <div
        className={`grid ${gridCols} gap-4 items-start transition-all duration-500`}
      >
        {cards.map((card) => {
          const isCardFlipped =
            flipped.has(card.id) || remoteFlipped.has(card.id);
          const isMatched = matched.has(card.questionId);

          return (
            <div
              key={card.id}
              className="transition-all duration-500 ease-in-out"
              style={{
                aspectRatio: isCardFlipped ? "auto" : "1/1",
                minHeight: isCardFlipped ? "200px" : "auto",
                zIndex: isCardFlipped ? 50 : 1,
                opacity: isMatched ? 0.3 : 1,
                width: "100%",
              }}
            >
              <GameCard
                id={card.id}
                text={card.text}
                isFlipped={isCardFlipped}
                onClick={() => handleCardFlip(card.id)}
                disabled={isMatched || isResolving}
                imageUrl={cardCoverUrl || undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
