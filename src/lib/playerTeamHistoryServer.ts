import { headers } from "next/headers";
import { SITE_URL } from "@/lib/socialMetadata";

/**
 * Server-side ανάγνωση του ΟΜΑΔΙΚΟΥ ιστορικού ενός αθλητή.
 *
 * Γιατί ξεχωριστό lib: το `/api/players/<id>/team-history` τροφοδοτεί μόνο το
 * client component με τα φίλτρα. Οι αθλητές που αγωνίζονται ΜΟΝΟ σε ομαδικά
 * πρωταθλήματα δεν έχουν ατομικό ιστορικό, οπότε η σελίδα τους έβγαινε με
 * ~119 λέξεις και το μήνυμα «Loading detailed tournament history…» —
 * δηλαδή σκελετός χωρίς περιεχόμενο για τον crawler.
 */

export type PlayerTeamHistoryRow = {
  id: string;
  date: string | null;
  season: string | null;
  discipline: string | null;
  tournamentTitle: string | null;
  tournamentHref: string | null;
  groupTitle: string | null;
  round: number | null;
  stage: string | null;
  teamName: string | null;
  opponent: string | null;
  points: number;
  oppPoints: number;
  innings: number;
  highRun: number;
  result: string | null;
};

export type PlayerTeamHistoryPayload = {
  matches: PlayerTeamHistoryRow[];
  summary: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    innings: number;
    avg: number;
    highRun: number;
  };
};

const TEAM_HISTORY_TIMEOUT_MS = 4000;
const TEAM_HISTORY_REVALIDATE_SECONDS = 300;

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

const readString = (value: unknown): string | null => {
  const clean = typeof value === "string" ? value.trim() : "";
  return clean || null;
};

const readNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getPlayerTeamHistoryForServer = async (
  playerId: string,
): Promise<PlayerTeamHistoryPayload | null> => {
  const cleanId = String(playerId || "").trim();
  if (!cleanId) return null;
  const routeId = cleanId.match(/^\d+/)?.[0] || cleanId;

  try {
    const origin = await resolveOrigin();
    const response = await fetch(
      `${origin}/api/players/${encodeURIComponent(routeId)}/team-history`,
      {
        next: { revalidate: TEAM_HISTORY_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TEAM_HISTORY_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as {
      matches?: unknown[];
      summary?: Record<string, unknown>;
    } | null;
    if (!payload || !Array.isArray(payload.matches)) return null;

    const matches = payload.matches
      .map((raw): PlayerTeamHistoryRow | null => {
        if (!raw || typeof raw !== "object") return null;
        const row = raw as Record<string, unknown>;
        const opponent = readString(row.opponent);
        const tournamentTitle = readString(row.tournamentTitle);
        return {
          id: readString(row.id) ?? `${opponent ?? "match"}-${readNumber(row.round)}`,
          date: readString(row.date),
          season: readString(row.season),
          discipline: readString(row.discipline),
          tournamentTitle,
          tournamentHref: readString(row.tournamentHref),
          groupTitle: readString(row.groupTitle),
          round: Number.isFinite(Number(row.round)) ? Number(row.round) : null,
          stage: readString(row.stage),
          teamName: readString(row.teamName),
          opponent,
          points: readNumber(row.points),
          oppPoints: readNumber(row.oppPoints),
          innings: readNumber(row.innings),
          highRun: readNumber(row.highRun),
          result: readString(row.result),
        };
      })
      .filter((row): row is PlayerTeamHistoryRow => Boolean(row));

    const summaryRaw = payload.summary ?? {};
    const innings = readNumber(summaryRaw.innings);
    const points = readNumber(summaryRaw.points);

    return {
      matches,
      summary: {
        matches: readNumber(summaryRaw.matches) || matches.length,
        wins: readNumber(summaryRaw.wins),
        draws: readNumber(summaryRaw.draws),
        losses: readNumber(summaryRaw.losses),
        points,
        innings,
        avg: innings > 0 ? points / innings : 0,
        highRun: readNumber(summaryRaw.highRun),
      },
    };
  } catch {
    // Πρόσθετο περιεχόμενο — αν αποτύχει, η σελίδα δουλεύει κανονικά.
    return null;
  }
};
