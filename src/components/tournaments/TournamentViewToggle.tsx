"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type TournamentViewMode = "table" | "cards";

const STORAGE_KEY = "bt-tournament-view";

/**
 * Μοιρασμένη προτίμηση εμφάνισης τουρνουά (λίστα ή κάρτες), με μνήμη στο
 * localStorage ώστε να μη γυρίζει σε προεπιλογή σε κάθε επίσκεψη.
 */
export function useTournamentView(defaultMode: TournamentViewMode = "table") {
  const [mode, setMode] = useState<TournamentViewMode>(defaultMode);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "table" || stored === "cards") {
        setMode(stored);
      }
    } catch {
      /* localStorage μπορεί να είναι κλειστό (private mode) — μένει η προεπιλογή */
    }
  }, []);

  const update = (next: TournamentViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* αγνοούμε */
    }
  };

  return [mode, update] as const;
}

type Props = {
  mode: TournamentViewMode;
  onChange: (mode: TournamentViewMode) => void;
  className?: string;
};

/** Δύο εικονίδια — λίστα ή κάρτες — για την εμφάνιση των τουρνουά. */
export function TournamentViewToggle({ mode, onChange, className = "" }: Props) {
  const buttonClass = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
      active
        ? "bg-sky-600 text-white shadow-sm"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-gray-300 dark:hover:bg-gray-700"
    }`;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
      role="group"
      aria-label="Tournament display"
    >
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-label="List view"
        aria-pressed={mode === "table"}
        title="List view"
        className={buttonClass(mode === "table")}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-label="Cards view"
        aria-pressed={mode === "cards"}
        title="Cards view"
        className={buttonClass(mode === "cards")}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
