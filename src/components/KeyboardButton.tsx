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
  return (
    <button
      {...props}
      disabled={disabled || action}
      className={`bg-gray-100 text-black [text-shadow:0_1px_0_#e3e3e3] font-bold py-2 px-4 rounded-xl 
               border-b-4 border-gray-700 
               hover:bg-blue-400 hover:border-gray-600 
               active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-50 transition text-sm font-medium ${
                 fullWidth ? "w-full" : ""
               } ${className}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? "Loading..." : action ? text1 : text2}
    </button>
  );
};
