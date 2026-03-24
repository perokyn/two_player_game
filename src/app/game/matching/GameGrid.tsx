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
};

export default function GameGrid({
  questions,
  sessionId,
  playerName,
  isLoading = false,
}: GameGridProps) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [cards, setCards] = useState<CardItem[]>([]);
  const [remoteFlipped, setRemoteFlipped] = useState<Set<string>>(new Set());
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const isResolvingRef = useRef<boolean>(false);
  const lastProcessedQuestionsRef = useRef<string>("");
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);

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

    // const onRemoteMatch = (data: { who: string; questionId: number }) => {
    //   if (data.who !== playerName)
    //     setMatched((prev) => new Set(prev).add(data.questionId));
    // };
    const onRemoteMatch = (data: { who: string; questionId: number }) => {
      if (data.who !== playerName) {
        setMatched((prev) => new Set(prev).add(data.questionId));
        // Clear these cards from remoteFlipped so they flip back face-down
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

    // Subscribed callback to pick initial player
    channel.bind("pusher:subscription_succeeded", () => {
      const members: string[] = [];
      channel.members.each((m: PresenceMember) => {
        const name = m.info?.name ?? m.info?.username ?? m.id;
        if (name) members.push(name);
      });

      if (members.length > 0 && !activePlayer) {
        const starter = members[Math.floor(Math.random() * members.length)];
        // Announce starter
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
  const handleCardFlip = useCallback(
    async (cardId: string) => {
      const qId = parseInt(cardId.split("q")[1]);

      // Safety check: is it our turn? is game resolving?
      if (matched.has(qId) || isLoading || !sessionId || isResolvingRef.current)
        return;
      if (!activePlayer || activePlayer !== playerName) return;

      setFlipped((prev) => {
        if (prev.has(cardId)) return prev;
        const next = new Set(prev);
        next.add(cardId);

        if (next.size === 2) {
          isResolvingRef.current = true;
          // Move state update out of sync render
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

    const timer = setTimeout(async () => {
      const isMatch = c1.questionId === c2.questionId;
      const ch = `presence-game-${sessionId}`;

      if (isMatch) {
        setMatched((prev) => new Set(prev).add(c1.questionId));
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

        // Match found: turn stays with current player
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

        // No match: find next player
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
    }, 1000);

    return () => clearTimeout(timer);
  }, [flipped, cards, sessionId, playerName]);

  // 5. Grid Sizing
  // 5. Grid Sizing & Adjacency Logic
  const gridCols = useMemo(() => {
    const cardCount = cards.length;
    if (cardCount > 30) return 10;
    if (cardCount > 20) return 8;
    if (cardCount > 12) return 6;
    return 4;
  }, [cards.length]);

  /**
   * Detects if the two currently flipped cards are adjacent
   * (horizontally or vertically next to each other).
   */
  const areAdjacent = useMemo(() => {
    if (flipped.size !== 2) return false;
    const flippedArray = Array.from(flipped);
    const idx1 = cards.findIndex((c) => c.id === flippedArray[0]);
    const idx2 = cards.findIndex((c) => c.id === flippedArray[1]);

    if (idx1 === -1 || idx2 === -1) return false;

    const row1 = Math.floor(idx1 / gridCols);
    const col1 = idx1 % gridCols;
    const row2 = Math.floor(idx2 / gridCols);
    const col2 = idx2 % gridCols;

    // Adjacent means the sum of absolute differences in rows and columns is exactly 1
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }, [flipped, cards, gridCols]);

  const gridClass = {
    4: "grid-cols-4",
    6: "grid-cols-4 md:grid-cols-6",
    8: "grid-cols-4 md:grid-cols-8",
    10: "grid-cols-5 md:grid-cols-10",
  }[gridCols as 4 | 6 | 8 | 10];
  console.log("Adjacent card flip: ", areAdjacent);
  return (
    <div className="w-full max-w-6xl mx-auto px-2">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800">Matching Game</h3>
        <p className="text-sm font-bold text-gray-700">
          Matched: {matched.size} / {questions?.length ?? 0}
        </p>
        <div className="mt-2">
          {activePlayer ? (
            <p
              className={`text-sm font-semibold ${activePlayer === playerName ? "text-blue-600" : "text-gray-600"}`}
            >
              {activePlayer === playerName
                ? "Your Turn"
                : `Turn: ${activePlayer}`}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Connecting to players...
            </p>
          )}
        </div>
      </div>

      <div className={`grid ${gridClass} gap-2 md:gap-3 w-full`}>
        {cards.map((card, index) => {
          const colIndex = index % gridCols;
          let origin: "left" | "right" | "center" = "center";
          if (colIndex === 0) origin = "left";
          else if (colIndex === gridCols - 1) origin = "right";

          const isCardFlipped =
            flipped.has(card.id) || remoteFlipped.has(card.id);

          // Calculate displacement to prevent overlap of adjacent flipped cards
          let transform = "";
          if (areAdjacent && isCardFlipped) {
            const activeSet = flipped.size === 2 ? flipped : remoteFlipped;
            const flippedArray = Array.from(activeSet);
            const otherId = flippedArray.find((id) => id !== card.id);
            const otherIndex = cards.findIndex((c) => c.id === otherId);

            if (otherIndex !== -1) {
              const r1 = Math.floor(index / gridCols);
              const c1 = index % gridCols;
              const r2 = Math.floor(otherIndex / gridCols);
              const c2 = otherIndex % gridCols;
              // TO DO need to do transform of even nearby cards
              // Make sure that transforma lso works on other users grid
              if (r1 === r2) {
                // Horizontal adjacency: shift left/right
                transform = `translateX(${c1 < c2 ? "-30%" : "30%"})`;
              } else if (c1 === c2) {
                // Vertical adjacency: shift up/down
                transform = `translateY(${r1 < r2 ? "-100%" : "100%"})`;
              }
            }
          }

          return (
            <div
              key={card.id}
              className="relative aspect-square"
              style={{
                zIndex: isCardFlipped ? 50 : 1,
                pointerEvents: matched.has(card.questionId) ? "none" : "auto",
                opacity: matched.has(card.questionId) ? 0.4 : 1,
                transform,
              }}
            >
              <GameCard
                id={card.id}
                text={card.text}
                isFlipped={isCardFlipped}
                onClick={() => handleCardFlip(card.id)}
                disabled={matched.has(card.questionId) || isResolving}
                origin={origin}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
