// src/app/game/matching/GameGrid.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import GameCard from "@/components/GameCard";
import { createSeededRandom } from "@/lib/seededRandom";
import Pusher, { Channel } from "pusher-js";
type QuestionShape = {
  id: number;
  text: string;
  order: number;
};

type CardItem = {
  id: string; // unique: `q${questionId}-${index}` for pairing
  questionId: number;
  text: string;
  pairIndex: number; // 0 or 1 (which copy of the pair)
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

  // Track the last processed questions ID to prevent redundant/cascading updates
  const lastProcessedQuestionsRef = React.useRef<string>("");

  // Pusher refs for listening to other players' flips
  const pusherRef = React.useRef<Pusher | null>(null);
  const channelRef = React.useRef<Channel | null>(null);
  const remoteFlipsTimersRef = React.useRef<Map<string, NodeJS.Timeout>>(
    new Map(),
  );

  // Environment reads (bundled at build time)
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";

  // Helper function (unchanged logic)
  const createShuffledCards = (qs: QuestionShape[]): CardItem[] => {
    const newCards: CardItem[] = [];
    qs.forEach((q) => {
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
    return newCards;
  };

  useEffect(() => {
    if (!questions || questions.length === 0 || !sessionId) return;

    const questionsKey = JSON.stringify(questions.map((q) => q.id));

    if (lastProcessedQuestionsRef.current === questionsKey) return;

    const timeoutId = setTimeout(() => {
      const newCards = createShuffledCards(questions);

      setCards(newCards);
      setFlipped(new Set());
      setMatched(new Set());

      lastProcessedQuestionsRef.current = questionsKey;
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [questions, sessionId, createShuffledCards]);

  // Listen to other players' card flips via Pusher
  useEffect(() => {
    if (!sessionId || !key || !cluster) return;

    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      forceTLS: true,
    });
    pusherRef.current = pusher;

    const channelName = `presence-game-${sessionId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    const onRemoteFlip = (data: unknown) => {
      try {
        const payload = data as { who?: string; card?: string } | string;
        let who = "";
        let card = "";

        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
          card = typeof obj.card === "string" ? obj.card : "";
        }

        // Only add if it's from another player
        if (who && who !== playerName && card) {
          setRemoteFlipped((prev) => new Set(prev).add(card));

          // Clear existing timer if any
          const existingTimer = remoteFlipsTimersRef.current.get(card);
          if (existingTimer) clearTimeout(existingTimer);

          // Set new timer to remove after 500ms (so it matches the local flip timing)
          const timer = setTimeout(() => {
            setRemoteFlipped((prev) => {
              const next = new Set(prev);
              next.delete(card);
              return next;
            });
            remoteFlipsTimersRef.current.delete(card);
          }, 500);

          remoteFlipsTimersRef.current.set(card, timer);
        }
      } catch (err) {
        console.warn("GameGrid: error processing card-flip", err);
      }
    };

    channel.bind("card-flip", onRemoteFlip);

    // Capture current timers map for cleanup
    const timersMapRef = remoteFlipsTimersRef.current;

    return () => {
      try {
        if (channelRef.current) {
          channel.unbind("card-flip", onRemoteFlip);
          pusher.unsubscribe(channelName);
        }
        pusher.disconnect();

        // Clear all timers
        timersMapRef.forEach((timer) => clearTimeout(timer));
        timersMapRef.clear();
      } catch (e) {
        console.warn("GameGrid cleanup error", e);
      } finally {
        pusherRef.current = null;
        channelRef.current = null;
      }
    };
  }, [sessionId, playerName, key, cluster]);

  // --- REST OF THE CODE (handleCardFlip and Match Logic) ---
  // Note: I have kept your existing handleCardFlip logic exactly as is.

  const handleCardFlip = useCallback(
    async (cardId: string) => {
      if (
        matched.has(parseInt(cardId.split("q")[1])) ||
        isLoading ||
        !sessionId
      ) {
        return;
      }

      setFlipped((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          next.add(cardId);
        }
        return next;
      });

      try {
        const ch = `presence-game-${sessionId}`;
        const payload = {
          channel: ch,
          event: "card-flip",
          data: {
            who: playerName ?? "unknown",
            card: cardId,
            ts: new Date().toISOString(),
          },
        };

        const res = await fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) console.error("Failed to broadcast card flip");
      } catch (err) {
        console.error("Error broadcasting card flip:", err);
      }
    },
    [sessionId, playerName, matched, isLoading],
  );

  useEffect(() => {
    if (flipped.size !== 2) return;

    const flippedArray = Array.from(flipped);
    const card1 = cards.find((c) => c.id === flippedArray[0]);
    const card2 = cards.find((c) => c.id === flippedArray[1]);

    if (!card1 || !card2) return;

    const timer = setTimeout(() => {
      if (card1.questionId === card2.questionId) {
        setMatched((prev) => new Set(prev).add(card1.questionId));
        setFlipped(new Set());
      } else {
        setFlipped(new Set());
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [flipped, cards]);

  // ... (Remaining JSX/Grid logic remains identical to your original)

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No questions loaded yet.</p>
      </div>
    );
  }

  const cardCount = cards.length;
  let gridColsClass = "grid-cols-2";
  if (cardCount >= 8) gridColsClass = "md:grid-cols-4 lg:grid-cols-5";
  else if (cardCount >= 6) gridColsClass = "md:grid-cols-4 lg:grid-cols-4";
  else if (cardCount >= 4) gridColsClass = "md:grid-cols-3 lg:grid-cols-4";

  const gameWon = matched.size === questions.length;

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800">Matching Game</h3>
        <p className="text-sm text-gray-600 mt-1">
          Matched: <span className="font-bold">{matched.size}</span> /{" "}
          {questions.length}
        </p>
        {gameWon && (
          <p className="text-green-600 font-semibold mt-2">🎉 You won!</p>
        )}
      </div>

      <div
        className={`grid grid-cols-2 ${gridColsClass} gap-2 md:gap-3 lg:gap-4 w-full auto-rows-max`}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className="aspect-square"
            style={{
              pointerEvents: matched.has(card.questionId) ? "none" : "auto",
              opacity: matched.has(card.questionId) ? 0.5 : 1,
              transition: "opacity 0.3s ease-in-out",
            }}
          >
            <GameCard
              id={card.id}
              text={card.text}
              isFlipped={flipped.has(card.id) || remoteFlipped.has(card.id)}
              onClick={() => handleCardFlip(card.id)}
              disabled={matched.has(card.questionId) || gameWon}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// // src/app/game/matching/GameGrid.tsx
// "use client";

// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import GameCard from "@/components/GameCard";
// import { createSeededRandom } from "@/lib/seededRandom";
// type QuestionShape = {
//   id: number;
//   text: string;
//   order: number;
// };

// type CardItem = {
//   id: string; // unique: `q${questionId}-${index}` for pairing
//   questionId: number;
//   text: string;
//   pairIndex: number; // 0 or 1 (which copy of the pair)
// };

// type GameGridProps = {
//   questions: QuestionShape[] | null;
//   sessionId: number | null;
//   playerName: string | null;
//   isLoading?: boolean;
// };

// export default function GameGrid({
//   questions,
//   sessionId,
//   playerName,
//   isLoading = false,
// }: GameGridProps) {
//   const [flipped, setFlipped] = useState<Set<string>>(new Set());
//   const [matched, setMatched] = useState<Set<number>>(new Set());
//   const [cards, setCards] = useState<CardItem[]>([]);

//   // Track the last processed questions ID to prevent redundant/cascading updates
//   const lastProcessedQuestionsRef = React.useRef<string>("");

//   // Helper function (unchanged logic)
//   const createShuffledCards = (qs: QuestionShape[]): CardItem[] => {
//     const newCards: CardItem[] = [];
//     qs.forEach((q) => {
//       newCards.push(
//         { id: `q${q.id}-0`, questionId: q.id, text: q.text, pairIndex: 0 },
//         { id: `q${q.id}-1`, questionId: q.id, text: q.text, pairIndex: 1 },
//       );
//     });
//     for (let i = newCards.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
//     }
//     return newCards;
//   };

//   useEffect(() => {
//     if (!questions || questions.length === 0) return;

//     // Create a unique key for the current set of questions
//     const questionsKey = JSON.stringify(questions.map((q) => q.id));

//     // Only proceed if the questions have actually changed
//     if (lastProcessedQuestionsRef.current === questionsKey) return;

//     // We use a micro-task (setTimeout 0) to push the state update
//     // out of the synchronous render cycle, resolving the "cascading renders" error.
//     const timeoutId = setTimeout(() => {
//       const newCards = createShuffledCards(questions);

//       setCards(newCards);
//       setFlipped(new Set());
//       setMatched(new Set());

//       lastProcessedQuestionsRef.current = questionsKey;
//     }, 0);

//     return () => clearTimeout(timeoutId);
//   }, [questions]);

//   // --- REST OF THE CODE (handleCardFlip and Match Logic) ---
//   // Note: I have kept your existing handleCardFlip logic exactly as is.

//   const handleCardFlip = useCallback(
//     async (cardId: string) => {
//       if (
//         matched.has(parseInt(cardId.split("q")[1])) ||
//         isLoading ||
//         !sessionId
//       ) {
//         return;
//       }

//       setFlipped((prev) => {
//         const next = new Set(prev);
//         if (next.has(cardId)) {
//           next.delete(cardId);
//         } else {
//           next.add(cardId);
//         }
//         return next;
//       });

//       try {
//         const ch = `presence-game-${sessionId}`;
//         const payload = {
//           channel: ch,
//           event: "card-flip",
//           data: {
//             who: playerName ?? "unknown",
//             card: cardId,
//             ts: new Date().toISOString(),
//           },
//         };

//         const res = await fetch("/api/pusher/", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         });

//         if (!res.ok) console.error("Failed to broadcast card flip");
//       } catch (err) {
//         console.error("Error broadcasting card flip:", err);
//       }
//     },
//     [sessionId, playerName, matched, isLoading],
//   );

//   useEffect(() => {
//     if (flipped.size !== 2) return;

//     const flippedArray = Array.from(flipped);
//     const card1 = cards.find((c) => c.id === flippedArray[0]);
//     const card2 = cards.find((c) => c.id === flippedArray[1]);

//     if (!card1 || !card2) return;

//     const timer = setTimeout(() => {
//       if (card1.questionId === card2.questionId) {
//         setMatched((prev) => new Set(prev).add(card1.questionId));
//         setFlipped(new Set());
//       } else {
//         setFlipped(new Set());
//       }
//     }, 500);

//     return () => clearTimeout(timer);
//   }, [flipped, cards]);

//   // ... (Remaining JSX/Grid logic remains identical to your original)

//   if (!questions || questions.length === 0) {
//     return (
//       <div className="text-center py-12">
//         <p className="text-gray-500">No questions loaded yet.</p>
//       </div>
//     );
//   }

//   const cardCount = cards.length;
//   let gridColsClass = "grid-cols-2";
//   if (cardCount >= 8) gridColsClass = "md:grid-cols-4 lg:grid-cols-5";
//   else if (cardCount >= 6) gridColsClass = "md:grid-cols-4 lg:grid-cols-4";
//   else if (cardCount >= 4) gridColsClass = "md:grid-cols-3 lg:grid-cols-4";

//   const gameWon = matched.size === questions.length;

//   return (
//     <div className="w-full">
//       <div className="mb-6 text-center">
//         <h3 className="text-lg font-semibold text-gray-800">Matching Game</h3>
//         <p className="text-sm text-gray-600 mt-1">
//           Matched: <span className="font-bold">{matched.size}</span> /{" "}
//           {questions.length}
//         </p>
//         {gameWon && (
//           <p className="text-green-600 font-semibold mt-2">🎉 You won!</p>
//         )}
//       </div>

//       <div
//         className={`grid grid-cols-2 ${gridColsClass} gap-2 md:gap-3 lg:gap-4 w-full auto-rows-max`}
//       >
//         {cards.map((card) => (
//           <div
//             key={card.id}
//             className="aspect-square"
//             style={{
//               pointerEvents: matched.has(card.questionId) ? "none" : "auto",
//               opacity: matched.has(card.questionId) ? 0.5 : 1,
//               transition: "opacity 0.3s ease-in-out",
//             }}
//           >
//             <GameCard
//               id={card.id}
//               text={card.text}
//               isFlipped={flipped.has(card.id)}
//               onClick={() => handleCardFlip(card.id)}
//               disabled={matched.has(card.questionId) || gameWon}
//             />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
