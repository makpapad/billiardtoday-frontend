import { headers } from "next/headers";
import { SITE_URL } from "@/lib/socialMetadata";

/**
 * Server-side ανάγνωση του ιστορικού ενός αθλητή, για να μπει το περιεχόμενο στο
 * HTML της σελίδας (SEO). ΔΕΝ ξαναϋπολογίζει τα δεδομένα: χτυπά το ίδιο route
 * `/api/players/<id>/history` που χρησιμοποιεί και η client σελίδα, ώστε να μη
 * διπλασιαστεί η λογική (ομαδοποίηση/φίλτρα/θέσεις).
 */

export type PlayerHistoryMatch = {
  id?: string;
  opponent?: string | null;
  stage?: string | null;
  result?: string | null;
  scoreFor?: number;
  scoreAgainst?: number;
  innings?: number;
  highRun?: number;
};

export type PlayerHistoryParticipation = {
  id: string;
  tournament: string | null;
  year: number | null;
  gameType: string | null;
  position: string | null;
  eventStartDate: string | null;
  totalMatches: number;
  wins: number;
  losses: number;
  highestRun: number;
  avgPerInning: number;
  matches: PlayerHistoryMatch[];
};

type PlayerHistoryPayload = {
  data?: PlayerHistoryParticipation[];
  totalCount?: number;
};

/** Το SEO περιεχόμενο ΔΕΝ πρέπει να κρατά τη σελίδα: σύντομο timeout + cache. */
const PLAYER_HISTORY_TIMEOUT_MS = 4000;
const PLAYER_HISTORY_REVALIDATE_SECONDS = 300;

const resolveOrigin = async (): Promise<string> => {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // εκτός request scope (π.χ. build) — πέφτουμε στο SITE_URL
  }
  return SITE_URL;
};

export const getPlayerHistoryForServer = async (
  playerId: string,
  limit = 25,
): Promise<{ items: PlayerHistoryParticipation[]; totalCount: number } | null> => {
  const cleanId = String(playerId || "").trim();
  if (!cleanId) return null;
  // Το route δέχεται μόνο το αριθμητικό id (το slug μετά τη παύλα είναι διακοσμητικό,
  // π.χ. "6-APOSTOLEAS-Dimitris" → 6).
  const routeId = cleanId.match(/^\d+/)?.[0] || cleanId;

  try {
    const origin = await resolveOrigin();
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(
      `${origin}/api/players/${encodeURIComponent(routeId)}/history?${params.toString()}`,
      // ΠΡΟΣΟΧΗ (φορτίο): η κλήση γίνεται σε ΚΑΘΕ render σελίδας αθλητή. Με
      // `no-store` κάθε επίσκεψη χτυπούσε το route (και πίσω του το Strapi) από την
      // αρχή — με 3.100 σελίδες αθλητών αυτό πνίγει το Strapi. Με `revalidate`
      // πληρώνουμε ένα query ανά 5 λεπτά ανά αθλητή.
      {
        next: { revalidate: PLAYER_HISTORY_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(PLAYER_HISTORY_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as PlayerHistoryPayload | null;
    if (!payload || !Array.isArray(payload.data)) return null;

    const items = payload.data
      .map((item): PlayerHistoryParticipation | null => {
        if (!item || typeof item !== "object") return null;
        const tournament = typeof item.tournament === "string" && item.tournament.trim()
          ? item.tournament.trim()
          : null;
        if (!tournament) return null;
        return {
          id: String(item.id ?? tournament),
          tournament,
          year: typeof item.year === "number" ? item.year : null,
          gameType: typeof item.gameType === "string" ? item.gameType : null,
          position: typeof item.position === "string" ? item.position : null,
          eventStartDate: typeof item.eventStartDate === "string" ? item.eventStartDate : null,
          totalMatches: Number(item.totalMatches) || 0,
          wins: Number(item.wins) || 0,
          losses: Number(item.losses) || 0,
          highestRun: Number(item.highestRun) || 0,
          avgPerInning: Number(item.avgPerInning) || 0,
          matches: Array.isArray(item.matches)
            ? item.matches.map((match) => ({
                id: String(match?.id ?? ""),
                opponent: typeof match?.opponent === "string" ? match.opponent : null,
                stage: typeof match?.stage === "string" ? match.stage : null,
                result: typeof match?.result === "string" ? match.result : null,
                scoreFor: Number(match?.scoreFor) || 0,
                scoreAgainst: Number(match?.scoreAgainst) || 0,
                innings: Number(match?.innings) || 0,
                highRun: Number(match?.highRun) || 0,
              }))
            : [],
        };
      })
      .filter((item: PlayerHistoryParticipation | null): item is PlayerHistoryParticipation => Boolean(item));

    return { items, totalCount: Number(payload.totalCount) || items.length };
  } catch {
    // Το ιστορικό είναι πρόσθετο περιεχόμενο — αν αποτύχει, η σελίδα δουλεύει κανονικά.
    return null;
  }
};
