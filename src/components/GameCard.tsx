// src/components/GameCard.tsx
"use client";

import React, { useState } from "react";

type GameCardProps = {
  text: string;
  imageUrl?: string;
  onClick?: () => void;
  isFlipped?: boolean;
  id?: string | number;
  disabled?: boolean;
};

export default function GameCard({
  text,
  imageUrl,
  onClick,
  isFlipped = false,
  id,
  disabled = false,
}: GameCardProps) {
  // Explicitly typing the state to avoid 'any'
  const [placeholderColor] = useState<string>(() => {
    const PLACEHOLDER_COLORS: string[] = [
      "bg-gradient-to-br from-blue-500 to-blue-700",
      "bg-gradient-to-br from-purple-500 to-purple-700",
      "bg-gradient-to-br from-indigo-500 to-indigo-700",
      "bg-gradient-to-br from-teal-500 to-teal-700",
    ];
    const charCodeSum: number = String(id ?? "")
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return PLACEHOLDER_COLORS[charCodeSum % PLACEHOLDER_COLORS.length];
  });

  const handleCardClick = (): void => {
    if (!disabled && !isFlipped) {
      onClick?.();
    }
  };

  return (
    <div
      className={`relative w-full h-full transition-all duration-500 ease-in-out cursor-pointer ${
        isFlipped ? "z-50" : "z-10"
      }`}
      style={{ perspective: "1000px" }}
      onClick={handleCardClick}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          height: "100%",
        }}
      >
        {/* Front Side (The Closed Card) */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl shadow-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Card Front"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-white ${placeholderColor}`}
            >
              <span className="text-3xl">🎴</span>
            </div>
          )}
        </div>

        {/* Back Side (The Opened Card with Text) */}
        <div
          className="w-full h-full rounded-xl shadow-2xl p-4 flex items-center justify-center border-2"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            // Theme variables used for background, text, and border
            backgroundColor: "var(--muted-bg)",
            color: "var(--foreground)",
            borderColor:
              disabled && isFlipped
                ? "var(--constructive)"
                : "var(--border-subtle)",
            // Use relative positioning only when flipped to "push" the container height
            position: isFlipped ? "relative" : "absolute",
            top: 0,
            left: 0,
            transition:
              "background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease",
          }}
        >
          <p className="text-center font-medium text-xs md:text-sm lg:text-base leading-tight break-words">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
