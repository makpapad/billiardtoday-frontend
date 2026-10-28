"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  /** Πού πάει αν δεν υπάρχει ιστορικό (π.χ. άνοιξε από bookmark). */
  fallbackHref?: string;
  className?: string;
};

/** Ετικέτα της σελίδας προορισμού για το «Back to …». */
const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/tournaments": "Tournaments",
  "/tournaments/team": "Team tournaments",
  "/tournaments/events": "Events",
  "/players": "Players",
  "/clubs": "Clubs",
  "/federations": "Federations",
  "/rankings": "Rankings",
  "/live": "Live",
  "/news": "News",
};

const labelForHref = (href: string) => {
  const path = (href.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const known = PAGE_LABELS[path];
  if (known) return known;
  const last = path.split("/").filter(Boolean).pop();
  if (!last) return "Home";
  return last.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
};

/**
 * «← Back to <σελίδα>» — χωρίς πλαίσιο/κουτί, σαν σύνδεσμος.
 * Ακολουθεί το ιστορικό (γυρίζει εκεί που ήσουν) και δείχνει τον τίτλο της
 * σελίδας προέλευσης όταν έρχεται με `?back=<label>` (π.χ. από τη λίστα CEB ή
 * από προφίλ παίκτη)· αλλιώς τη σελίδα του `fallbackHref`.
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

  const text = `Back to ${label || labelForHref(fallbackHref)}`;

  return (
    <button
      type="button"
      onClick={handleBack}
      title={text}
      className={`inline-flex max-w-full self-start items-center gap-1.5 bg-transparent text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400 ${className}`}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="truncate">{text}</span>
    </button>
  );
}
