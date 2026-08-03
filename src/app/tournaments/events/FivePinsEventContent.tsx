"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type {
  EventApiResponse,
  NormalizedEventStage,
  NormalizedGroupPlayer,
  StageMatchGroup,
} from "./types";
import {
  toRelationArray,
  normalizeEntity,
  normalizeGroup,
  toNumber,
  formatDateRange,
  formatNumberValue,
  formatRecord,
  buildStageMatchGroups,
  hasPlayedStageMatch,
  getMatchOutcome,
  getMatchRowClass,
} from "./utils";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

/**
 * 5-Pins tournament event view.
 *
 * Renders CEB-style 5-pins UI (sets-based scoring):
 * - Group matches show per-set scores (Set 1..N), P+/P- totals, Sets Won, Match Points
 * - Group standings use the CEB qualification ranking columns:
 *   POS | PLAYER | P+ | P- | P+/P- | Points | Match Points | Group | Rank
 * - KO brackets show set scores
 *
 * Detected via game_type "Five-Pins" / "5-Pins" or a 5-pins ruleset key.
 */

type FivePinsEventContentProps = {
  eventIdOverride?: string | null;
  initialEventData?: EventApiResponse | null;
  eventDataOverride?: EventApiResponse | null;
  disableAutoRefresh?: boolean;
  preferredStageDocumentId?: string | null;
  preferredGroupParam?: string | null;
  preferredMatchParam?: string | null;
  timezoneOffsetMinutes?: number | null;
  timezoneOptions?: Array<{ value: number; label: string }>;
  onTimezoneChange?: (offsetMinutes: number) => void;
  onStageSelect?: (stageDocumentId: string) => void;
  showPublishedFinalResults?: boolean;
  showTimetable?: boolean;
  stageViewMode?: "results" | "ranks";
  embeddedOverride?: boolean;
  showStandaloneTitle?: boolean;
  showEventHeader?: boolean;
  emptyStateMessage?: string;
  liveSessionsOverride?: unknown[] | null;
  onLiveMatchOpen?: (sessionId: string) => void;
};

const isFivePinsGameType = (value: unknown): boolean =>
  typeof value === "string" && /five[- ]?pins|5[- ]?pins/i.test(value.trim());

const isFivePinsRuleset = (value: unknown): boolean =>
  typeof value === "string" && /(^|[_\-])5pins([_\-]|$)|five[_\- ]?pins/i.test(value.trim());

/** Detect 5-pins from event payload (game_type or ruleset_key on event/tournament). */
export function isFivePinsEvent(payload: EventApiResponse | null | undefined): boolean {
  const event = payload?.data;
  if (!event) return false;
  if (isFivePinsGameType(event.game_type)) return true;
  if (isFivePinsRuleset(event.ruleset_key)) return true;
  const tournament = event.tournament;
  if (tournament && typeof tournament === "object" && "ruleset_key" in tournament) {
    if (isFivePinsRuleset((tournament as { ruleset_key?: unknown }).ruleset_key)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Set-score helpers (read from matchSheetJson)                        */
/* ------------------------------------------------------------------ */

type SetRow = {
  set_number?: number | null;
  player1_points?: number | null;
  player2_points?: number | null;
  winner?: string | null;
  finished?: boolean | null;
};

type SetScoreSummary = {
  isSets: boolean;
  sets: SetRow[];
  setsWon1: number | null;
  setsWon2: number | null;
  totalPoints1: number | null;
  totalPoints2: number | null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export function readSetScoreSummary(
  matchSheetJson: unknown,
  fallback?: { player1_points?: unknown; player2_points?: unknown } | null,
): SetScoreSummary {
  const sheet = toRecord(matchSheetJson);
  const rawSets = Array.isArray(sheet?.sets_result) ? (sheet.sets_result as unknown[]) : [];
  const sets: SetRow[] = rawSets
    .map((row) => toRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      set_number: toNumber(row.set_number),
      player1_points: toNumber(row.player1_points),
      player2_points: toNumber(row.player2_points),
      winner:
        typeof row.winner === "string"
          ? row.winner
          : typeof row.winner === "number"
            ? String(row.winner)
            : null,
      finished: row.finished === true || row.finished === "true",
    }))
    .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));

  const setScore = toRecord(sheet?.setScore);
  let setsWon1 = toNumber(setScore?.player1);
  let setsWon2 = toNumber(setScore?.player2);
  if (setsWon1 === null && setsWon2 === null && sets.length > 0) {
    setsWon1 = sets.filter((s) => s.winner === "player1" || s.winner === "1").length;
    setsWon2 = sets.filter((s) => s.winner === "player2" || s.winner === "2").length;
  }

  const totals = toRecord(sheet?.caromsTotal);
  let totalPoints1 = toNumber(totals?.player1);
  let totalPoints2 = toNumber(totals?.player2);
  if (totalPoints1 === null || totalPoints2 === null) {
    if (sets.length > 0) {
      totalPoints1 = sets.reduce((acc, s) => acc + (s.player1_points ?? 0), 0);
      totalPoints2 = sets.reduce((acc, s) => acc + (s.player2_points ?? 0), 0);
    } else {
      totalPoints1 = toNumber(fallback?.player1_points) ?? 0;
      totalPoints2 = toNumber(fallback?.player2_points) ?? 0;
    }
  }

  return { isSets: true, sets, setsWon1, setsWon2, totalPoints1, totalPoints2 };
}

/** Format a set score cell, e.g. "60" (single number = points of that player in that set). */
const formatSetPoints = (value: number | null): string => {
  if (value === null) return "-";
  if (!Number.isFinite(value)) return "-";
  return String(value);
};

/* ------------------------------------------------------------------ */
/* CEB qualification-ranking builder (P+, P-, P+/P-, points)          */
/* ------------------------------------------------------------------ */

type FivePinsStanding = {
  key: string;
  playerId: number | null;
  playerName: string;
  playerNativeName: string | null;
  playerCountry: string | null;
  groupNumber: number | null;
  record: { wins: number; draws: number; losses: number };
  pointsFor: number; // P+
  pointsAgainst: number; // P-
  pointsRatio: number | null; // P+/P-
  setPoints: number; // Set Points (sets won in played matches)
  matchPoints: number; // Match Points
  place: number;
};

const computeRatio = (p: number, a: number): number | null => {
  if (a === 0) {
    if (p === 0) return null;
    return p; // all points scored, none against — ratio is capped at P+
  }
  const ratio = p / a;
  return Number.isFinite(ratio) ? Math.trunc(ratio * 1000) / 1000 : null;
};

export function buildFivePinsStandings(group: StageMatchGroup): FivePinsStanding[] {
  const byPlayerKey = new Map<string, FivePinsStanding>();
  const seed = (player: NormalizedGroupPlayer, groupNumber: number | null): FivePinsStanding => {
    const key = player.documentId || `${player.name}-${player.country || "xx"}`;
    const existing = byPlayerKey.get(key);
    if (existing) return existing;
    const standing: FivePinsStanding = {
      key,
      playerId: player.id,
      playerName: player.name,
      playerNativeName: player.nativeName,
      playerCountry: player.country,
      groupNumber,
      record: { wins: 0, draws: 0, losses: 0 },
      pointsFor: 0,
      pointsAgainst: 0,
      pointsRatio: null,
      setPoints: 0,
      matchPoints: 0,
      place: 1,
    };
    byPlayerKey.set(key, standing);
    return standing;
  };

  for (const match of group.matches) {
    if (!hasPlayedStageMatch(match)) continue;
    const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail, {
      player1_points: match.top.player.points,
      player2_points: match.bottom.player.points,
    });
    const p1 = seed(match.top.player, group.number);
    const p2 = seed(match.bottom.player, group.number);

    const s1 = summary.setsWon1 ?? 0;
    const s2 = summary.setsWon2 ?? 0;
    const p1pts = summary.totalPoints1 ?? 0;
    const p2pts = summary.totalPoints2 ?? 0;

    p1.pointsFor += p1pts;
    p1.pointsAgainst += p2pts;
    p2.pointsFor += p2pts;
    p2.pointsAgainst += p1pts;
    p1.setPoints += s1;
    p2.setPoints += s2;

    const outcome1 = getMatchOutcome(match.top.player, match.bottom.player);
    if (outcome1 === "W") {
      p1.record.wins += 1;
      p1.matchPoints += 1;
      p2.record.losses += 1;
    } else if (outcome1 === "L") {
      p1.record.losses += 1;
      p2.record.wins += 1;
      p2.matchPoints += 1;
    } else if (outcome1 === "D") {
      p1.record.draws += 1;
      p2.record.draws += 1;
    }
  }

  const standings = Array.from(byPlayerKey.values());
  for (const standing of standings) {
    standing.pointsRatio = computeRatio(standing.pointsFor, standing.pointsAgainst);
  }

  // CEB 5-pins qualification order: Match Points → P+ → P- → P+/P- → set points
  standings.sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
    if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
    if (a.pointsRatio !== null && b.pointsRatio !== null && a.pointsRatio !== b.pointsRatio) {
      return b.pointsRatio - a.pointsRatio;
    }
    if (a.setPoints !== b.setPoints) return b.setPoints - a.setPoints;
    return a.playerName.localeCompare(b.playerName);
  });
  standings.forEach((standing, index) => {
    standing.place = index + 1;
  });
  return standings;
}

/* ------------------------------------------------------------------ */
/* UI components                                                       */
/* ------------------------------------------------------------------ */

function FivePinsGroupMatchesTable({ group }: { group: StageMatchGroup }) {
  const setColumnCount = useMemo(() => {
    let max = 0;
    for (const match of group.matches) {
      const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail);
      max = Math.max(max, summary.sets.length);
    }
    return Math.max(3, max); // CEB template uses 3 sets in groups (best-of-3)
  }, [group.matches]);

  const maxColumns = Math.min(setColumnCount, 7);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-emerald-700 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-44">Player</th>
            <th className="px-2 py-2 text-center font-medium w-20">Date</th>
            {Array.from({ length: maxColumns }, (_, i) => (
              <th key={`set-${i}`} className="px-2 py-2 text-center font-medium w-12">
                Set {i + 1}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-medium w-20">P+/P-</th>
            <th className="px-2 py-2 text-center font-medium w-14">Sets Won</th>
            <th className="px-2 py-2 text-center font-medium w-16">Match Points</th>
          </tr>
        </thead>
        <tbody>
          {group.matches.map((match) => {
            const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail, {
              player1_points: match.top.player.points,
              player2_points: match.bottom.player.points,
            });
            const played = hasPlayedStageMatch(match);
            const outcomeTop = getMatchOutcome(match.top.player, match.bottom.player);
            const outcomeBottom = getMatchOutcome(match.bottom.player, match.top.player);
            const dateTime = match.dateTime;
            const dateCell = dateTime ? (
              <span className="whitespace-nowrap">
                {new Date(dateTime).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" })}
              </span>
            ) : (
              "-"
            );

            const renderPlayerCell = (
              player: NormalizedGroupPlayer,
              outcome: "W" | "L" | "D" | null,
            ) => {
              const flagSrc = getCountryFlagCdnUrl(player.country ?? null, 40);
              return (
                <td className={clsx("px-3 py-2 font-medium", getMatchRowClass(outcome))}>
                  <div className="flex items-center gap-2">
                    {flagSrc ? (
                      <img
                        src={flagSrc}
                        alt={player.country || "flag"}
                        className="h-3.5 w-5 rounded-[2px] object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span className="truncate">{player.name || "-"}</span>
                  </div>
                </td>
              );
            };

            return (
              <Fragment key={match.key}>
                <tr className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {renderPlayerCell(match.top.player, outcomeTop)}
                  <td className="px-2 py-2 text-center">{dateCell}</td>
                  {Array.from({ length: maxColumns }, (_, i) => (
                    <td key={`top-set-${i}`} className="px-2 py-2 text-center">
                      {formatSetPoints(summary.sets[i]?.player1_points ?? null)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">
                    {played
                      ? `${formatNumberValue(summary.totalPoints1)} / ${formatNumberValue(summary.totalPoints2)}`
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {played ? formatNumberValue(summary.setsWon1) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatNumberValue(match.top.player.matchPoints)}
                  </td>
                </tr>
                <tr className="border-t border-gray-100 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                  {renderPlayerCell(match.bottom.player, outcomeBottom)}
                  <td className="px-2 py-2 text-center" />
                  {Array.from({ length: maxColumns }, (_, i) => (
                    <td key={`bottom-set-${i}`} className="px-2 py-2 text-center">
                      {formatSetPoints(summary.sets[i]?.player2_points ?? null)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">
                    {played
                      ? `${formatNumberValue(summary.totalPoints2)} / ${formatNumberValue(summary.totalPoints1)}`
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {played ? formatNumberValue(summary.setsWon2) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatNumberValue(match.bottom.player.matchPoints)}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FivePinsStandingsTable({ standings }: { standings: FivePinsStanding[] }) {
  if (standings.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-emerald-700 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-10">Pos</th>
            <th className="px-3 py-2 text-left font-medium w-44">Player</th>
            <th className="px-2 py-2 text-center font-medium w-20">Record</th>
            <th className="px-2 py-2 text-center font-medium w-14">P+</th>
            <th className="px-2 py-2 text-center font-medium w-14">P-</th>
            <th className="px-2 py-2 text-center font-medium w-16">P+/P-</th>
            <th className="px-2 py-2 text-center font-medium w-14">Sets</th>
            <th className="px-2 py-2 text-center font-medium w-16">Match Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr
              key={standing.key}
              className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <td className="px-3 py-2 text-center font-semibold">{standing.place}</td>
              <td className="px-3 py-2 font-medium truncate">
                <div className="flex items-center gap-2">
                  {(() => {
                    const flagSrc = getCountryFlagCdnUrl(standing.playerCountry ?? null, 40);
                    return flagSrc ? (
                      <img
                        src={flagSrc}
                        alt={standing.playerCountry || "flag"}
                        className="h-3.5 w-5 rounded-[2px] object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null;
                  })()}
                  <span className="truncate">{standing.playerName || "-"}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-center">{formatRecord(standing.record)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.pointsFor)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.pointsAgainst)}</td>
              <td className="px-2 py-2 text-center font-semibold">
                {standing.pointsRatio === null ? "-" : standing.pointsRatio.toFixed(3)}
              </td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.setPoints)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.matchPoints)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function FivePinsEventContent({
  eventIdOverride = null,
  initialEventData = null,
  eventDataOverride = null,
  disableAutoRefresh = false,
  preferredStageDocumentId = null,
  preferredGroupParam = null,
  timezoneOffsetMinutes = null,
  showPublishedFinalResults = false,
  showTimetable = true,
  stageViewMode = "results",
  embeddedOverride,
  showStandaloneTitle = true,
  showEventHeader = true,
  emptyStateMessage = "Select a tournament event from the list to view its stages.",
}: FivePinsEventContentProps = {}) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [eventData, setEventData] = useState<EventApiResponse | null>(
    eventDataOverride ?? initialEventData,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = eventIdOverride ?? searchParams?.get("eventId") ?? null;
  const isEventDataControlled = disableAutoRefresh;
  const embedded = embeddedOverride ?? pathname?.startsWith("/embed/") ?? false;
  const groupLabelMode = "letters" as const;

  const fetchEventPayload = useCallback(async () => {
    if (!eventId) return null;
    const url = `/api/events/${eventId}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to fetch event");
    }
    return response.json() as Promise<EventApiResponse>;
  }, [eventId]);

  useEffect(() => {
    if (!isEventDataControlled) return;
    setEventData(eventDataOverride);
    setIsLoading(false);
    setError(null);
  }, [eventDataOverride, isEventDataControlled]);

  useEffect(() => {
    if (isEventDataControlled) {
      setIsLoading(false);
      setError(null);
      return;
    }
    if (initialEventData?.data) {
      setEventData((current) => current ?? initialEventData);
      setIsLoading(false);
      setError(null);
      return;
    }
    if (!eventId) {
      setEventData(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchEventPayload()
      .then((data) => {
        setEventData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[FivePinsEvent] Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        setIsLoading(false);
      });
  }, [eventId, fetchEventPayload, initialEventData, isEventDataControlled]);

  useEffect(() => {
    if (!eventId || isEventDataControlled) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const payload = await fetchEventPayload();
        if (cancelled) return;
        setEventData((current) => {
          const a = JSON.stringify(current);
          const b = JSON.stringify(payload);
          return a === b ? current : payload;
        });
      } catch {
        // keep current UI on transient failures
      }
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [eventId, fetchEventPayload, isEventDataControlled]);

  const eventStages = useMemo<NormalizedEventStage[]>(() => {
    if (!eventData?.data?.event_stages) return [];
    return toRelationArray(eventData.data.event_stages)
      .map((stage, index) => {
        const normalizedStage = normalizeEntity(stage, `stage-${index}`);
        return {
          id: normalizedStage.id,
          documentId: normalizedStage.documentId,
          title:
            typeof normalizedStage.title === "string" ? normalizedStage.title.trim() : "",
          startDate:
            typeof normalizedStage.start_date === "string"
              ? normalizedStage.start_date
              : null,
          endDate:
            typeof normalizedStage.end_date === "string" ? normalizedStage.end_date : null,
          order: toNumber(normalizedStage.order),
          isFinal: Boolean(normalizedStage.is_final),
          stageType:
            typeof normalizedStage.stage_type === "string"
              ? normalizedStage.stage_type.trim().toLowerCase()
              : null,
          timetableConfig: null,
          groups: toRelationArray(normalizedStage.groups)
            .map((group, groupIndex) =>
              normalizeGroup(group, `${normalizedStage.id}-group-${groupIndex}`),
            )
            .sort((a, b) => {
              if (a.number !== null && b.number !== null) return a.number - b.number;
              return a.id.localeCompare(b.id);
            }),
          results: [],
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [eventData]);

  const activeStage =
    eventStages.find((stage) => stage.documentId === activeStageId) ??
    preferredStageDocumentId
      ? eventStages.find((stage) => stage.documentId === preferredStageDocumentId)
      : eventStages.find((stage) => !stage.isFinal) ??
        eventStages[0] ??
        null;

  const stageMatchGroups = useMemo(() => {
    const map = new Map<string, StageMatchGroup[]>();
    for (const stage of eventStages) {
      map.set(stage.id, buildStageMatchGroups(stage.groups));
    }
    return map;
  }, [eventStages]);

  const eventInfo = useMemo(() => {
    if (!eventData?.data) return null;
    const event = eventData.data;
    return {
      title: typeof event.title === "string" ? event.title : "",
      season: typeof event.season === "number" ? event.season : null,
      startDate: typeof event.start_date === "string" ? event.start_date : null,
      endDate: typeof event.end_date === "string" ? event.end_date : null,
    };
  }, [eventData]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groups =
    activeStage && stageMatchGroups.get(activeStage.id)
      ? stageMatchGroups.get(activeStage.id)!
      : [];
  const filteredGroups = groups.filter((group) => {
    if (!preferredGroupParam) return true;
    const letter = typeof group.number === "number" ? String.fromCharCode(64 + group.number) : "";
    return (
      String(group.number) === preferredGroupParam ||
      letter.toLowerCase() === preferredGroupParam.toLowerCase()
    );
  });

  const renderStageTabs = () => (
    <div className="flex flex-wrap items-center gap-2">
      {eventStages.map((stage) => (
        <button
          key={stage.documentId}
          onClick={() => setActiveStageId(stage.documentId)}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeStage?.documentId === stage.documentId
              ? "bg-emerald-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
          )}
        >
          {stage.title || "Stage"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full px-4 py-8" style={{ maxWidth: "var(--bt-page-width, 1280px)" }}>
      <div className="flex flex-col gap-4">
        {showStandaloneTitle ? (
          <h1 className="text-2xl font-semibold">Tournament Events</h1>
        ) : null}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
          {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
          {!isLoading && !error && !eventId && (
            <div className="text-sm text-gray-500 dark:text-gray-400">{emptyStateMessage}</div>
          )}
          {!isLoading && !error && eventId && eventStages.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No stages found for this event.</div>
          )}
          {eventInfo && eventStages.length > 0 && (
            <div className="flex flex-col gap-4">
              {showEventHeader && (
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {eventInfo.title}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {eventInfo.season && <span>Season {eventInfo.season}</span>}
                    {formatDateRange(eventInfo.startDate, eventInfo.endDate) && (
                      <span>{formatDateRange(eventInfo.startDate, eventInfo.endDate)}</span>
                    )}
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      5-Pins
                    </span>
                  </div>
                </div>
              )}

              {renderStageTabs()}

              {activeStage ? (
                <div className="flex flex-col gap-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {stageViewMode === "ranks" ? `Ranking - ${activeStage.title}` : `Matches - ${activeStage.title}`}
                  </div>

                  {filteredGroups.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No groups found.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredGroups.map((group) => {
                        const groupKey = group.key;
                        const isExpanded = expandedGroups.has(groupKey);
                        const standings = buildFivePinsStandings(group);
                        const groupLetter =
                          typeof group.number === "number"
                            ? String.fromCharCode(64 + group.number)
                            : "?";
                        return (
                          <div
                            key={groupKey}
                            className="rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <button
                              onClick={() => toggleGroup(groupKey)}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                            >
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Group {groupLetter}
                              </span>
                              <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                            </button>
                            {isExpanded && (
                              <div className="flex flex-col gap-3 p-3">
                                <FivePinsGroupMatchesTable group={group} />
                                <FivePinsStandingsTable standings={standings} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">Select a stage.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FivePinsEventContent;
