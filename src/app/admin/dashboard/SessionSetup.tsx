import React from "react";
import DiskInfo from "@/components/DiskInfo";
import { KeyboardButton } from "@/components/KeyboardButton";

interface SessionSetupProps {
  hasSession: boolean;
  createPass: (e?: React.FormEvent) => void;
  sessionId: string;
  setSessionId: (val: string) => void;
  creating: boolean;
  passcode: { code: string; sessionId: number } | null;
  copyPasscodeToClipboard: () => void;

  // Components/Icons passed as props
  CheckCircleIcon: React.ElementType;
  ClipboardIcon: React.ElementType;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({
  hasSession,
  createPass,
  sessionId,
  setSessionId,
  creating,
  passcode,
  copyPasscodeToClipboard,
  CheckCircleIcon,
  ClipboardIcon,
}) => {
  return (
    <div className="w-full">
      <div
        className={`w-full rounded-2xl p-6 md:p-8 border-2 transition-all duration-500 ${
          hasSession
            ? "border-[var(--success-border)] bg-[var(--success-bg)]"
            : "border-[var(--border-subtle)] bg-[var(--muted-bg)] shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-subtle)]">
          <DiskInfo
            hasSession={hasSession}
            infoText="Step 1: Create or Enter Session"
            sideText="1"
            status={hasSession ? "success" : "standard"}
          />
          {hasSession && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--success-border)] text-[var(--success-foreground)] text-sm font-semibold">
              <CheckCircleIcon className="h-5 w-5" /> Session Active
            </span>
          )}
        </div>

        <form
          onSubmit={createPass}
          className="flex flex-col sm:flex-row items-end gap-4"
        >
          <div className="flex-1 w-full min-w-[200px]">
            <label className="block text-xs font-bold text-[var(--muted-foreground)] mb-2 uppercase tracking-wider">
              Target Session ID
            </label>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="New session (auto)"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all outline-none"
            />
          </div>
          <KeyboardButton
            type="submit"
            disabled={creating}
            text1={passcode ? "Renew Session" : "Create Session"}
            text2={passcode ? "Renew Session" : "Create Session"}
            loading={creating}
            className="w-full sm:w-auto h-[46px] bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50 border-none shadow-md"
          />
        </form>

        {passcode && (
          <div className="mt-6 p-4 bg-[var(--background)] rounded-xl border border-[var(--border-subtle)] flex items-center gap-4 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-300">
            <div>
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-widest mb-1">
                Active Code
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--accent-primary)] tracking-tight">
                {passcode.code}
              </div>
            </div>
            <button
              type="button"
              onClick={copyPasscodeToClipboard}
              className="p-2 ml-2 hover:bg-[var(--muted-bg)] rounded-lg transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              title="Copy Code"
            >
              <ClipboardIcon className="h-6 w-6" />
            </button>
            <div className="ml-auto text-right">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold mb-1">
                Session #
              </div>
              <div className="text-sm font-bold text-[var(--foreground)] bg-[var(--muted-bg)] px-2 py-1 rounded-md inline-block border border-[var(--border-subtle)]">
                {passcode.sessionId}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// import React from "react";
// import DiskInfo from "@/components/DiskInfo";
// import { KeyboardButton } from "@/components/KeyboardButton";
// interface SessionSetupProps {
//   hasSession: boolean;
//   createPass: (e?: React.FormEvent) => void;
//   sessionId: string;
//   setSessionId: (val: string) => void;
//   creating: boolean;
//   passcode: { code: string; sessionId: number } | null;
//   copyPasscodeToClipboard: () => void;

//   // Components/Icons passed as props
//   CheckCircleIcon: React.ElementType;
//   ClipboardIcon: React.ElementType;
// }

// export const SessionSetup: React.FC<SessionSetupProps> = ({
//   hasSession,
//   createPass,
//   sessionId,
//   setSessionId,
//   creating,
//   passcode,
//   copyPasscodeToClipboard,
//   CheckCircleIcon,
//   ClipboardIcon,
// }) => {
//   return (
//     // bg-bevelside rounded-3xl
//     <div className="p-5 ">
//       <div
//         className={`rounded-2xl bg-gray-200
//               shadow-neumorphic p-4 rounded-xl border-2 transition-colors ${hasSession ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-indigo-100 bg-gray-50 dark:border-indigo-900/20 dark:bg-gray-200/10"}`}
//       >
//         <div className="flex items-center justify-between mb-4">
//           <DiskInfo
//             hasSession={hasSession}
//             infoText="Session 1 Create or Enter Session"
//             sideText="1"
//             status={hasSession ? "success" : "standard"}
//           />
//           {hasSession && (
//             <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
//               <CheckCircleIcon className="h-5 w-5" /> Session Active
//             </div>
//           )}
//         </div>

//         <form onSubmit={createPass} className="flex flex-wrap items-end gap-4">
//           <div className="flex-1 min-w-[200px]">
//             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
//               Target Session ID
//             </label>
//             <input
//               value={sessionId}
//               onChange={(e) => setSessionId(e.target.value)}
//               placeholder="New session (auto)"
//               className="w-full shadow-neumorphic rounded-md     px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500  "
//             />
//           </div>
//           <KeyboardButton
//             type="submit"
//             disabled={creating}
//             text1={passcode ? "Renew Session" : "Create Session"}
//             text2={passcode ? "Renew Session" : "Create Session"}
//             loading={creating}
//           />
//           {/* <button
//             type="submit"
//             disabled={creating}
//             className="bg-gray-400 text-black [text-shadow:0_1px_0_#e3e3e3] font-bold py-2 px-4 rounded-xl
//                border-b-4 border-gray-700
//                hover:bg-blue-400 hover:border-gray-600
//                active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 transition text-sm font-medium"
//           >
//             {creating
//               ? "Creating..."
//               : passcode
//                 ? "Renew Session"
//                 : "Create Session"}
//           </button> */}
//         </form>

//         {passcode && (
//           <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-4 shadow-sm">
//             <div>
//               <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">
//                 Active Code
//               </div>
//               <div className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
//                 {passcode.code}
//               </div>
//             </div>
//             <button
//               onClick={copyPasscodeToClipboard}
//               className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400"
//             >
//               <ClipboardIcon className="h-5 w-5" />
//             </button>
//             <div className="ml-auto text-right">
//               <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
//                 Session #
//               </div>
//               <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                 {passcode.sessionId}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
