import React, { useState, useRef, useEffect } from "react";
import { ExpandMore } from "@mui/icons-material";

export interface DropDownOption {
  id: number | string;
  name: string;
  questionCount?: number;
}

export interface CustomDropDownProps {
  label: string;
  options: DropDownOption[];
  selectedValue: number | string | null;
  onSelect: (value: number | string | null) => void;
  placeholder?: string;
}

export default function CustomDropDown({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "-- Select --",
}: CustomDropDownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the currently selected option to display its name
  const selectedOption = options.find((opt) => opt.id === selectedValue);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-md  shadow-neumorphic px-3 py-2 text-sm  transition-all active:scale-[0.98]"
      >
        <span className="truncate">
          {selectedOption
            ? `${selectedOption.name} ${selectedOption.questionCount ? `(${selectedOption.questionCount})` : ""}`
            : placeholder}
        </span>
        <ExpandMore
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-[-3] pb-3 w-full rounded-b-lg bg-surface shadow-google  overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="max-h-60 overflow-y-auto py-1">
            {/* Default/Reset Option */}
            <div
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent-soft-bg hover:text-accent-soft-foreground text-muted-foreground"
            >
              {/* {placeholder} */}
            </div>

            {options.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  onSelect(option.id);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors w-[90%] mx-auto
                  ${
                    selectedValue === option.id
                      ? "bg-accent-primary "
                      : "text-foreground hover:shadow-neumorphic hover:text-red-600"
                  }`}
              >
                {option.name}{" "}
                {option.questionCount !== undefined &&
                  `(${option.questionCount})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
