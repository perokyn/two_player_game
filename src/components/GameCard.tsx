// src/components/GameCard.tsx
"use client";

import React, { useState, useMemo } from "react";

type GameCardProps = {
  text: string;
  imageUrl?: string;
  onClick?: () => void;
  isFlipped?: boolean;
  id?: string | number;
  disabled?: boolean;
  // New prop to handle edge-clipping when scaling
  origin?: "center" | "left" | "right";
};

const PLACEHOLDER_COLORS = [
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-purple-400 to-purple-600",
  "bg-gradient-to-br from-pink-400 to-pink-600",
  "bg-gradient-to-br from-green-400 to-green-600",
  "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "bg-gradient-to-br from-indigo-400 to-indigo-600",
  "bg-gradient-to-br from-red-400 to-red-600",
  "bg-gradient-to-br from-teal-400 to-teal-600",
];

export default function GameCard({
  text,
  imageUrl,
  onClick,
  isFlipped = false,
  id,
  disabled = false,
  origin = "center",
}: GameCardProps) {
  const [placeholderColor] = useState(() => {
    if (id != null) {
      const charCodeSum = String(id)
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return PLACEHOLDER_COLORS[charCodeSum % PLACEHOLDER_COLORS.length];
    }
    return PLACEHOLDER_COLORS[
      Math.floor(Math.random() * PLACEHOLDER_COLORS.length)
    ];
  });

  const fontSizeClass = useMemo(() => {
    const len = text.length;
    if (len < 30) return "text-sm md:text-base lg:text-xl";
    if (len < 60) return "text-xs md:text-sm lg:text-lg";
    if (len < 120) return "text-[10px] md:text-xs lg:text-sm";
    return "text-[9px] md:text-[10px] lg:text-xs";
  }, [text]);

  const handleClick = () => {
    if (!disabled && !isFlipped) {
      onClick?.();
    }
  };

  return (
    <div
      className="w-full h-full transition-all duration-300 ease-out"
      style={{
        perspective: "1000px",
        // Grows to 1.4x size when flipped. Adjust 1.4 to your preference.
        transform: isFlipped ? "scale(1.4)" : "scale(1)",
        transformOrigin: origin,
        zIndex: isFlipped ? 50 : 1,
      }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ease-in-out cursor-pointer ${
          disabled ? "cursor-not-allowed" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        onClick={handleClick}
      >
        {/* Front Side */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center rounded-lg shadow-md ${
            disabled && !isFlipped ? "opacity-50" : ""
          }`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Card front"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div
              className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg ${placeholderColor}`}
            >
              <span className="text-center px-2">🎴</span>
            </div>
          )}
        </div>

        {/* Back Side */}
        <div
          className={`absolute inset-0 w-full h-full bg-indigo-700 rounded-lg shadow-lg p-2 flex items-center justify-center ${
            disabled && isFlipped ? "ring-4 ring-green-400 ring-inset" : ""
          }`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p
            className={`bg-indigo-700 rounded-lg shadow-lg p-2 text-white ${fontSizeClass}font-semibold text-[10px] md:text-xs lg:text-sm text-center leading-tight break-words`}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
