// src/components/SettingsWorkspace.tsx
"use client";

import React, { useState, useEffect } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

interface SettingsWorkspaceProps {
  sessionId?: number | null;
}

export default function SettingsWorkspace({ sessionId }: SettingsWorkspaceProps) {
  const [cardCoverUrl, setCardCoverUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Fetch current settings on load
  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      try {
        setLoading(true);
        const query = sessionId ? `?sessionId=${sessionId}` : "";
        const res = await fetch(`/api/admin/settings${query}`);
        const data = await res.json();
        
        if (!active) return;
        
        if (res.ok) {
          // If we have an active session setting, prefer that, otherwise use counselor default
          setCardCoverUrl(data.sessionCardCoverUrl || data.defaultCardCoverUrl || "");
          setActiveSessionId(data.sessionId || null);
        } else {
          setMessage(data.error || "Failed to load settings");
          setIsError(true);
        }
      } catch (err) {
        if (active) {
          setMessage("Network error loading settings");
          setIsError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardCoverUrl: cardCoverUrl.trim() || null,
          sessionId: sessionId || activeSessionId,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Settings successfully updated and saved.");
        setIsError(false);
        // Sync active session if returned
        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
        }
      } else {
        setMessage(data.error || "Failed to save settings");
        setIsError(true);
      }
    } catch (err) {
      setMessage("Network error saving settings");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[var(--background)] rounded-2xl border border-[var(--border-subtle)] text-[var(--muted-foreground)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)] mb-4"></div>
        <p className="text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] rounded-2xl shadow-sm border border-[var(--border-subtle)] overflow-hidden transition-all duration-300">
      <div className="p-6 md:p-8 border-b border-[var(--border-subtle)] bg-[var(--muted-bg)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-soft-bg)] text-[var(--accent-primary)]">
            <Cog6ToothIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Game Settings</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Customize preferences for active and future game sessions.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-8">
          {/* Inputs */}
          <div className="flex-1 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Card Cover Image URL
              </label>
              <input
                type="url"
                value={cardCoverUrl}
                onChange={(e) => setCardCoverUrl(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all outline-none text-sm placeholder:text-[var(--muted-foreground)]/50"
                placeholder="e.g. https://images.unsplash.com/photo-..."
              />
              <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                Provide a public image URL to use as the face-down back cover for all game cards. If left blank, cards will default to standard color gradient covers.
              </p>
            </div>

            {/* Session Scope Notice */}
            <div className="p-4 rounded-xl bg-[var(--muted-bg)] border border-[var(--border-subtle)] text-xs space-y-2">
              <span className="font-bold text-[var(--foreground)] block">Scope of Changes:</span>
              <ul className="list-disc pl-4 space-y-1 text-[var(--muted-foreground)]">
                <li>Saved as your counselor default for future sessions.</li>
                {activeSessionId ? (
                  <li className="text-[var(--accent-soft-foreground)] font-medium">
                    Will apply immediately to your active session: <strong className="underline">Session #{activeSessionId}</strong>.
                  </li>
                ) : (
                  <li>No active session detected. Start a session to apply live.</li>
                )}
              </ul>
            </div>

            {/* Banners */}
            {message && (
              <div
                className={`p-4 rounded-xl border text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  isError
                    ? "bg-[var(--error-bg)] text-[var(--error-foreground)] border-[var(--error-border)]"
                    : "bg-[var(--success-bg)] text-[var(--success-foreground)] border-[var(--success-border)]"
                }`}
              >
                {isError ? (
                  <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 shrink-0" />
                )}
                <span className="font-medium">{message}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto inline-flex justify-center items-center px-6 py-3 rounded-lg shadow-sm font-semibold text-sm bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="w-full lg:w-72 flex flex-col items-center justify-start p-6 bg-[var(--muted-bg)] rounded-xl border border-[var(--border-subtle)] shrink-0">
            <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">
              Card Back Preview
            </span>
            
            <div className="w-48 h-48 rounded-xl shadow-xl overflow-hidden relative border border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-center transition-all duration-300">
              {cardCoverUrl.trim() ? (
                // Image Cover Preview
                <img
                  src={cardCoverUrl.trim()}
                  alt="Card Back Preview"
                  className="w-full h-full object-cover animate-in fade-in duration-300"
                  onError={(e) => {
                    // fall back gracefully if image url is broken
                    (e.target as HTMLImageElement).src = "";
                  }}
                />
              ) : null}

              {/* Fallback to Default gradient color cover if input is empty or image failed to render */}
              {!cardCoverUrl.trim() && (
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-indigo-700 p-4">
                  <span className="text-4xl mb-2 animate-bounce">🎴</span>
                  <span className="text-xs font-bold tracking-wide">Default Color</span>
                </div>
              )}
            </div>
            
            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              This is how the closed card will look during matchmaking.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
