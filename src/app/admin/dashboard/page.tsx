// src/app/admin/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardIcon,
  Bars3Icon,
  XMarkIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import QuestionList, { Question } from "@/components/QuestionList";
import SunnyIcon from "@mui/icons-material/Sunny";
import { Session } from "inspector/promises";
import { SessionSetup } from "./SessionSetup";

/* keep PasscodeResponse type and JoinCurrentGameButton as before */
type PasscodeResponse = {
  id: number;
  code: string;
  sessionId: number;
  expiresAt: string;
};

type QuestionSetItem = {
  id: number;
  name: string;
  createdAt: string;
  questionCount: number;
};

interface JoinCurrentGameButtonProps {
  isReady: boolean;
}

function JoinCurrentGameButton({ isReady }: JoinCurrentGameButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
    if (!isReady) return;
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch("/api/admin/join-current-session", {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j?.error ?? "Failed to join session");
        return;
      }
      router.push("/game");
    } catch (e) {
      setErr(String((e as Error)?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {!isReady && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Game not ready:</strong> You must attach a question set
            before anyone can join.
          </p>
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={loading || !isReady}
        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-md shadow-sm transition font-medium ${
          isReady
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60"
        }`}
      >
        {loading ? "Joining..." : "Step 3: Join and Play"}
      </button>
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [passcode, setPasscode] = useState<PasscodeResponse | null>(null);
  const [message, setMessage] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  // Theme Management
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "generate" | "controls" | "questions" | "notes" | "settings"
  >("generate");

  const [liveQuestions, setLiveQuestions] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [setName, setSetName] = useState<string>("");
  const [savingSet, setSavingSet] = useState<boolean>(false);

  const [questionSets, setQuestionSets] = useState<QuestionSetItem[]>([]);
  const [loadingSets, setLoadingSets] = useState<boolean>(false);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [loadingLoadSet, setLoadingLoadSet] = useState<boolean>(false);

  // Workflow states
  const [attaching, setAttaching] = useState<boolean>(false);
  const [isAttached, setIsAttached] = useState<boolean>(false);

  const targetSessionId =
    passcode?.sessionId ?? (sessionId ? Number(sessionId) : undefined);
  const hasSession = targetSessionId !== undefined && !isNaN(targetSessionId);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  useEffect(() => {
    if (selectedMenu !== "questions") return;

    let cancelled = false;
    async function load() {
      setLoadingSets(true);
      try {
        const res = await fetch("/api/admin/question-sets");
        const data = await res.json();
        if (!res.ok) {
          setMessage("Unable to load saved sets");
          setQuestionSets([]);
          return;
        }
        if (!cancelled) {
          setQuestionSets(data.sets ?? []);
        }
      } catch (err) {
        setMessage("Network error loading sets");
        setQuestionSets([]);
      } finally {
        if (!cancelled) setLoadingSets(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMenu]);

  async function loadSetById(id: number) {
    setLoadingLoadSet(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/question-sets?id=${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load set");
      }
      const setObj = data.set;
      const questions: string[] = Array.isArray(setObj?.questions)
        ? [...setObj.questions]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((q) => q.text ?? "")
        : [];
      setLiveQuestions(questions);
      setSelectedSetId(id);
      setIsAttached(false); // Reset attached state when loading a new set
      setMessage(`Loaded set "${setObj?.name}"`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load set");
    } finally {
      setLoadingLoadSet(false);
    }
  }

  const questionsToStrings = React.useCallback((qs: { text: string }[]) => {
    return qs.map((q) =>
      typeof q?.text === "string" ? q.text : String(q?.text ?? ""),
    );
  }, []);

  const stringArrayEqual = React.useCallback((a: string[], b: string[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }, []);

  async function createPass(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage("");
    setCreating(true);
    setIsAttached(false); // Reset workflow on new session

    try {
      const res = await fetch("/api/admin/generate-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          expiresMinutes: 10,
        }),
      });
      const j = await res.json();

      if (res.ok) {
        const received: PasscodeResponse = (j?.passcode ??
          j) as PasscodeResponse;
        setPasscode(received ?? null);
        setMessage("Session created. Now select questions.");
      } else {
        setMessage(j?.error || "Failed to create passcode");
      }
    } catch (err) {
      setMessage("Network error while creating passcode");
    } finally {
      setCreating(false);
    }
  }

  function copyPasscodeToClipboard() {
    if (!passcode) return;
    try {
      navigator.clipboard.writeText(passcode.code);
      setMessage("Passcode copied.");
    } catch {
      setMessage("Unable to copy to clipboard.");
    }
  }

  async function handleSaveSet(e?: React.FormEvent) {
    e?.preventDefault();
    if (!liveQuestions.length || !setName.trim()) return;

    setSavingSet(true);
    try {
      const res = await fetch("/api/admin/question-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setName.trim(),
          questions: liveQuestions,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setShowSaveModal(false);
      setSetName("");
      setMessage("Question set saved.");
      // refresh
      const listRes = await fetch("/api/admin/question-sets");
      if (listRes.ok) {
        const listJson = await listRes.json();
        setQuestionSets(listJson.sets ?? []);
      }
    } catch (err) {
      setMessage("Failed to save set.");
    } finally {
      setSavingSet(false);
    }
  }

  async function handleAttachSet() {
    if (!selectedSetId || !hasSession) return;
    setAttaching(true);
    try {
      const res = await fetch("/api/admin/attach-question-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: selectedSetId,
          sessionId: targetSessionId,
        }),
      });
      if (!res.ok) throw new Error("Attach failed");
      setIsAttached(true);
      setMessage("Everything is ready! You can now join the session.");
    } catch (err) {
      setMessage("Failed to attach set.");
    } finally {
      setAttaching(false);
    }
  }

  const defaultQuestions = React.useMemo(
    () => [
      "What's been on your mind recently?",
      "What's one small win you've had this week?",
      "Are there things you avoid that you'd like to change?",
      "How are you sleeping and eating lately?",
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`bg-white dark:bg-gray-900/150 border-r border-gray-200 dark:border-gray-200 transition-all duration-200 ${sidebarOpen ? "w-64" : "w-16"}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white rounded-md w-9 h-9 flex items-center justify-center font-semibold">
                  C
                </div>
                {sidebarOpen && (
                  <div className="text-lg font-semibold">Counselor</div>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="h-5 w-5 text-gray-600" />
                ) : (
                  <Bars3Icon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
              <SidebarButton
                label="Setup Session"
                onClick={() => setSelectedMenu("questions")}
                open={sidebarOpen}
                active={selectedMenu === "questions"}
              />
              <SidebarButton
                label="Controls"
                onClick={() => setSelectedMenu("controls")}
                open={sidebarOpen}
                active={selectedMenu === "controls"}
              />
              <SidebarButton
                label="Notes"
                onClick={() => setSelectedMenu("notes")}
                open={sidebarOpen}
                active={selectedMenu === "notes"}
              />
              <SidebarButton
                label="Settings"
                onClick={() => setSelectedMenu("settings")}
                open={sidebarOpen}
                active={selectedMenu === "settings"}
              />
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-6">
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold ">Admin Dashboard</h1>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                onClick={toggleTheme}
              />
              {/* <!-- Embossed Track --> */}
              <div
                className="w-20 h-10 bg-gray-200 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] 
              peer-checked:bg-gray-500 transition-colors duration-300"
              ></div>

              {/* <!-- Sliding Thumb --> */}
              <div
                className="absolute left-1 top-1 w-8 h-8 bg-white rounded-full shadow-md border-2 border-gray-100 peer-checked:border-gray-100 
              transition-transform duration-300 peer-checked:translate-x-10 "
              >
                <div className="text-gray-500 text-lg justify-center flex items-center h-full">
                  {" "}
                  {theme === "light" ? <SunnyIcon /> : <MoonIcon />}
                </div>
              </div>

              {/* <!-- Embedded Text --> */}
              <span className="absolute left-10 text-[10px] font-semibold text-gray-600 peer-checked:hidden leading-3">
                LIGHT <br /> MODE
              </span>
              <span className=" display: block absolute left-3 text-[10px] font-semibold text-white hidden peer-checked:block leading-3">
                DARK
                <br /> MODE
              </span>
            </label>
          </header>

          <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
            <div className="lg:col-span-3  p-6 rounded-lg shadow-sm border  dark:border-gray-400 backdrop-blur-sm">
              {selectedMenu === "questions" && (
                <div className="space-y-8">
                  {/* STEP 1: SESSION */}
                  <SessionSetup
                    hasSession={hasSession}
                    createPass={createPass}
                    sessionId={sessionId}
                    setSessionId={setSessionId}
                    creating={creating}
                    passcode={passcode}
                    copyPasscodeToClipboard={copyPasscodeToClipboard}
                    CheckCircleIcon={CheckCircleIcon}
                    ClipboardIcon={ClipboardIcon}
                  />

                  {/* VISUAL BRIDGE */}
                  <div className="flex justify-center -my-4 relative z-10">
                    <div
                      className={`p-2 rounded-full border-2 shadow-sm transition-all ${
                        isAttached
                          ? "bg-emerald-600 border-white dark:border-gray-900"
                          : hasSession && selectedSetId
                            ? "bg-indigo-600 border-white dark:border-gray-900 animate-pulse"
                            : "bg-gray-200 border-white dark:border-gray-900"
                      }`}
                    >
                      <LinkIcon
                        className={`h-6 w-6 ${isAttached || (hasSession && selectedSetId) ? "text-white" : "text-gray-400 dark:text-gray-500"}`}
                      />
                    </div>
                  </div>

                  {/* STEP 2: QUESTIONS */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-colors ${isAttached ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-indigo-100 bg-gray-50 dark:border-indigo-900/20 dark:bg-gray-200/10"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${isAttached ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"}`}
                        >
                          2
                        </span>
                        <h2 className="text-lg font-semibold ">
                          Step 2: Attach Question Set
                        </h2>
                      </div>
                      {isAttached && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          <CheckCircleIcon className="h-5 w-5" /> Attached to
                          Session
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <QuestionList
                          initial={
                            liveQuestions.length > 0
                              ? liveQuestions
                              : defaultQuestions
                          }
                          onChange={(q) => {
                            const next = questionsToStrings(q);
                            setLiveQuestions((prev) =>
                              stringArrayEqual(prev, next) ? prev : next,
                            );
                            setIsAttached(false);
                          }}
                        />
                      </div>

                      <div className="w-full md:w-72 space-y-4">
                        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            Load Saved Set
                          </label>
                          <div className="space-y-2">
                            <select
                              value={selectedSetId ?? ""}
                              onChange={(e) =>
                                setSelectedSetId(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            >
                              <option value="">-- Select --</option>
                              {questionSets.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.questionCount})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                selectedSetId && loadSetById(selectedSetId)
                              }
                              disabled={!selectedSetId || loadingLoadSet}
                              className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition shadow-sm"
                            >
                              {loadingLoadSet ? "Loading..." : "Load selected"}
                            </button>
                          </div>
                        </div>

                        {!hasSession && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 italic">
                            * Please complete Step 1 to enable attaching.
                          </div>
                        )}

                        <button
                          onClick={handleAttachSet}
                          disabled={!selectedSetId || attaching || !hasSession}
                          className={`w-full py-3 rounded-md flex items-center justify-center gap-2 font-bold transition shadow-md ${
                            isAttached
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30"
                          }`}
                        >
                          {attaching
                            ? "Syncing..."
                            : isAttached
                              ? "Successfully Synced"
                              : "Attach to Session"}
                          {!attaching && !isAttached && (
                            <ArrowRightIcon className="h-4 w-4" />
                          )}
                          {isAttached && (
                            <CheckCircleIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: JOIN */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col items-start">
                    <div className="flex mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${isAttached ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"}`}
                        >
                          3
                        </span>
                        <h2 className="text-lg font-semibold ">
                          Step 3: Join Current Game
                        </h2>
                      </div>
                    </div>
                    <JoinCurrentGameButton isReady={isAttached} />
                    {message && (
                      <p className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                        {message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedMenu !== "questions" && (
                <div className="flex items-center justify-center h-64 text-gray-400 italic">
                  Select Setup Session from the sidebar to begin the guided
                  workflow.
                </div>
              )}
            </div>

            <aside className="bg-white dark:bg-gray-900/150 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Quick notes
                </h3>
                <textarea
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private session notes..."
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </aside>
          </section>
        </div>
      </div>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-2">Save New Set</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Set Name
                </label>
                <input
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                  placeholder="e.g. Session 1 Intake"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSet}
                  disabled={savingSet}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  label,
  onClick,
  open,
  active,
}: {
  label: string;
  onClick: () => void;
  open: boolean;
  active?: boolean;
}) {
  const IconText = label
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${open ? "justify-start" : "justify-center"} ${active ? "bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500" : ""}`}
      role="button"
    >
      <div className="text-lg">{IconText}</div>
      {open && (
        <div className="text-sm text-gray-700 dark:text-gray-300">{label}</div>
      )}
    </div>
  );
}
