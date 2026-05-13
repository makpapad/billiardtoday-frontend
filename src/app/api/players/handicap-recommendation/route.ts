import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";
import {
  buildHandicapRecommendation,
  type HandicapConfidence,
  type HandicapRollingForm,
} from "@/lib/handicapRecommendation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

type RecentMatchSample = {
  date: Date;
  scoreFor: number;
  innings: number;
  highRun: number;
  result: string | null;
};

type RawRecentMatchSample = Omit<RecentMatchSample, "date"> & {
  date: Date | null;
};

const readString = (value: unknown) => {
  const clean = String(value || "").trim();
  return clean || null;
};

const unwrapEntity = (value: any) => {
  if (!value || typeof value !== "object") return null;
  return value.attributes && typeof value.attributes === "object"
    ? { ...value.attributes, ...value }
    : value;
};

const readManualAvg = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && !value.trim()) continue;
    const parsed = Number(String(value ?? "").replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readDate = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const isPlayedMatch = (match: Record<string, unknown>) =>
  toFiniteNumber(match.scoreFor) > 0 ||
  toFiniteNumber(match.scoreAgainst) > 0 ||
  toFiniteNumber(match.innings) > 0 ||
  toFiniteNumber(match.highRun) > 0;

const confidenceForWindow = (matches: number): HandicapConfidence => {
  if (matches >= 12) return "high";
  if (matches >= 6) return "medium";
  if (matches >= 3) return "low";
  return "none";
};

const subtractMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() - months);
  return next;
};

const fetchRollingForm = async (
  documentId: string | null,
  gameType: string,
): Promise<HandicapRollingForm | null> => {
  if (!documentId) return null;

  const params = new URLSearchParams();
  params.set("id", documentId);
  params.set("gameType", gameType);

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  const res = await fetch(
    `${SERVER_API_URL}/api/bt-players/participations-by?${params.toString()}`,
    { cache: "no-store", headers },
  );

  if (!res.ok) return null;

  const payload = await res.json().catch(() => ({ data: [] }));
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const now = new Date();
  const windows = [
    { label: "3M" as const, months: 3 },
    { label: "6M" as const, months: 6 },
    { label: "12M" as const, months: 12 },
  ];

  const samples: RecentMatchSample[] = rows.flatMap((row: any) => {
    const participationDate = readDate(
      row?.date,
      row?.startDate,
      row?.endDate,
      row?.tournamentDate,
      row?.createdAt,
      row?.updatedAt,
    );
    const rawMatches = Array.isArray(row?.matches) ? row.matches : [];
    return rawMatches
      .filter((match: Record<string, unknown>) => isPlayedMatch(match))
      .map((match: any) => {
        const date = readDate(
          match?.date,
          match?.playedAt,
          match?.matchDate,
          match?.startedAt,
          match?.createdAt,
          match?.updatedAt,
        ) ?? participationDate;
        return {
          date,
          scoreFor: toFiniteNumber(match?.scoreFor),
          innings: toFiniteNumber(match?.innings),
          highRun: toFiniteNumber(match?.highRun),
          result: readString(match?.result),
        };
      })
      .filter(
        (match: RawRecentMatchSample): match is RecentMatchSample =>
          Boolean(match.date && match.scoreFor > 0 && match.innings > 0),
      );
  });

  if (samples.length === 0) return null;

  const formWindows = windows.map((window) => {
    const cutoff = subtractMonths(now, window.months);
    const matches = samples.filter(
      (sample) => sample.date && sample.date >= cutoff && sample.date <= now,
    );
    const totalPoints = matches.reduce((sum, match) => sum + match.scoreFor, 0);
    const totalInnings = matches.reduce((sum, match) => sum + match.innings, 0);
    const wins = matches.filter((match) => match.result === "win").length;
    const highestRun = matches.reduce(
      (max, match) => Math.max(max, match.highRun),
      0,
    );
    const matchCount = matches.length;

    return {
      label: window.label,
      months: window.months,
      avg: totalInnings > 0 ? Number((totalPoints / totalInnings).toFixed(3)) : 0,
      matches: matchCount,
      wins,
      winPercentage: matchCount > 0 ? Number(((wins / matchCount) * 100).toFixed(1)) : 0,
      highestRun,
      confidence: confidenceForWindow(matchCount),
    };
  });

  const selected =
    formWindows.find((window) => window.matches >= 5) ??
    formWindows.find((window) => window.matches >= 3) ??
    null;

  return {
    source: "participations-history",
    selected,
    windows: formWindows,
  };
};

const resolvePlayer = async (input: unknown) => {
  const raw = readString(input);
  if (!raw) return null;

  const params = new URLSearchParams();
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "documentId");
  params.set("fields[3]", "career_stats");

  if (/^\d+$/.test(raw)) {
    params.set("filters[id][$eq]", raw);
  } else {
    params.set("filters[documentId][$eq]", raw);
  }

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  const res = await fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
    cache: "no-store",
    headers,
  });

  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({ data: [] }));
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  const entity = unwrapEntity(row);
  if (!entity) return null;

  return {
    id: Number.isFinite(Number(entity.id)) ? Number(entity.id) : null,
    documentId: readString(entity.documentId),
    name: readString(entity.full_name) ?? readString(entity.full_name_en),
    careerStats:
      entity.career_stats && typeof entity.career_stats === "object"
        ? entity.career_stats
        : null,
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerAInput = body.playerA ?? body.player1 ?? body.player_a;
    const playerBInput = body.playerB ?? body.player2 ?? body.player_b;

    if (!playerAInput || !playerBInput) {
      return NextResponse.json(
        { error: "playerA and playerB are required" },
        { status: 400 },
      );
    }

    const [playerA, playerB] = await Promise.all([
      resolvePlayer(playerAInput),
      resolvePlayer(playerBInput),
    ]);

    if (!playerA || !playerB) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const gameType = body.gameType ?? body.game_type ?? "Three-Cushion";
    const [playerARollingForm, playerBRollingForm] = await Promise.all([
      fetchRollingForm(playerA.documentId, String(gameType)),
      fetchRollingForm(playerB.documentId, String(gameType)),
    ]);

    const data = buildHandicapRecommendation({
      playerA: {
        ...playerA,
        rollingForm: playerARollingForm,
        manualAvg: readManualAvg(
          body.playerAAvg,
          body.player_a_avg,
          body.player1Avg,
          body.player1_avg,
          body.manualAverages?.playerA,
          body.manualAverages?.player1,
        ),
      },
      playerB: {
        ...playerB,
        rollingForm: playerBRollingForm,
        manualAvg: readManualAvg(
          body.playerBAvg,
          body.player_b_avg,
          body.player2Avg,
          body.player2_avg,
          body.manualAverages?.playerB,
          body.manualAverages?.player2,
        ),
      },
      targetPoints: body.targetPoints ?? body.target_points ?? 40,
      gameType,
      mode: body.mode ?? body.handicapMode ?? body.handicap_mode ?? "starting-points",
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[frontend.api.players.handicap-recommendation][POST]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
