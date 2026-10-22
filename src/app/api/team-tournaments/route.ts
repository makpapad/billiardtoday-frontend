import { NextRequest, NextResponse } from "next/server";
import { normalizeTournamentGameType } from "@/lib/gameTypes";
import {
  fetchFederationTeamTournaments,
  type FederationTeamTournamentItem,
} from "@/lib/federationPageData";

export const runtime = "nodejs";

/**
 * Δημόσια λίστα ομαδικών πρωταθλημάτων μιας ομοσπονδίας, στο ΙΔΙΟ σχήμα με το
 * `/api/tournaments` ώστε να αποδίδονται από την κοινή λίστα/κάρτες του site.
 *
 * Το φιλτράρισμα είναι τοπικό (όπως στο /api/tournaments): ο κατάλογος των
 * ομαδικών είναι μικρός και έτσι η σελιδοποίηση μένει σωστή.
 */

const MAX_PUBLIC_PAGE_SIZE = 100;

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const emptyPayload = (page: number, pageSize: number) => ({
  data: [],
  meta: { pagination: { page, pageSize, pageCount: 0, total: 0 } },
});

const facetsPayload = (items: FederationTeamTournamentItem[]) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = normalizeTournamentGameType(item.gameType);
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const data = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, "en"));

  return NextResponse.json(
    {
      data,
      meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
};

const matchesText = (item: FederationTeamTournamentItem, needle: string) => {
  const haystack = `${item.title} ${item.divisionName ?? ""} ${item.gameType ?? ""}`.toLowerCase();
  return haystack.includes(needle);
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = toPositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(
    MAX_PUBLIC_PAGE_SIZE,
    toPositiveInt(searchParams.get("pageSize"), 20),
  );
  const federationId = searchParams.get("federationId")?.trim() || null;
  const season = searchParams.get("season")?.trim() || null;
  const query = searchParams.get("q")?.trim().toLowerCase() || null;
  const gameType = searchParams.get("gameType")?.trim() || null;
  const wantsFacets = searchParams.get("facets") === "gameType";

  if (!federationId) {
    return NextResponse.json(emptyPayload(page, pageSize), { status: 200 });
  }

  const all = await fetchFederationTeamTournaments(federationId);
  if (wantsFacets) return facetsPayload(all);

  const scoped = all.filter((item) => {
    if (season && String(item.season ?? "") !== season) return false;
    if (query && !matchesText(item, query)) return false;
    if (gameType && normalizeTournamentGameType(item.gameType) !== gameType) return false;
    return true;
  });

  const total = scoped.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    data: scoped.slice(start, start + pageSize).map((item) => ({
      id: `team-tournament:${item.documentId}`,
      documentId: item.documentId,
      source: "team_tournament",
      canOpen: true,
      title: item.title,
      game_type: item.gameType,
      season: item.season,
      start_date: item.startDate,
      end_date: item.endDate,
      // Ο σύνδεσμος έρχεται έτοιμος: η κοινή λίστα δεν μαντεύει routes για ομαδικά.
      href: item.href,
      division_name: item.divisionName,
    })),
    meta: { pagination: { page, pageSize, pageCount, total } },
  });
}
