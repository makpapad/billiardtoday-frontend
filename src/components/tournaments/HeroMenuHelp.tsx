"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Εξήγηση των εικονιδίων του hero ενός τουρνουά.
 *
 * Το κλικ στο εικονίδιο ανοίγει την καρτέλα — ΔΕΝ το αγγίζουμε. Η εξήγηση
 * εμφανίζεται με mouse over (ή focus με πληκτρολόγιο) σε λωρίδα που κάθεται
 * ΜΕΣΑ στο hero, στο κενό κάτω από τη σειρά των εικονιδίων.
 *
 * Η λωρίδα είναι absolute στο κάτω άκρο του hero και όχι σε κανονική ροή, ώστε
 * να μη μεγαλώνει το hero: το κενό κάτω από τα εικονίδια είναι 45px (desktop)
 * και 37px (κινητό), αρκετό για μία γραμμή ύψους ~26px.
 *
 * Τα κείμενα είναι σύντομα και σε μία γραμμή· σε πολύ στενές οθόνες κόβονται
 * με «…» αντί να σπάσουν σε δεύτερη γραμμή και να βγουν έξω από το hero.
 */
export const HERO_MENU_HELP: Record<string, string> = {
  Live: "Tables playing right now — scores update on their own",
  Tournament: "Groups, matches and knockout rounds of the tournament",
  "Time Table": "When each match is scheduled to start",
  "Final standings": "Final ranking after the last match",
  "Photo gallery": "Photos from the tournament",
  Participants: "Every player entered in the tournament",
  Statistics: "Team and player statistics for the tournament",
  News: "Articles about this tournament",
  Info: "Venue, format and general information",
  "Tournament alerts":
    "Email or push alerts for the draw, daily recap, final standings and your next match",
};

type HeroMenuHelpValue = {
  hovered: string | null;
  show: (label: string) => void;
  hide: () => void;
};

const HeroMenuHelpContext = createContext<HeroMenuHelpValue | null>(null);

export function HeroMenuHelpProvider({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // Μόνο σε συσκευές με ποντίκι: στο κινητό το tap ανοίγει την καρτέλα και η
  // λωρίδα δεν πρέπει να πεταχτεί από κάτω.
  const canHover = () =>
    typeof window === "undefined" ||
    window.matchMedia("(hover: hover)").matches;

  // Μικρή καθυστέρηση: περνώντας το ποντίκι πάνω από τη σειρά δεν ανοιγοκλείνει.
  const show = useCallback((label: string) => {
    if (!HERO_MENU_HELP[label] || !canHover()) return;
    clear();
    timer.current = setTimeout(() => setHovered(label), 160);
  }, []);

  const hide = useCallback(() => {
    clear();
    setHovered(null);
  }, []);

  const value = useMemo(() => ({ hovered, show, hide }), [hovered, show, hide]);

  return (
    <HeroMenuHelpContext.Provider value={value}>
      {children}
    </HeroMenuHelpContext.Provider>
  );
}

export function useHeroMenuHelp() {
  return useContext(HeroMenuHelpContext);
}

export function HeroMenuHelpStrip({
  placement = "section",
  className = "",
}: {
  /**
   * `row` = μέσα στη σειρά των εικονιδίων (κεντράρεται ως προς τα εικονίδια).
   * `section` = κάτω άκρο του hero (κεντράρεται ως προς την κάρτα).
   */
  placement?: "section" | "row";
  className?: string;
}) {
  const ctx = useHeroMenuHelp();
  const label = ctx?.hovered ?? null;
  const text = label ? HERO_MENU_HELP[label] ?? null : null;

  const position =
    placement === "row"
      ? "left-1/2 top-full mt-1.5 w-max max-w-[calc(100vw-24px)] -translate-x-1/2"
      : "inset-x-1 bottom-1.5 sm:inset-x-6 sm:bottom-2 lg:inset-x-10";

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute z-30 transition-opacity duration-150 ${
        placement === "row" ? "hidden justify-center lg:flex" : "flex justify-center"
      } ${position} ${text ? "opacity-100" : "opacity-0"} ${className}`}
    >
      <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-white/10 bg-slate-950/85 px-2.5 py-1 text-[11px] leading-tight text-white/85 shadow-[0_10px_26px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <span className="whitespace-nowrap font-semibold uppercase tracking-[0.16em] text-white">
          {label ?? ""}
        </span>
        <span aria-hidden className="text-white/35">
          —
        </span>
        <span className="min-w-0 truncate">{text ?? ""}</span>
      </div>
    </div>
  );
}
