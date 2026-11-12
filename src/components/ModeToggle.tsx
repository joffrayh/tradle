import React from "react";
import { SettingsData } from "../hooks/useSettings";

type GameMode = SettingsData["gameMode"];

const MODES: { value: GameMode; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "unlimited", label: "Unlimited" },
];

interface ModeToggleProps {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="my-2 flex justify-center">
      <div
        role="radiogroup"
        aria-label="Game mode"
        className="inline-flex rounded-full bg-slate-200/90 p-1 dark:bg-slate-800/90"
      >
        {MODES.map(({ value, label }) => {
          const active = value === mode;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(value)}
              className={`h-9 min-w-[6.5rem] rounded-full px-4 text-sm font-semibold transition-colors ${
                active
                  ? "bg-white text-slate-900 shadow-sm dark:bg-oec-orange dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
