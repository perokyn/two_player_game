import React from "react";

export interface DiskInfoProps {
  hasSession: boolean;
  infoText?: string;
  sideText?: string;
  status?: "standard" | "success" | "error";
  icon?: React.ReactNode; // Added icon prop
}

export default function DiskInfo({
  infoText,
  sideText,
  status = "standard",
  icon, // Destructured icon
}: DiskInfoProps) {
  const statusStyles = {
    standard: "bg-bump shadow-disk ",
    success: "bg-bump-success shadow-disk-success text-white",
    error: "bg-bump-error shadow-disk-error text-white",
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm transition-all ${statusStyles[status] || statusStyles.standard}`}
      >
        {/* Logic moved INSIDE the disk: Show icon if available, otherwise show sideText */}
        {icon ? icon : sideText}
      </span>

      {/* The infoText always stays on the right of the disk */}
      <h2 className="text-lg font-semibold">{infoText}</h2>
    </div>
  );
}
// export interface DiskInfoProps {
//   hasSession: boolean;
//   infoText: string;
//   sideText: string;
//   status?: "standard" | "success" | "error";
// }

// export default function DiskInfo({
//   hasSession,
//   infoText,
//   sideText,
//   status = "standard",
// }: DiskInfoProps) {
//   const statusStyles = {
//     standard: "bg-bump shadow-disk text-black",
//     success: "bg-bump-success shadow-disk-success text-white",
//     error: "bg-bump-error shadow-disk-error text-white",
//   };
//   return (
//     <div className="flex items-center gap-3">
//       <span
//         className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm transition-all ${statusStyles[status] || statusStyles.standard}`}
//       >
//         {sideText}
//       </span>
//       <h2 className="text-lg font-semibold ">{infoText}</h2>
//     </div>
//   );
// }
