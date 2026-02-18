// src/app/game/matching/GameGrid.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import GameCard from "@/components/GameCard";
import { createSeededRandom } from "@/lib/seededRandom";
import Pusher, { Channel } from "pusher-js";
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
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Track the last processed questions ID to prevent redundant/cascading updates
  const lastProcessedQuestionsRef = React.useRef<string>("");

  // Pusher refs for listening to other players' flips
  const pusherRef = React.useRef<Pusher | null>(null);
  const channelRef = React.useRef<Channel | null>(null);

  // Environment reads (bundled at build time)
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";

  useEffect(() => {
    if (!questions || questions.length === 0 || !sessionId) return;

    const questionsKey = JSON.stringify(questions.map((q) => q.id));

    if (lastProcessedQuestionsRef.current === questionsKey) return;

    // Helper function (moved inside useEffect)
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

    const timeoutId = setTimeout(() => {
      const newCards = createShuffledCards(questions);

      setCards(newCards);
      setFlipped(new Set());
      setMatched(new Set());

      lastProcessedQuestionsRef.current = questionsKey;
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [questions, sessionId]);

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
        }
      } catch (err) {
        console.warn("GameGrid: error processing card-flip", err);
      }
    };

    const onRemoteUnflip = (data: unknown) => {
      try {
        const payload = data as { who?: string; cards?: string[] } | string;
        let who = "";
        let cards_to_remove: string[] = [];

        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
          if (Array.isArray(obj.cards)) {
            cards_to_remove = obj.cards.filter(
              (c): c is string => typeof c === "string",
            );
          }
        }

        if (who && who !== playerName && cards_to_remove.length > 0) {
          setRemoteFlipped((prev) => {
            const next = new Set(prev);
            cards_to_remove.forEach((card) => next.delete(card));
            return next;
          });
        }
      } catch (err) {
        console.warn("GameGrid: error processing card-unflip", err);
      }
    };

    const onRemoteMatch = (data: unknown) => {
      try {
        const payload = data as { who?: string; questionId?: number } | string;
        let who = "";
        let questionId: number | undefined;

        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
          questionId =
            typeof obj.questionId === "number" ? obj.questionId : undefined;
        }

        if (who && who !== playerName && questionId !== undefined) {
          setMatched((prev) => new Set(prev).add(questionId));
        }
      } catch (err) {
        console.warn("GameGrid: error processing card-match", err);
      }
    };

    channel.bind("card-flip", onRemoteFlip);
    channel.bind("card-unflip", onRemoteUnflip);
    channel.bind("card-match", onRemoteMatch);

    // When subscription completes, pick a random starting player and announce
    const onSub = () => {
      try {
        const membersArr: string[] = [];
        const m = (
          channel as unknown as {
            members?: { each?: (fn: (mem: PresenceMember) => void) => void };
          }
        ).members;
        if (m && typeof m.each === "function") {
          m.each((mem: PresenceMember) => {
            const name = mem.info?.name ?? mem.info?.username ?? mem.id;
            if (typeof name === "string") membersArr.push(name);
          });
        }

        if (membersArr.length === 0) return;

        // choose random starter
        const chosen =
          membersArr[Math.floor(Math.random() * membersArr.length)];
        // announce turn-start (best-effort; any client may announce)
        const payload = {
          channel: `presence-game-${sessionId}`,
          event: "turn-start",
          data: { who: chosen, ts: new Date().toISOString() },
        };
        fetch("/api/pusher/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    channel.bind(
      "pusher:subscription_succeeded",
      onSub as unknown as (...args: unknown[]) => void,
    );

    const onTurnStart = (data: unknown) => {
      try {
        const payload = data as { who?: string } | string;
        let who = "";
        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
        }
        if (who) setActivePlayer(who);
      } catch {}
    };

    const onTurnPass = (data: unknown) => {
      try {
        const payload = data as { who?: string } | string;
        let who = "";
        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
        }
        if (who) setActivePlayer(who);
      } catch {}
    };

    const onTurnKeep = (data: unknown) => {
      try {
        const payload = data as { who?: string } | string;
        let who = "";
        if (typeof payload === "object" && payload !== null) {
          const obj = payload as Record<string, unknown>;
          who = typeof obj.who === "string" ? obj.who : "";
        }
        if (who) setActivePlayer(who);
      } catch {}
    };

    channel.bind("turn-start", onTurnStart);
    channel.bind("turn-pass", onTurnPass);
    channel.bind("turn-keep", onTurnKeep);

    return () => {
      try {
        if (channelRef.current) {
          channel.unbind("card-flip", onRemoteFlip);
          channel.unbind("card-unflip", onRemoteUnflip);
          channel.unbind("card-match", onRemoteMatch);
          channel.unbind(
            "pusher:subscription_succeeded",
            onSub as unknown as (...args: unknown[]) => void,
          );
          channel.unbind("turn-start", onTurnStart);
          channel.unbind("turn-pass", onTurnPass);
          channel.unbind("turn-keep", onTurnKeep);
          pusher.unsubscribe(channelName);
        }
        pusher.disconnect();
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
      // basic guards
      if (
        matched.has(parseInt(cardId.split("q")[1])) ||
        isLoading ||
        !sessionId
      ) {
        return;
      }

      // enforce turn-taking and resolving lock
      if (!activePlayer || activePlayer !== (playerName ?? null)) return;
      if (isResolving) return;

      setFlipped((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
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
    [sessionId, playerName, matched, isLoading, activePlayer, isResolving],
  );

  useEffect(() => {
    if (flipped.size !== 2) return;

    const flippedArray = Array.from(flipped);
    const card1 = cards.find((c) => c.id === flippedArray[0]);
    const card2 = cards.find((c) => c.id === flippedArray[1]);

    if (!card1 || !card2) return;
    // lock flips while resolving
    setIsResolving(true);

    const timer = setTimeout(() => {
      try {
        if (card1.questionId === card2.questionId) {
          // Match found
          setMatched((prev) => new Set(prev).add(card1.questionId));
          setFlipped(new Set());

          // Broadcast match event to other players
          try {
            const ch = `presence-game-${sessionId}`;
            const payload = {
              channel: ch,
              event: "card-match",
              data: {
                who: playerName ?? "unknown",
                questionId: card1.questionId,
                ts: new Date().toISOString(),
              },
            };

            fetch("/api/pusher/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => console.error("Failed to broadcast match"));
          } catch (err) {
            console.error("Error broadcasting match:", err);
          }

          // same player keeps the turn
          try {
            const ch = `presence-game-${sessionId}`;
            const payload = {
              channel: ch,
              event: "turn-keep",
              data: {
                who: playerName ?? "unknown",
                ts: new Date().toISOString(),
              },
            };
            fetch("/api/pusher/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => {});
          } catch {}
        } else {
          // No match - flip cards back and broadcast unflip event
          setFlipped(new Set());

          try {
            const ch = `presence-game-${sessionId}`;
            const payload = {
              channel: ch,
              event: "card-unflip",
              data: {
                who: playerName ?? "unknown",
                cards: [card1.id, card2.id],
                ts: new Date().toISOString(),
              },
            };

            fetch("/api/pusher/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => console.error("Failed to broadcast unflip"));
          } catch (err) {
            console.error("Error broadcasting unflip:", err);
          }

          // determine next player and broadcast turn-pass
          try {
            const channelAny = channelRef.current as unknown as {
              members?: { each?: (fn: (mem: PresenceMember) => void) => void };
            };
            const membersArr: string[] = [];
            if (
              channelAny &&
              channelAny.members &&
              typeof channelAny.members.each === "function"
            ) {
              channelAny.members.each((mem: PresenceMember) => {
                const name = mem.info?.name ?? mem.info?.username ?? mem.id;
                if (typeof name === "string") membersArr.push(name);
              });
            }

            // pick next different player (simple round-robin/random fallback)
            let next: string | null = null;
            if (membersArr.length > 0) {
              const others = membersArr.filter((n) => n !== (playerName ?? ""));
              if (others.length > 0) next = others[0];
              else next = membersArr[0];
            }

            if (next) {
              const ch2 = `presence-game-${sessionId}`;
              const payload2 = {
                channel: ch2,
                event: "turn-pass",
                data: { who: next, ts: new Date().toISOString() },
              };
              fetch("/api/pusher/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload2),
              }).catch(() => {});
              // locally set next player so UI updates immediately
              setActivePlayer(next);
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setIsResolving(false);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      setIsResolving(false);
    };
  }, [flipped, cards, sessionId, playerName]);

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
        <div className="mt-2">
          {activePlayer ? (
            activePlayer === (playerName ?? null) ? (
              <p className="text-sm text-blue-600 font-semibold">Your turn</p>
            ) : (
              <p className="text-sm text-gray-700">Turn: {activePlayer}</p>
            )
          ) : (
            <p className="text-sm text-gray-400">Waiting for players…</p>
          )}

          {isResolving && (
            <p className="text-xs text-gray-500 mt-1">Resolving...</p>
          )}
        </div>
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
