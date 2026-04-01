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
  const [placeholderColor] = useState(() => {
    const PLACEHOLDER_COLORS = [
      "bg-gradient-to-br from-blue-500 to-blue-700",
      "bg-gradient-to-br from-purple-500 to-purple-700",
      "bg-gradient-to-br from-indigo-500 to-indigo-700",
      "bg-gradient-to-br from-teal-500 to-teal-700",
    ];
    const charCodeSum = String(id ?? "")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PLACEHOLDER_COLORS[charCodeSum % PLACEHOLDER_COLORS.length];
  });

  return (
    <div
      className={`relative w-full h-full transition-all duration-500 ease-in-out cursor-pointer ${
        isFlipped ? "z-50" : "z-10"
      }`}
      style={{ perspective: "1000px" }}
      onClick={() => !disabled && !isFlipped && onClick?.()}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          height: "100%",
        }}
      >
        {/* Front Side */}
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
              alt="Front"
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

        {/* Back Side - Growth is handled by the parent container */}
        <div
          className={`w-full h-full bg-slate-800 text-white rounded-xl shadow-2xl p-4 flex items-center justify-center border-2 ${
            disabled && isFlipped ? "border-green-400" : "border-slate-600"
          }`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            // Use relative positioning only when flipped to "push" the container height
            position: isFlipped ? "relative" : "absolute",
            top: 0,
            left: 0,
            //  minHeight: isFlipped ? "160px" : "100%",
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
// // src/components/GameCard.tsx
// "use client";

// import React, { useState, useMemo } from "react";

// type GameCardProps = {
//   text: string;
//   imageUrl?: string;
//   onClick?: () => void;
//   isFlipped?: boolean;
//   id?: string | number;
//   disabled?: boolean;
//   // New prop to handle edge-clipping when scaling
//   origin?: "center" | "left" | "right";
// };

// const PLACEHOLDER_COLORS = [
//   "bg-gradient-to-br from-blue-400 to-blue-600",
//   "bg-gradient-to-br from-purple-400 to-purple-600",
//   "bg-gradient-to-br from-pink-400 to-pink-600",
//   "bg-gradient-to-br from-green-400 to-green-600",
//   "bg-gradient-to-br from-yellow-400 to-yellow-600",
//   "bg-gradient-to-br from-indigo-400 to-indigo-600",
//   "bg-gradient-to-br from-red-400 to-red-600",
//   "bg-gradient-to-br from-teal-400 to-teal-600",
// ];

// export default function GameCard({
//   text,
//   imageUrl,
//   onClick,
//   isFlipped = false,
//   id,
//   disabled = false,
//   origin = "center",
// }: GameCardProps) {
//   const [placeholderColor] = useState(() => {
//     if (id != null) {
//       const charCodeSum = String(id)
//         .split("")
//         .reduce((acc, char) => acc + char.charCodeAt(0), 0);
//       return PLACEHOLDER_COLORS[charCodeSum % PLACEHOLDER_COLORS.length];
//     }
//     return PLACEHOLDER_COLORS[
//       Math.floor(Math.random() * PLACEHOLDER_COLORS.length)
//     ];
//   });

//   const fontSizeClass = useMemo(() => {
//     const len = text.length;
//     if (len < 30) return "text-sm md:text-base lg:text-xl";
//     if (len < 60) return "text-xs md:text-sm lg:text-lg";
//     if (len < 120) return "text-[10px] md:text-xs lg:text-sm";
//     return "text-[9px] md:text-[10px] lg:text-xs";
//   }, [text]);

//   const handleClick = () => {
//     if (!disabled && !isFlipped) {
//       onClick?.();
//     }
//   };

//   return (
//     <div
//       className="w-full h-full transition-all duration-300 ease-out"
//       style={{
//         perspective: "1000px",
//         // Grows to 1.4x size when flipped. Adjust 1.4 to your preference.
//         transform: isFlipped ? "scale(1.4)" : "scale(1)",
//         transformOrigin: origin,
//         zIndex: isFlipped ? 50 : 1,
//       }}
//     >
//       <div
//         className={`relative w-full h-full transition-transform duration-500 ease-in-out cursor-pointer ${
//           disabled ? "cursor-not-allowed" : ""
//         }`}
//         style={{
//           transformStyle: "preserve-3d",
//           transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
//         }}
//         onClick={handleClick}
//       >
//         {/* Front Side */}
//         <div
//           className={`absolute inset-0 w-full h-full flex items-center justify-center rounded-lg shadow-md ${
//             disabled && !isFlipped ? "opacity-50" : ""
//           }`}
//           style={{
//             backfaceVisibility: "hidden",
//             WebkitBackfaceVisibility: "hidden",
//           }}
//         >
//           {imageUrl ? (
//             <img
//               src={imageUrl}
//               alt="Card front"
//               className="w-full h-full object-cover rounded-lg"
//             />
//           ) : (
//             <div
//               className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg ${placeholderColor}`}
//             >
//               <span className="text-center px-2">🎴</span>
//             </div>
//           )}
//         </div>

//         {/* Back Side */}
//         <div
//           className={`inset-0 w-full h-full bg-indigo-700 rounded-lg shadow-lg p-2 flex items-center justify-center ${
//             disabled && isFlipped ? "ring-4 ring-green-400 ring-inset" : ""
//           }`}
//           style={{
//             backfaceVisibility: "hidden",
//             WebkitBackfaceVisibility: "hidden",
//             transform: "rotateY(180deg)",
//           }}
//         >
//           <p
//             className={`bg-indigo-700 rounded-lg shadow-lg p-2 text-white ${fontSizeClass}font-semibold text-[10px] md:text-xs lg:text-sm text-center leading-tight break-words`}
//           >
//             {text}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
