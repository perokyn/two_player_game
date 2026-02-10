// src/app/game/usePresencePusher.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Pusher, { Channel } from "pusher-js";

/**
 * Public shape of a presence member's info (must match server's user_info)
 */
export interface PresenceUserInfo {
  name: string;
}

/**
 * Map of user_id -> PresenceUserInfo
 */
export type PresenceMembers = Record<string, PresenceUserInfo> | null;

/**
 * The subscription succeeded payload may vary by pusher client version:
 * - some clients pass { members: { each: (cb) => void } }
 * - some pass { members: { <userId>: { info: {...} } } }
 * - some don't pass members and the runtime keeps members on channel.members
 *
 * We'll handle all common shapes defensively.
 */

export default function usePresencePusher(sessionId: number | string | null) {
  // Read build-time envs synchronously
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";
  const isMisconfigured = key.length === 0 || cluster.length === 0;
  const misconfigMessage = isMisconfigured
    ? "Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER"
    : null;

  // ALWAYS call hooks in the same order (no early returns before hooks)
  const [connected, setConnected] = useState<boolean>(false);
  const [members, setMembers] = useState<PresenceMembers>(null);
  const [error, setError] = useState<string | null>(misconfigMessage);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    // Bail early if misconfigured or no sessionId; state was initialized above
    if (isMisconfigured) return;
    if (!sessionId) return;

    // Create Pusher instance (key & cluster are present)
    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      forceTLS: true,
    });

    pusherRef.current = pusher;

    const channelName = `presence-game-${sessionId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    /**
     * Helper: setMembersFromMap
     * Accepts a plain map object where value can be either { info: {...} } or info directly.
     */
    function setMembersFromMap(mapObj: Record<string, unknown>) {
      const nextMembers: Record<string, PresenceUserInfo> = {};
      for (const [id, value] of Object.entries(mapObj)) {
        if (
          value &&
          typeof value === "object" &&
          "info" in (value as Record<string, unknown>)
        ) {
          const maybeWrapper = value as Record<string, unknown>;
          const info = maybeWrapper["info"] as PresenceUserInfo | undefined;
          if (info && typeof info.name === "string") {
            nextMembers[id] = info;
          } else {
            // Fallback if shape is unexpected: try using value as info
            nextMembers[id] = {
              name: String(maybeWrapper["info"] ?? "unknown"),
            };
          }
        } else {
          // value is likely the info object itself
          const info = value as PresenceUserInfo | undefined;
          nextMembers[id] = { name: String(info?.name ?? "unknown") };
        }
      }
      setMembers(nextMembers);
    }

    /**
     * Robust handler for subscription success
     * - tries multiple payload shapes
     * - falls back to channelRef.current.members if available
     */
    channel.bind("pusher:subscription_succeeded", (payload: unknown) => {
      setConnected(true);

      // 1) payload.members.each(...) shape
      try {
        if (payload && typeof payload === "object") {
          const pObj = payload as Record<string, unknown>;
          const membersCandidate = pObj["members"];
          if (membersCandidate && typeof membersCandidate === "object") {
            // check for each()
            const eachFn = (membersCandidate as Record<string, unknown>)[
              "each"
            ];
            if (typeof eachFn === "function") {
              // membersCandidate has an each(cb) API
              const nextMembers: Record<string, PresenceUserInfo> = {};
              try {
                // call each and collect members (membersCandidate.each will call our callback synchronously)
                (
                  membersCandidate as {
                    each: (
                      cb: (m: { id: string; info: unknown }) => void,
                    ) => void;
                  }
                ).each((member) => {
                  const id = String(member.id ?? "unknown");
                  const infoObj = member.info as
                    | Record<string, unknown>
                    | undefined;
                  const name =
                    infoObj && typeof infoObj["name"] === "string"
                      ? (infoObj["name"] as string)
                      : "unknown";
                  nextMembers[id] = { name };
                });
                setMembers(nextMembers);
                return;
              } catch {
                // fall through to other shapes
              }
            }
          }
        }
      } catch {
        // ignore and try next
      }

      // 2) payload.members as plain map shape: { members: { userId: { info: {...} } } }
      try {
        if (payload && typeof payload === "object") {
          const pObj = payload as Record<string, unknown>;
          const membersCandidate = pObj["members"];
          if (
            membersCandidate &&
            typeof membersCandidate === "object" &&
            !("each" in (membersCandidate as Record<string, unknown>))
          ) {
            setMembersFromMap(membersCandidate as Record<string, unknown>);
            return;
          }
        }
      } catch {
        // ignore and try fallback
      }

      // 3) fallback to channelRef.current.members (pusher-js runtime storage)
      try {
        const ch = channelRef.current as unknown;
        if (ch && typeof ch === "object") {
          const chObj = ch as Record<string, unknown>;

          // chObj.members may have .each or .members map
          const chMembers = chObj["members"];
          if (chMembers && typeof chMembers === "object") {
            // if it has each()
            if (
              typeof (chMembers as Record<string, unknown>)["each"] ===
              "function"
            ) {
              const nextMembers: Record<string, PresenceUserInfo> = {};
              (
                chMembers as {
                  each: (
                    cb: (m: { id: string; info: unknown }) => void,
                  ) => void;
                }
              ).each((m) => {
                const id = String(m.id ?? "unknown");
                const infoObj = m.info as Record<string, unknown> | undefined;
                const name =
                  infoObj && typeof infoObj["name"] === "string"
                    ? (infoObj["name"] as string)
                    : "unknown";
                nextMembers[id] = { name };
              });
              setMembers(nextMembers);
              return;
            }

            // otherwise maybe chMembers.members is a plain map
            const maybeMap = (chMembers as Record<string, unknown>)["members"];
            if (maybeMap && typeof maybeMap === "object") {
              setMembersFromMap(maybeMap as Record<string, unknown>);
              return;
            }

            // lastly if chMembers itself is a plain map
            if (!("each" in (chMembers as Record<string, unknown>))) {
              setMembersFromMap(chMembers as Record<string, unknown>);
              return;
            }
          }
        }
      } catch {
        // ignore fallback
      }

      // final fallback: no members available yet
      setMembers(null);
    });

    channel.bind("pusher:member_added", (member: unknown) => {
      try {
        if (!member || typeof member !== "object") return;
        const mObj = member as Record<string, unknown>;
        const id = String(mObj["id"] ?? "unknown");
        const info = (mObj["info"] ?? mObj) as Record<string, unknown>;
        const name =
          typeof info["name"] === "string"
            ? (info["name"] as string)
            : String(info["name"] ?? "unknown");
        setMembers((prev) => ({ ...(prev ?? {}), [id]: { name } }));
      } catch {
        // ignore malformed member
      }
    });

    channel.bind("pusher:member_removed", (member: unknown) => {
      try {
        if (!member || typeof member !== "object") return;
        const mObj = member as Record<string, unknown>;
        const id = String(mObj["id"] ?? "unknown");
        setMembers((prev) => {
          if (!prev) return prev;
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      } catch {
        // ignore malformed member
      }
    });

    // handle connection errors
    pusher.connection.bind("error", (err: unknown) => {
      try {
        if (err && typeof err === "object") {
          const eObj = err as Record<string, unknown>;
          setError(
            String(
              eObj["error"] ?? eObj["message"] ?? "Pusher connection error",
            ),
          );
        } else {
          setError(String(err ?? "Pusher connection error"));
        }
      } catch {
        setError("Pusher connection error");
      }
      setConnected(false);
    });

    // cleanup on unmount or when sessionId changes
    return () => {
      try {
        if (channelRef.current) {
          // call unbind_all if available
          const chObj = channelRef.current as unknown as Record<
            string,
            unknown
          >;
          const unbindAll = chObj["unbind_all"] as unknown;
          if (typeof unbindAll === "function") {
            const unbindAll = chObj["unbind_all"];
            if (typeof unbindAll === "function") {
              (unbindAll as () => void).call(channelRef.current);
            }
          }
          pusher.unsubscribe(channelName);
        }
        pusher.disconnect();
      } catch (cleanupErr) {
        // eslint-disable-next-line no-console
        console.warn("Pusher cleanup error", cleanupErr);
      } finally {
        pusherRef.current = null;
        channelRef.current = null;
        setConnected(false);
        setMembers(null);
      }
    };
    // sessionId is the main dep; key/cluster are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isMisconfigured, key, cluster]);

  return { connected, members, error };
}
