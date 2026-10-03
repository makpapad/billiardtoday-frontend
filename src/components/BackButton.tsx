"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  /** Πού πάει αν δεν υπάρχει ιστορικό (π.χ. άνοιξε από bookmark). */
  fallbackHref?: string;
  className?: string;
};

/**
 * «← Back» που ακολουθεί το ιστορικό (γυρίζει εκεί που ήσουν) και δείχνει τον
 * τίτλο της σελίδας προέλευσης όταν έρχεται με `?back=<label>` (π.χ. από τη λίστα
 * CEB ή από προφίλ παίκτη).
 */
export function BackButton({ fallbackHref = "/tournaments", className = "" }: BackButtonProps) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("back");
    if (value) setLabel(value.trim().slice(0, 60));
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      title={label ? `Back to ${label}` : "Back"}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-blue-400 ${className}`}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="truncate">{label ? `Back to ${label}` : "Back"}</span>
    </button>
  );
}
