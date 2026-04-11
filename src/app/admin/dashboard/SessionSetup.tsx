import React from "react";

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
    <div className="p-5 bg-bevelside rounded-3xl">
      <div
        className={`rounded-2xl bg-gray-200 
              shadow-neumorphic p-4 rounded-xl border-2 transition-colors ${hasSession ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-indigo-100 bg-gray-50 dark:border-indigo-900/20 dark:bg-gray-200/10"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${hasSession ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"}`}
            >
              1
            </span>
            <h2 className="text-lg font-semibold ">
              Step 1: Create or Enter Session
            </h2>
          </div>
          {hasSession && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              <CheckCircleIcon className="h-5 w-5" /> Session Active
            </div>
          )}
        </div>

        <form onSubmit={createPass} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Target Session ID
            </label>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="New session (auto)"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-gray-500 text-white font-bold py-2 px-4 rounded 
               border-b-4 border-gray-700 
               hover:bg-blue-400 hover:border-gray-900 
               active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 transition text-sm font-medium"
          >
            {creating
              ? "Creating..."
              : passcode
                ? "Renew Session"
                : "Create Session"}
          </button>
        </form>

        {passcode && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">
                Active Code
              </div>
              <div className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {passcode.code}
              </div>
            </div>
            <button
              onClick={copyPasscodeToClipboard}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400"
            >
              <ClipboardIcon className="h-5 w-5" />
            </button>
            <div className="ml-auto text-right">
              <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                Session #
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {passcode.sessionId}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
