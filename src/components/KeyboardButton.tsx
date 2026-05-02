"use client";

import React from "react";

interface KeyboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  action?: boolean;
  text1: string;
  text2: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const KeyboardButton: React.FC<KeyboardButtonProps> = ({
  action,
  loading,
  text1,
  text2,
  fullWidth,
  className = "",
  disabled,
  icon,
  ...props
}) => {
  // If a background class is not passed in via className, apply a sleek default secondary style
  const hasBg = className.includes("bg-");
  const defaultStyles = !hasBg
    ? "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border-subtle)] hover:bg-[var(--muted-bg)]"
    : "";

  return (
    <button
      {...props}
      disabled={disabled || action}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${defaultStyles} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      {loading ? "Loading..." : action ? text1 : text2}
    </button>
  );
};

// "use client";

// import React from "react";

// interface KeyboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
//   loading?: boolean;
//   action?: boolean;
//   text1: string;
//   text2: string;
//   fullWidth?: boolean;
//   icon?: React.ReactNode;
// }

// export const KeyboardButton: React.FC<KeyboardButtonProps> = ({
//   action,
//   loading,
//   text1,
//   text2,
//   fullWidth,
//   className = "",
//   disabled,
//   icon,
//   ...props
// }) => {
//   return (
//     <button
//       {...props}
//       disabled={disabled || action}
//       className={`bg-gray-100 text-black [text-shadow:0_1px_0_#e3e3e3] font-bold py-2 px-4 rounded-xl
//                border-b-4 border-gray-700
//                hover:bg-blue-400 hover:border-gray-600
//                active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 transition text-sm font-medium ${
//                  fullWidth ? "w-full" : ""
//                } ${className}`}
//     >
//       {icon && <span className="mr-2">{icon}</span>}
//       {loading ? "Loading..." : action ? text1 : text2}
//     </button>
//   );
// };
