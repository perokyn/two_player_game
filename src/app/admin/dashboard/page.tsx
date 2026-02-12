// src/app/admin/dashboard/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import QuestionList from "@/components/QuestionList";

/* keep PasscodeResponse type and JoinCurrentGameButton as before */
type PasscodeResponse = {
  id: number;
  code: string;
  sessionId: number;
  expiresAt: string;
};

function JoinCurrentGameButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
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
      <button
        onClick={handleJoin}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? "Joining..." : "Join current game"}
      </button>
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [passcode, setPasscode] = useState<PasscodeResponse | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // NEW: selected menu (controls which center panel is shown)
  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "generate" | "controls" | "questions" | "notes" | "settings"
  >("generate");

  async function createPass(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage("");
    setCreating(true);

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
        const received: PasscodeResponse | undefined = (j?.passcode ??
          j) as PasscodeResponse;
        setPasscode(received ?? null);
        const expires =
          j?.passcode?.expiresAt ?? j?.expiresAt ?? received?.expiresAt;
        setMessage(
          `Passcode generated (expires at ${expires ? new Date(expires).toLocaleTimeString() : "unknown"})`,
        );
      } else {
        setMessage(j?.error || "Failed to create passcode");
      }
    } catch (err) {
      console.error("create-passcode error", err);
      setMessage("Network/server error while creating passcode");
    } finally {
      setCreating(false);
    }
  }

  function copyPasscodeToClipboard() {
    if (!passcode) return;
    try {
      navigator.clipboard.writeText(passcode.code);
      setMessage("Passcode copied to clipboard.");
    } catch {
      setMessage("Unable to copy to clipboard on this device.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 transition-all duration-200 ${sidebarOpen ? "w-64" : "w-16"}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white rounded-md w-9 h-9 flex items-center justify-center font-semibold">
                  C
                </div>
                {sidebarOpen && (
                  <div className="text-lg font-semibold">Counselor</div>
                )}
              </div>

              <button
                className="p-1 rounded-md hover:bg-gray-100"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
                onClick={() => setSidebarOpen((s) => !s)}
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
                label="Dashboard"
                onClick={() => setSelectedMenu("dashboard")}
                open={sidebarOpen}
                active={selectedMenu === "dashboard"}
              />
              <SidebarButton
                label="Generate passcode"
                onClick={() => setSelectedMenu("generate")}
                open={sidebarOpen}
                active={selectedMenu === "generate"}
              />
              <SidebarButton
                label="Therapy Questions"
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

            <div className="p-3 border-t border-gray-100">
              {sidebarOpen ? (
                <div className="text-sm text-gray-600">
                  Logged in as <strong>Admin</strong>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center">Admin</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-6">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Control center for counseling sessions
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:shadow-sm"
              >
                <Bars3Icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {sidebarOpen ? "Hide menu" : "Show menu"}
                </span>
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Center column: dynamic based on selectedMenu */}
            <div className="md:col-span-2 bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              {selectedMenu === "generate" && (
                <>
                  <h2 className="text-lg font-medium mb-3">Passcode</h2>

                  <form onSubmit={createPass} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Session ID (optional)
                      </label>
                      <input
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        placeholder="Leave blank to create a new session"
                        className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
                      >
                        {creating ? "Creating…" : "Create Passcode"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSessionId("");
                          setPasscode(null);
                          setMessage("");
                        }}
                        className="px-3 py-2 rounded-md border border-gray-200"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  <div className="mt-4">
                    {message && (
                      <div className="text-sm text-gray-700">{message}</div>
                    )}

                    {passcode && (
                      <div className="mt-3 flex items-center gap-3">
                        <div>
                          <div className="text-sm text-gray-500">Passcode</div>
                          <div className="text-2xl font-mono font-semibold">
                            {passcode.code}
                          </div>
                          <div className="text-xs text-gray-400">
                            Session {passcode.sessionId}
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={copyPasscodeToClipboard}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            <ClipboardIcon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">Copy</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <JoinCurrentGameButton />
                  </div>
                </>
              )}

              {selectedMenu === "questions" && (
                // show the QuestionList component
                <div>
                  <QuestionList
                    initial={[
                      "What's been on your mind recently?",
                      "What's one small win you've had this week?",
                      "Are there things you avoid that you'd like to change?",
                      "How are you sleeping and eating lately?",
                    ]}
                    onChange={(q) => {
                      // for now, just log — can persist later via API
                      console.debug("questions changed:", q);
                    }}
                  />
                </div>
              )}

              {selectedMenu === "controls" && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Controls</h2>
                  <p className="text-sm text-gray-500">
                    Session controls and quick actions.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <button className="px-3 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600">
                      Start session
                    </button>
                    <button className="px-3 py-2 rounded-md bg-rose-500 text-white hover:bg-rose-600">
                      End session
                    </button>
                  </div>
                </div>
              )}

              {selectedMenu === "notes" && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Notes</h2>
                  <p className="text-sm text-gray-500">
                    Private session notes (local only for now).
                  </p>
                  <textarea
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take private notes here..."
                    className="w-full rounded-md border border-gray-200 p-3 mt-3"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(notes);
                      }}
                      className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
                    >
                      Copy notes
                    </button>
                    <button
                      onClick={() => setNotes("")}
                      className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {selectedMenu === "settings" && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Settings</h2>
                  <p className="text-sm text-gray-500">
                    App and session settings go here.
                  </p>
                </div>
              )}

              {selectedMenu === "dashboard" && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Overview</h2>
                  <p className="text-sm text-gray-500">
                    Quick stats and information about active sessions.
                  </p>
                </div>
              )}
            </div>

            {/* Right column: quick notes / actions (always visible) */}
            <aside className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium mb-3">Quick notes</h3>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take private notes here (local only for now)."
                className="w-full rounded-md border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-indigo-300"
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(notes);
                  }}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
                >
                  Copy notes
                </button>
                <button
                  onClick={() => setNotes("")}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
                >
                  Clear
                </button>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Quick controls</h4>
                <div className="flex flex-col gap-2">
                  <button className="px-3 py-2 rounded-md bg-yellow-500 text-white text-sm hover:bg-yellow-600">
                    Start session
                  </button>
                  <button className="px-3 py-2 rounded-md bg-rose-500 text-white text-sm hover:bg-rose-600">
                    End session
                  </button>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}

/* small helper: SidebarButton */
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
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 ${open ? "justify-start" : "justify-center"} ${active ? "bg-indigo-50 border-l-4 border-indigo-500" : ""}`}
      role="button"
    >
      <div className="text-lg">
        {label
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>
      {open && <div className="text-sm text-gray-700">{label}</div>}
    </div>
  );
}

// // src/app/admin/dashboard/page.tsx
// "use client";

// import React, { useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ClipboardIcon,
//   MinusIcon,
//   XMarkIcon,
// } from "@heroicons/react/24/outline";

// /**
//  * Admin Dashboard with collapsible side menu
//  *
//  * This preserves your existing request shapes:
//  * - POST /api/admin/generate-passcode with body { sessionId, expiresMinutes }
//  * - POST /api/admin/join-current-session (no body)
//  *
//  * The generate / join behaviors are preserved: I only adjusted UI and added a small copy button.
//  *
//  * Requires Tailwind CSS for styling. If you prefer plain CSS, I can return an inline-styles variant.
//  */

// // Lightweight local type used for UI display only
// type PasscodeResponse = {
//   id: number;
//   code: string;
//   sessionId: number;
//   expiresAt: string;
// };

// function JoinCurrentGameButton() {
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const router = useRouter();

//   async function handleJoin() {
//     try {
//       setErr(null);
//       setLoading(true);
//       const res = await fetch("/api/admin/join-current-session", {
//         method: "POST",
//       });
//       const j = await res.json();
//       if (!res.ok) {
//         setErr(j?.error ?? "Failed to join session");
//         return;
//       }
//       // The endpoint sets cg_user_session cookie — now navigate to /game
//       router.push("/game");
//     } catch (e) {
//       setErr(String((e as Error)?.message ?? "Unknown error"));
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="mt-4">
//       <button
//         onClick={handleJoin}
//         disabled={loading}
//         className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition"
//       >
//         {loading ? "Joining..." : "Join current game"}
//       </button>
//       {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
//     </div>
//   );
// }

// export default function AdminDashboard() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [sessionId, setSessionId] = useState("");
//   const [passcode, setPasscode] = useState<PasscodeResponse | null>(null);
//   const [message, setMessage] = useState("");
//   const [notes, setNotes] = useState("");
//   const [creating, setCreating] = useState(false);

//   async function createPass(e?: React.FormEvent) {
//     e?.preventDefault();
//     setMessage("");
//     setCreating(true);

//     try {
//       const res = await fetch("/api/admin/generate-passcode", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           sessionId: sessionId || undefined,
//           expiresMinutes: 10,
//         }),
//       });
//       const j = await res.json();

//       if (res.ok) {
//         // server may return j.passcode or j.passcode + j.expiresAt; handle both
//         const received: PasscodeResponse | undefined = (j?.passcode ??
//           j) as PasscodeResponse;
//         setPasscode(received ?? null);
//         const expires =
//           j?.passcode?.expiresAt ?? j?.expiresAt ?? received?.expiresAt;
//         setMessage(
//           `Passcode generated (expires at ${expires ? new Date(expires).toLocaleTimeString() : "unknown"})`,
//         );
//       } else {
//         setMessage(j?.error || "Failed to create passcode");
//       }
//     } catch (err) {
//       console.error("create-passcode error", err);
//       setMessage("Network/server error while creating passcode");
//     } finally {
//       setCreating(false);
//     }
//   }

//   function copyPasscodeToClipboard() {
//     if (!passcode) return;
//     try {
//       navigator.clipboard.writeText(passcode.code);
//       setMessage("Passcode copied to clipboard.");
//     } catch {
//       setMessage("Unable to copy to clipboard on this device.");
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="flex">
//         {/* Sidebar */}
//         <aside
//           className={`bg-white border-r border-gray-200 transition-all duration-200 ${
//             sidebarOpen ? "w-64" : "w-16"
//           }`}
//         >
//           <div className="h-full flex flex-col">
//             <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//               <button
//                 className="p-1 rounded-md hover:bg-gray-100"
//                 aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
//                 onClick={() => setSidebarOpen((s) => !s)}
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="bg-indigo-600 text-white rounded-md w-9 h-9 flex items-center justify-center font-semibold">
//                     C
//                   </div>
//                   {sidebarOpen && (
//                     <div className="text-lg font-semibold">Counselor</div>
//                   )}
//                 </div>
//               </button>
//             </div>

//             <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
//               <MenuItem label="Dashboard" iconLabel="🏠" open={sidebarOpen} />
//               <MenuItem
//                 label="Generate passcode"
//                 iconLabel="🔑"
//                 open={sidebarOpen}
//               />
//               <MenuItem label="Controls" iconLabel="🎛️" open={sidebarOpen} />
//               <MenuItem label="Notes" iconLabel="📝" open={sidebarOpen} />
//               <MenuItem label="Settings" iconLabel="⚙️" open={sidebarOpen} />
//               <MenuItem label="Logout" iconLabel="🚪" open={sidebarOpen} />
//             </nav>

//             <div className="p-3 border-t border-gray-100">
//               {sidebarOpen ? (
//                 <div className="text-sm text-gray-600">
//                   Logged in as <strong>Admin</strong>
//                 </div>
//               ) : (
//                 <div className="text-sm text-gray-500 text-center">Admin</div>
//               )}
//             </div>
//           </div>
//         </aside>

//         {/* Main content */}
//         <div className="flex-1 p-6">
//           <header className="flex items-center justify-between mb-6">
//             <div>
//               <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
//               <p className="text-sm text-gray-500 mt-1">
//                 Control center for counseling sessions
//               </p>
//             </div>

//             <div className="flex items-center gap-3">
//               <button
//                 onClick={() => setSidebarOpen((s) => !s)}
//                 className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:shadow-sm"
//               >
//                 <MinusIcon className="h-4 w-4 text-gray-600" />
//                 <span className="text-sm text-gray-700">
//                   {sidebarOpen ? "Hide menu" : "Show menu"}
//                 </span>
//               </button>
//             </div>
//           </header>

//           <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {/* Left column: passcode creation + join */}
//             <div className="md:col-span-2 bg-white p-5 rounded-lg shadow-sm border border-gray-100">
//               <h2 className="text-lg font-medium mb-3">Passcode</h2>

//               <form onSubmit={createPass} className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Session ID (optional)
//                   </label>
//                   <input
//                     value={sessionId}
//                     onChange={(e) => setSessionId(e.target.value)}
//                     placeholder="Leave blank to create a new session"
//                     className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-300"
//                   />
//                 </div>

//                 <div className="flex items-center gap-3">
//                   <button
//                     type="submit"
//                     disabled={creating}
//                     className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
//                   >
//                     {creating ? "Creating…" : "Create Passcode"}
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => {
//                       setSessionId("");
//                       setPasscode(null);
//                       setMessage("");
//                     }}
//                     className="px-3 py-2 rounded-md border border-gray-200"
//                   >
//                     Reset
//                   </button>
//                 </div>
//               </form>

//               <div className="mt-4">
//                 {message && (
//                   <div className="text-sm text-gray-700">{message}</div>
//                 )}

//                 {passcode && (
//                   <div className="mt-3 flex items-center gap-3">
//                     <div>
//                       <div className="text-sm text-gray-500">Passcode</div>
//                       <div className="text-2xl font-mono font-semibold">
//                         {passcode.code}
//                       </div>
//                       <div className="text-xs text-gray-400">
//                         Session {passcode.sessionId}
//                       </div>
//                     </div>

//                     <div className="ml-auto flex items-center gap-2">
//                       <button
//                         onClick={copyPasscodeToClipboard}
//                         className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
//                       >
//                         <ClipboardIcon className="h-4 w-4 text-gray-600" />
//                         <span className="text-sm">Copy</span>
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <div className="mt-6">
//                 <JoinCurrentGameButton />
//               </div>
//             </div>

//             {/* Right column: notes / quick controls */}
//             <aside className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
//               <h3 className="text-lg font-medium mb-3">Notes</h3>
//               <textarea
//                 rows={8}
//                 value={notes}
//                 onChange={(e) => setNotes(e.target.value)}
//                 placeholder="Take private notes here (local only for now)."
//                 className="w-full rounded-md border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-indigo-300"
//               />

//               <div className="mt-3 flex gap-2">
//                 <button
//                   onClick={() => {
//                     navigator.clipboard?.writeText(notes);
//                   }}
//                   className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
//                 >
//                   Copy notes
//                 </button>
//                 <button
//                   onClick={() => setNotes("")}
//                   className="px-3 py-1.5 rounded-md border border-gray-200 text-sm"
//                 >
//                   Clear
//                 </button>
//               </div>

//               <div className="mt-6">
//                 <h4 className="text-sm font-medium mb-2">Quick controls</h4>
//                 <div className="flex flex-col gap-2">
//                   <button className="px-3 py-2 rounded-md bg-yellow-500 text-white text-sm hover:bg-yellow-600">
//                     Start session
//                   </button>
//                   <button className="px-3 py-2 rounded-md bg-rose-500 text-white text-sm hover:bg-rose-600">
//                     End session
//                   </button>
//                 </div>
//               </div>
//             </aside>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* Small helper for sidebar items */
// function MenuItem({
//   label,
//   iconLabel,
//   open,
// }: {
//   label: string;
//   iconLabel: string;
//   open: boolean;
// }) {
//   return (
//     <div
//       className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 ${
//         open ? "justify-start" : "justify-center"
//       }`}
//       role="button"
//     >
//       <div className="text-lg">{iconLabel}</div>
//       {open && <div className="text-sm text-gray-700">{label}</div>}
//     </div>
//   );
// }

// // // src/app/admin/dashboard/page.tsx
// // "use client";
// // import { useState } from "react";

// // import { useRouter } from "next/navigation";

// // function JoinCurrentGameButton() {
// //   const [loading, setLoading] = useState(false);
// //   const [err, setErr] = useState<string | null>(null);
// //   const router = useRouter();

// //   async function handleJoin() {
// //     try {
// //       setErr(null);
// //       setLoading(true);
// //       const res = await fetch("/api/admin/join-current-session", {
// //         method: "POST",
// //       });
// //       const j = await res.json();
// //       if (!res.ok) {
// //         setErr(j?.error ?? "Failed to join session");
// //         return;
// //       }
// //       // The endpoint sets cg_user_session cookie — now navigate to /game
// //       router.push("/game");
// //     } catch (e) {
// //       setErr(String((e as Error)?.message ?? "Unknown error"));
// //     } finally {
// //       setLoading(false);
// //     }
// //   }

// //   return (
// //     <div style={{ marginTop: 12 }}>
// //       <button onClick={handleJoin} disabled={loading}>
// //         {loading ? "Joining..." : "Join current game"}
// //       </button>
// //       {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
// //     </div>
// //   );
// // }

// // export default function AdminDashboard() {
// //   const [sessionId, setSessionId] = useState("");
// //   const [passcode, setPasscode] = useState<PasscodeResponse | null>(null);
// //   const [message, setMessage] = useState("");

// //   type PasscodeResponse = {
// //     id: number;
// //     code: string;
// //     sessionId: number;
// //     expiresAt: string;
// //   };

// //   async function createPass(e: React.FormEvent) {
// //     e.preventDefault();
// //     setMessage("Creating...");
// //     const res = await fetch("/api/admin/generate-passcode", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({
// //         sessionId: sessionId || undefined,
// //         expiresMinutes: 10,
// //       }),
// //     });
// //     const j = await res.json();
// //     if (res.ok) {
// //       setPasscode(j.passcode);
// //       setMessage(
// //         `Passcode generated (expires at ${new Date(j.expiresAt).toLocaleTimeString()})`,
// //       );
// //     } else {
// //       setMessage(j.error || "Failed to create passcode");
// //     }
// //   }

// //   return (
// //     <main style={{ padding: 20 }}>
// //       <h1>Admin Dashboard</h1>
// //       <form onSubmit={createPass}>
// //         <div>
// //           <label>Session ID (optional)</label>
// //           <br />
// //           <input
// //             value={sessionId}
// //             onChange={(e) => setSessionId(e.target.value)}
// //           />
// //         </div>
// //         <button type="submit">Create Passcode</button>
// //       </form>

// //       {message && <p>{message}</p>}
// //       {passcode && (
// //         <p>
// //           Passcode: <code style={{ fontSize: "1.2em" }}>{passcode.code}</code>
// //         </p>
// //       )}
// //       <div>
// //         <JoinCurrentGameButton />
// //       </div>
// //     </main>
// //   );
// // }
