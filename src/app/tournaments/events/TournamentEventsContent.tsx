"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import type {
  EventApiResponse,
  NormalizedEventStage,
  NormalizedFinalResult,
  NormalizedStageResult,
  NormalizedTimetableSlot,
  StrapiEventTimetableSlot,
  StageMatchGroup,
} from "./types";
import { buildTournamentSlug } from "@/lib/tournaments";
import {
  toRelationArray,
  normalizeEntity,
  normalizeGroup,
  normalizeFinalResult,
  normalizeResult,
  toNumber,
  formatDateRange,
  formatDateForTable,
  formatNumberValue,
  formatAverage,
  formatOutcomeLabel,
  getMatchRowClass,
  getDateCellClass,
  buildStageMatchGroups,
  buildGroupStandings,
} from "./utils";
import GroupStandingsTable from "./GroupStandingsTable";
import SingleElimBracket, { type BracketRoundView } from "./SingleElimBracket";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

const BRACKET_STAGE_TYPES = new Set([
  "double_elimination",
  "single_elimination",
  "brackets",
  "bracket",
  "knockout",
]);

function isBracketStageType(stageType: string | null | undefined): boolean {
  return (
    typeof stageType === "string" &&
    BRACKET_STAGE_TYPES.has(stageType.trim().toLowerCase())
  );
}

type TournamentEventsContentProps = {
  eventIdOverride?: string | null;
  preferredStageDocumentId?: string | null;
  onStageSelect?: (stageDocumentId: string) => void;
  showPublishedFinalResults?: boolean;
  showTimetable?: boolean;
  stageViewMode?: "results" | "ranks";
  embeddedOverride?: boolean;
  showStandaloneTitle?: boolean;
  showEventHeader?: boolean;
  emptyStateMessage?: string;
  liveSessionsOverride?: EventLiveSession[] | null;
  onLiveMatchOpen?: (sessionId: string) => void;
};

type EventLiveSession = {
  id: string;
  documentId: string;
  eventId: string | null;
  eventStageId: string | null;
  groupNumber: number | null;
  screenIdentifier: string | null;
  player1DocumentId: string | null;
  player2DocumentId: string | null;
  player1Name: string | null;
  player2Name: string | null;
  sessionStatus: string | null;
};

function PlayerNameWithFlag({
  name,
  nativeName,
  country,
  highlight = false,
}: {
  name: string;
  nativeName?: string | null;
  country?: string | null;
  highlight?: boolean;
}) {
  const flagSrc = getCountryFlagCdnUrl(country ?? null, 40);
  return (
    <div className="flex items-start gap-2 leading-tight">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt={country || "flag"}
          className="mt-0.5 h-3.5 w-5 rounded-[2px] object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="flex flex-col leading-tight">
        <span
          className={clsx(
            "font-semibold",
            highlight && "text-yellow-600 dark:text-yellow-300",
          )}
        >
          {name || "Unknown"}
        </span>
        {nativeName && nativeName.trim() !== name.trim() && (
          <span
            className={clsx(
              "text-[10px] text-gray-500 dark:text-gray-400",
              highlight && "text-yellow-600/80 dark:text-yellow-300/80",
            )}
          >
            {nativeName}
          </span>
        )}
      </div>
    </div>
  );
}

function getPreviewPlayerLabel(player: {
  name?: string | null;
  nativeName?: string | null;
}) {
  return player.name || player.nativeName || "Unknown";
}

function getGroupPreviewPlayers(group: StageMatchGroup) {
  return Array.from(
    new Map(
      group.matches
        .flatMap((match) => [match.top.player, match.bottom.player])
        .map((player) => [
          player.documentId || `${player.name}-${player.country || "xx"}`,
          player,
        ]),
    ).values(),
  );
}

function getGroupKey(stage: NormalizedEventStage, group: StageMatchGroup) {
  return `${stage.documentId || stage.id}-${group.number ?? group.key}`;
}

function hasMeaningfulStageResult(
  result: NormalizedStageResult,
): boolean {
  return (
    (result.matchPoints ?? 0) > 0 ||
    (result.points ?? 0) > 0 ||
    (result.innings ?? 0) > 0 ||
    (result.highRun ?? 0) > 0
  );
}

function normalizeTimetableSlot(
  slot: unknown,
  fallbackId: string,
): NormalizedTimetableSlot {
  const normalized = normalizeEntity<StrapiEventTimetableSlot>(slot, fallbackId);
  const stage = normalized.stage
    ? normalizeEntity<{ title?: unknown }>(
        normalized.stage,
        `${normalized.id}-stage`,
      )
    : null;
  const match = normalized.match
    ? normalizeEntity<{
        number?: unknown;
        player1?: unknown;
        player2?: unknown;
      }>(normalized.match, `${normalized.id}-match`)
    : null;
  const player1 = match
    ? normalizeEntity<{ full_name?: unknown; full_name_en?: unknown }>(
        match.player1,
        `${match.id}-p1`,
      )
    : null;
  const player2 = match
    ? normalizeEntity<{ full_name?: unknown; full_name_en?: unknown }>(
        match.player2,
        `${match.id}-p2`,
      )
    : null;
  const player1Name =
    typeof player1?.full_name_en === "string" && player1.full_name_en.trim()
      ? player1.full_name_en
      : typeof player1?.full_name === "string"
        ? player1.full_name
        : normalized.metadata &&
            typeof normalized.metadata === "object" &&
            typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer1Name === "string"
          ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer1Name as string)
          : "";
  const player2Name =
    typeof player2?.full_name_en === "string" && player2.full_name_en.trim()
      ? player2.full_name_en
      : typeof player2?.full_name === "string"
        ? player2.full_name
        : normalized.metadata &&
            typeof normalized.metadata === "object" &&
            typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer2Name === "string"
          ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer2Name as string)
          : "";
  const player1Country =
    player1 && typeof (player1 as Record<string, unknown>).country === "string"
      ? ((player1 as Record<string, unknown>).country as string)
      : normalized.metadata &&
          typeof normalized.metadata === "object" &&
          typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer1Country === "string"
        ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer1Country as string)
      : null;
  const player2Country =
    player2 && typeof (player2 as Record<string, unknown>).country === "string"
      ? ((player2 as Record<string, unknown>).country as string)
      : normalized.metadata &&
          typeof normalized.metadata === "object" &&
          typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer2Country === "string"
        ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer2Country as string)
      : null;
  const groupNumber = toNumber(match?.number) ?? toNumber(
    normalized.metadata &&
      typeof normalized.metadata === "object" &&
      "groupNumber" in normalized.metadata
      ? (normalized.metadata as Record<string, unknown>).groupNumber
      : null,
  );
  const matchNumber = toNumber(
    normalized.metadata &&
      typeof normalized.metadata === "object" &&
      "matchNumber" in normalized.metadata
      ? (normalized.metadata as Record<string, unknown>).matchNumber
      : null,
  );
  const trainingPlayerName =
    normalized.metadata &&
    typeof normalized.metadata === "object" &&
    typeof (normalized.metadata as Record<string, unknown>).trainingPlayerName === "string"
      ? ((normalized.metadata as Record<string, unknown>).trainingPlayerName as string)
      : "";
  const trainingPlayerCountry =
    normalized.metadata &&
    typeof normalized.metadata === "object" &&
    typeof (normalized.metadata as Record<string, unknown>).trainingPlayerCountry === "string"
      ? ((normalized.metadata as Record<string, unknown>).trainingPlayerCountry as string)
      : null;

  return {
    id: normalized.id,
    documentId: normalized.documentId,
    slotType:
      typeof normalized.slot_type === "string" && normalized.slot_type.trim()
        ? normalized.slot_type
        : "match",
    title: typeof normalized.title === "string" ? normalized.title : "",
    subtitle: typeof normalized.subtitle === "string" ? normalized.subtitle : "",
    description:
      typeof normalized.description === "string" ? normalized.description : "",
    date: typeof normalized.date === "string" ? normalized.date : "",
    time: typeof normalized.time === "string" ? normalized.time : "",
    dateTime:
      typeof normalized.date_time === "string" ? normalized.date_time : null,
    tableLabel:
      typeof normalized.table_label === "string" ? normalized.table_label : "",
    tableOrder: toNumber(normalized.table_order),
    slotOrder: toNumber(normalized.slot_order),
    slotStatus:
      typeof normalized.slot_status === "string" && normalized.slot_status.trim()
        ? normalized.slot_status
        : "scheduled",
    isVisible: normalized.is_visible !== false,
    isPublished: normalized.is_published === true,
    source: typeof normalized.source === "string" ? normalized.source : "",
    metadata:
      normalized.metadata && typeof normalized.metadata === "object"
        ? (normalized.metadata as Record<string, unknown>)
        : null,
    stageTitle:
      typeof stage?.title === "string" && stage.title.trim()
        ? stage.title
        : null,
    stageDocumentId: stage?.documentId ?? null,
    groupNumber,
    matchNumber,
    matchLabel:
      player1Name || player2Name
        ? [player1Name, player2Name].filter(Boolean).join(" vs ")
        : matchNumber !== null
          ? `Match ${matchNumber}`
          : null,
    trainingPlayerName: trainingPlayerName || null,
    trainingPlayerCountry,
    matchPlayer1Name: player1Name || null,
    matchPlayer2Name: player2Name || null,
    matchPlayer1Country:
      player1Country,
    matchPlayer2Country:
      player2Country,
    matchDocumentId: match?.documentId ?? null,
  };
}

function StageRankingTable({
  stage,
  embedded,
  playerProfileHref,
}: {
  stage: NormalizedEventStage;
  embedded: boolean;
  playerProfileHref: (playerId: string | number, playerName: string) => string;
}) {
  const visibleResults = stage.results.filter(hasMeaningfulStageResult);
  const showGroupColumn = visibleResults.some(
    (result) => result.groupNumber !== null,
  );
  const showGroupPositionColumn = visibleResults.some(
    (result) => result.groupPosition !== null,
  );

  if (visibleResults.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No ranking published for this stage.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Player</th>
            {showGroupColumn && (
              <th className="px-4 py-3 text-center font-semibold">Group</th>
            )}
            {showGroupPositionColumn && (
              <th className="px-4 py-3 text-center font-semibold">
                Pos in group
              </th>
            )}
            <th className="px-4 py-3 text-center font-semibold">MP</th>
            <th className="px-4 py-3 text-center font-semibold">Points</th>
            <th className="px-4 py-3 text-center font-semibold">Innings</th>
            <th className="px-4 py-3 text-center font-semibold">AVG</th>
            <th className="px-4 py-3 text-center font-semibold">H.R.</th>
          </tr>
        </thead>
        <tbody>
          {visibleResults.map((result, index) => (
            <tr
              key={result.id}
              className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <td className="px-4 py-3 font-semibold">
                {formatNumberValue(result.finalPosition ?? index + 1)}
              </td>
              <td className="px-4 py-3 font-medium">
                {result.playerId ? (
                  <Link
                    href={playerProfileHref(result.playerId, result.playerName)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    <PlayerNameWithFlag
                      name={result.playerName || "Unknown"}
                      nativeName={result.playerNativeName}
                      country={result.playerCountry}
                    />
                  </Link>
                ) : (
                  <PlayerNameWithFlag
                    name={result.playerName || "Unknown"}
                    nativeName={result.playerNativeName}
                    country={result.playerCountry}
                  />
                )}
              </td>
              {showGroupColumn && (
                <td className="px-4 py-3 text-center">
                  {formatNumberValue(result.groupNumber)}
                </td>
              )}
              {showGroupPositionColumn && (
                <td className="px-4 py-3 text-center">
                  {formatNumberValue(result.groupPosition)}
                </td>
              )}
              <td className="px-4 py-3 text-center">
                {formatNumberValue(result.matchPoints)}
              </td>
              <td className="px-4 py-3 text-center">
                {formatNumberValue(result.points)}
              </td>
              <td className="px-4 py-3 text-center">
                {formatNumberValue(result.innings)}
              </td>
              <td className="px-4 py-3 text-center">
                {formatAverage(result.points, result.innings)}
              </td>
              <td className="px-4 py-3 text-center">
                {formatNumberValue(result.highRun)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
  const url = `/api/events/${eventId}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch event");
  }
  return response.json();
};

export function TournamentEventsContent({
  eventIdOverride = null,
  preferredStageDocumentId = null,
  onStageSelect,
  showPublishedFinalResults = false,
  showTimetable = true,
  stageViewMode = "results",
  embeddedOverride,
  showStandaloneTitle = true,
  showEventHeader = true,
  emptyStateMessage = "Select a tournament event from the list to view its stages.",
  liveSessionsOverride = null,
  onLiveMatchOpen,
}: TournamentEventsContentProps = {}) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [previewColumnCount, setPreviewColumnCount] = useState(4);
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deBracketType, setDeBracketType] = useState<"winners" | "losers">(
    "winners",
  );
  const [deSelectedRound, setDeSelectedRound] = useState<string>("all");
  const [deExpandedMatchId, setDeExpandedMatchId] = useState<string | null>(
    null,
  );
  const [liveSessions, setLiveSessions] = useState<EventLiveSession[]>([]);
  const [brMatchesByStage, setBrMatchesByStage] = useState<
    Record<string, unknown[]>
  >({});
  const [brLoadingByStage, setBrLoadingByStage] = useState<
    Record<string, boolean>
  >({});
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = eventIdOverride ?? searchParams?.get("eventId") ?? null;
  const embedded = embeddedOverride ?? pathname?.startsWith("/embed/") ?? false;
  const tournamentContextSlug = eventData?.data?.title
    ? buildTournamentSlug(
        "",
        String(eventData.data.title),
        typeof eventData.data.season === "number"
          ? eventData.data.season
          : null,
      )
    : null;
  const playerProfileHref = (playerId: string | number, playerName: string) =>
    `${embedded ? "/embed" : ""}/players/${String(playerId)}-${playerName.trim().replace(/\s+/g, "-")}${
      tournamentContextSlug
        ? `?tournament=${encodeURIComponent(tournamentContextSlug)}`
        : ""
    }`;

  const liveBadgeAnimation = `@keyframes btLivePulse {
        0%, 100% { opacity: 0.72; background-color: #ffd21c; box-shadow: inset 0 0 0 0 rgba(255,255,255,0.0); }
        50% { opacity: 1; background-color: #ffea72; box-shadow: inset 0 0 0 3px rgba(255,255,255,0.28); }
    }`;

  // Fetch event data
  useEffect(() => {
    if (!eventId) {
      setEventData(null);
      setError(null);
      return;
    }

    console.log("[TournamentEvents] Fetching event:", eventId);
    setIsLoading(true);
    setError(null);

    fetchEvent(eventId)
      .then((data) => {
        console.log("[TournamentEvents] Event data received:", data);
        setEventData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[TournamentEvents] Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        setIsLoading(false);
      });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setLiveSessions([]);
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];
    let intervalId: number | null = null;

    const fetchLiveSessions = async () => {
      try {
        const response = await fetch(
          `/api/tournaments/${encodeURIComponent(eventId)}/live-sessions`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => ({ data: [] }))) as {
          data?: EventLiveSession[];
        };
        if (!response.ok) {
          throw new Error("Failed to fetch live sessions");
        }
        if (!cancelled) {
          setLiveSessions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setLiveSessions([]);
        }
      }
    };

    void fetchLiveSessions();
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 1500));
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 4000));
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 8000));
    intervalId = window.setInterval(() => {
      void fetchLiveSessions();
    }, 5000);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [eventId]);

  const eventStages = useMemo<NormalizedEventStage[]>(() => {
    if (!eventData?.data?.event_stages) return [];

    const stagesArray = toRelationArray(eventData.data.event_stages);

    return stagesArray
      .map((stage, index) => {
        const normalizedStage = normalizeEntity(stage, `stage-${index}`);

        const title =
          typeof normalizedStage.title === "string"
            ? normalizedStage.title.trim()
            : "";
        const startDate =
          typeof normalizedStage.start_date === "string"
            ? normalizedStage.start_date
            : null;
        const endDate =
          typeof normalizedStage.end_date === "string"
            ? normalizedStage.end_date
            : null;
        const order = toNumber(normalizedStage.order);
        const isFinal = Boolean(normalizedStage.is_final);
        const stageType =
          typeof normalizedStage.stage_type === "string"
            ? normalizedStage.stage_type.trim().toLowerCase()
            : null;

        const groupsRaw = toRelationArray(normalizedStage.groups);
        const resultsRaw = toRelationArray(normalizedStage.results);

        const groups = groupsRaw
          .map((group, groupIndex) =>
            normalizeGroup(group, `${normalizedStage.id}-group-${groupIndex}`),
          )
          .sort((a, b) => {
            if (a.number !== null && b.number !== null)
              return a.number - b.number;
            if (a.number !== null) return -1;
            if (b.number !== null) return 1;
            return a.id.localeCompare(b.id);
          });

        const results = resultsRaw
          .map((result, resultIndex) =>
            normalizeResult(
              result,
              `${normalizedStage.id}-result-${resultIndex}`,
            ),
          )
          .sort((a, b) => {
            if (a.finalPosition !== null && b.finalPosition !== null)
              return a.finalPosition - b.finalPosition;
            if (a.finalPosition !== null) return -1;
            if (b.finalPosition !== null) return 1;
            if (a.groupNumber !== null && b.groupNumber !== null)
              return a.groupNumber - b.groupNumber;
            if (a.groupNumber !== null) return -1;
            if (b.groupNumber !== null) return 1;
            return a.id.localeCompare(b.id);
          });

        return {
          id: normalizedStage.id,
          documentId: normalizedStage.documentId,
          title,
          startDate,
          endDate,
          order,
          isFinal,
          stageType,
          groups,
          results,
        };
      })
      .sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const stageMatchGroups = useMemo<Record<string, StageMatchGroup[]>>(
    () => {
      const autoScheduledMatchIdsByStage = new Map<string, Set<string>>();
      if (eventData?.data?.timetable_slots) {
        toRelationArray(eventData.data.timetable_slots)
          .map((slot, index) => normalizeTimetableSlot(slot, `slot-${index}`))
          .forEach((slot) => {
            if (
              slot.slotType !== "match" ||
              !slot.stageDocumentId ||
              !slot.matchDocumentId ||
              !slot.source.startsWith("auto-generated")
            ) {
              return;
            }
            const existing =
              autoScheduledMatchIdsByStage.get(slot.stageDocumentId) ??
              new Set<string>();
            existing.add(slot.matchDocumentId);
            autoScheduledMatchIdsByStage.set(slot.stageDocumentId, existing);
          });
      }

      return eventStages.reduce<Record<string, StageMatchGroup[]>>(
        (acc, stage) => {
          const visibleGroups =
            autoScheduledMatchIdsByStage.has(stage.documentId)
              ? stage.groups.filter((match) => {
                  const hasPlayed =
                    (match.player1.matchPoints ?? 0) > 0 ||
                    (match.player2.matchPoints ?? 0) > 0 ||
                    (match.player1.points ?? 0) > 0 ||
                    (match.player2.points ?? 0) > 0 ||
                    (match.player1.innings ?? 0) > 0 ||
                    (match.player2.innings ?? 0) > 0;
                  const allowed = match.documentId
                    ? autoScheduledMatchIdsByStage
                        .get(stage.documentId)
                        ?.has(match.documentId) ?? false
                    : false;
                  return hasPlayed || allowed;
                })
              : stage.groups;
          acc[stage.id] = buildStageMatchGroups(visibleGroups);
          return acc;
        },
        {},
      );
    },
    [eventData, eventStages],
  );

  const publishedFinalResults = useMemo<NormalizedFinalResult[]>(() => {
    if (!eventData?.data?.results_final) return [];

    const resultsArray = toRelationArray(eventData.data.results_final);

    return resultsArray
      .map((result, index) =>
        normalizeFinalResult(result, `final-result-${index}`),
      )
      .sort((a, b) => {
        if (a.position !== null && b.position !== null)
          return a.position - b.position;
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const timetableSlots = useMemo<NormalizedTimetableSlot[]>(() => {
    if (!eventData?.data?.timetable_slots) return [];

    return toRelationArray(eventData.data.timetable_slots)
      .map((slot, index) => normalizeTimetableSlot(slot, `slot-${index}`))
      .filter((slot) => slot.isVisible)
      .sort((a, b) => {
        const aDateTime = a.dateTime ? Date.parse(a.dateTime) : Number.NaN;
        const bDateTime = b.dateTime ? Date.parse(b.dateTime) : Number.NaN;
        if (
          !Number.isNaN(aDateTime) &&
          !Number.isNaN(bDateTime) &&
          aDateTime !== bDateTime
        ) {
          return aDateTime - bDateTime;
        }
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        if (a.tableOrder !== null && b.tableOrder !== null && a.tableOrder !== b.tableOrder) {
          return a.tableOrder - b.tableOrder;
        }
        if (a.tableOrder !== null) return -1;
        if (b.tableOrder !== null) return 1;
        if (a.slotOrder !== null && b.slotOrder !== null && a.slotOrder !== b.slotOrder) {
          return a.slotOrder - b.slotOrder;
        }
        if (a.slotOrder !== null) return -1;
        if (b.slotOrder !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const getEffectiveFinalPoints = useCallback(
    (result: NormalizedFinalResult) => {
      if (result.finalPoints === null) return null;
      const hasScoringSignal =
        result.rankingPoints !== null || result.penalty !== null;
      if (
        !hasScoringSignal &&
        result.caroms !== null &&
        result.finalPoints === result.caroms
      ) {
        return null;
      }
      return result.finalPoints;
    },
    [],
  );

  const showRankPointsColumn = useMemo(
    () => publishedFinalResults.some((result) => result.rankingPoints !== null),
    [publishedFinalResults],
  );
  const showPenaltyColumn = useMemo(
    () => publishedFinalResults.some((result) => result.penalty !== null),
    [publishedFinalResults],
  );
  const showFinalPointsColumn = useMemo(
    () =>
      publishedFinalResults.some(
        (result) => getEffectiveFinalPoints(result) !== null,
      ),
    [getEffectiveFinalPoints, publishedFinalResults],
  );

  // Keep active stage in sync with external tournament hero selection when present.
  useEffect(() => {
    if (eventStages.length === 0) return;

    if (preferredStageDocumentId) {
      const preferredStage =
        eventStages.find(
          (stage) => stage.documentId === preferredStageDocumentId,
        ) ?? null;
      if (preferredStage && preferredStage.id !== activeStageId) {
        setActiveStageId(preferredStage.id);
        return;
      }
    }

    if (!activeStageId) {
      setActiveStageId(eventStages[0].id);
    }
  }, [eventStages, activeStageId, preferredStageDocumentId]);

  useEffect(() => {
    const updatePreviewColumnCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setPreviewColumnCount(1);
      } else if (width < 900) {
        setPreviewColumnCount(2);
      } else if (width < 1280) {
        setPreviewColumnCount(3);
      } else {
        setPreviewColumnCount(4);
      }
    };

    updatePreviewColumnCount();
    window.addEventListener("resize", updatePreviewColumnCount);
    return () =>
      window.removeEventListener("resize", updatePreviewColumnCount);
  }, []);

  const activeStage = useMemo(
    () => eventStages.find((stage) => stage.id === activeStageId) ?? null,
    [eventStages, activeStageId],
  );
  const effectiveLiveSessions = liveSessionsOverride ?? liveSessions;
  const normalizeLiveName = useCallback((value: string | null | undefined) => {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }, []);
  const normalizedPlayerSearchQuery = useMemo(
    () => normalizeLiveName(playerSearchQuery),
    [normalizeLiveName, playerSearchQuery],
  );
  const playerSearchTerms = useMemo(
    () =>
      normalizedPlayerSearchQuery
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length > 0),
    [normalizedPlayerSearchQuery],
  );
  const playerMatchesSearch = useCallback(
    (
      player: {
        name?: string | null;
        nativeName?: string | null;
        country?: string | null;
      },
      searchTerms: string[],
    ) => {
      if (searchTerms.length === 0) return false;

      const haystack = [player.name, player.nativeName, player.country]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .join(" ");

      return searchTerms.every((term) => haystack.includes(term));
    },
    [normalizeLiveName],
  );
  const filteredActiveStageGroups = useMemo(() => {
    if (!activeStage) return [];

    const groups = stageMatchGroups[activeStage.id] ?? [];
    if (!normalizedPlayerSearchQuery) return groups;
    if (playerSearchTerms.length === 0) return groups;

    return groups.filter((group) =>
      group.matches.some((match) =>
        [match.top.player, match.bottom.player].some((player) => {
          return playerMatchesSearch(player, playerSearchTerms);
        }),
      ),
    );
  }, [
    activeStage,
    normalizedPlayerSearchQuery,
    playerMatchesSearch,
    playerSearchTerms,
    stageMatchGroups,
  ]);
  const previewGridTemplateColumns = useMemo(() => {
    if (filteredActiveStageGroups.length === 0) return "";

    const maxLengths: number[] = [];
    filteredActiveStageGroups.forEach((group) => {
      getGroupPreviewPlayers(group).forEach((player, index) => {
        const columnIndex = index % previewColumnCount;
        const length = getPreviewPlayerLabel(player).trim().length;
        maxLengths[columnIndex] = Math.max(
          maxLengths[columnIndex] ?? 0,
          length,
        );
      });
    });

    return maxLengths
      .map((length) => `${Math.min(Math.max(length + 4, 16), 30)}ch`)
      .join(" ");
  }, [filteredActiveStageGroups, previewColumnCount]);
  const liveSessionByMatchKey = useMemo(() => {
    const map = new Map<string, EventLiveSession>();
    effectiveLiveSessions.forEach((session) => {
      if (!session.eventStageId || session.groupNumber == null) return;
      const playerIds = [session.player1DocumentId, session.player2DocumentId]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .sort();
      if (playerIds.length !== 2) return;
      const key = `${session.eventStageId}::${session.groupNumber}::${playerIds.join("::")}`;
      if (!map.has(key)) {
        map.set(key, session);
      }
    });
    return map;
  }, [effectiveLiveSessions]);
  const liveSessionsByStageId = useMemo(() => {
    const map = new Map<string, EventLiveSession[]>();
    effectiveLiveSessions.forEach((session) => {
      if (!session.eventStageId) return;
      const existing = map.get(session.eventStageId) ?? [];
      existing.push(session);
      map.set(session.eventStageId, existing);
    });
    return map;
  }, [effectiveLiveSessions]);
  const liveSessionByPlayerNames = useMemo(() => {
    const map = new Map<string, EventLiveSession>();
    effectiveLiveSessions.forEach((session) => {
      const playerNames = [session.player1Name, session.player2Name]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .sort();
      if (playerNames.length !== 2) return;
      const key = playerNames.join("::");
      if (!map.has(key)) {
        map.set(key, session);
      }
    });
    return map;
  }, [effectiveLiveSessions, normalizeLiveName]);

  const normalizeBracketPlayer = useCallback(
    (player: unknown): { name: string; country: string | null } => {
      try {
        const src =
          player &&
          typeof player === "object" &&
          "data" in (player as Record<string, unknown>)
            ? ((player as { data?: unknown }).data ?? player)
            : player;
        const attr =
          src &&
          typeof src === "object" &&
          "attributes" in (src as Record<string, unknown>)
            ? ((src as { attributes?: Record<string, unknown> }).attributes ??
              src)
            : src;

        if (!attr || typeof attr !== "object") return { name: "", country: null };
        const fullName = (attr as Record<string, unknown>).full_name;
        const country = (attr as Record<string, unknown>).country;
        return {
          name: typeof fullName === "string" ? fullName : "",
          country: typeof country === "string" ? country : null,
        };
      } catch {
        return { name: "", country: null };
      }
    },
    [],
  );

  const fetchBracketMatches = useCallback(async (stageDocumentId: string) => {
    if (!stageDocumentId) return;
    setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: true }));
    try {
      const res = await fetch(
        `/api/event-stages/${encodeURIComponent(stageDocumentId)}/matches`,
        {
          cache: "no-store",
        },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to load bracket matches");
      const json = JSON.parse(text);
      const arr = Array.isArray(json?.matches)
        ? (json.matches as unknown[])
        : [];
      setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: arr }));
    } catch (e) {
      console.warn("[TournamentEvents] Failed to fetch bracket matches:", e);
      setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: [] }));
    } finally {
      setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: false }));
    }
  }, []);

  useEffect(() => {
    if (!activeStage || !isBracketStageType(activeStage.stageType)) return;
    if (brMatchesByStage[activeStage.documentId]) return;
    void fetchBracketMatches(activeStage.documentId);
  }, [activeStage, brMatchesByStage, fetchBracketMatches]);

  const activeBracketRounds = useMemo<BracketRoundView[]>(() => {
    if (!activeStage || !isBracketStageType(activeStage.stageType)) return [];
    const sourceRaw = brMatchesByStage[activeStage.documentId];
    const source = Array.isArray(sourceRaw) ? sourceRaw : [];
    if (source.length === 0) return [];

    const canonicalizeRound = (raw: string): string => {
      const upper = (raw || "").toUpperCase().trim();
      if (!upper) return "";
      if (upper === "WINNERS FINAL" || upper === "FINAL") return "F";
      if (upper === "R32" || upper.includes("ROUND OF 32")) return "R32";
      if (
        upper === "R16" ||
        upper.includes("ROUND OF 16") ||
        upper.includes("LAST 16")
      )
        return "R16";
      if (upper === "R8" || upper.includes("QUARTER")) return "QF";
      if (upper === "R4" || upper.includes("SEMI")) return "SF";
      if (upper === "R2" || upper === "F" || upper.includes("FINAL"))
        return "F";
      const winnersRound = upper.match(/^WINNERS R(\d+)$/);
      if (winnersRound) return `Round ${Number(winnersRound[1])}`;
      const roundNumber = upper.match(/^ROUND\s+(\d+)$/);
      if (roundNumber) return `Round ${Number(roundNumber[1])}`;
      const m = upper.match(/^R(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n === 8) return "QF";
        if (n === 4) return "SF";
        if (n === 2) return "F";
        return `R${n}`;
      }
      return upper;
    };

    const getRoundPriority = (label: string): number => {
      const upper = label.toUpperCase().trim();
      const fixedPriority: Record<string, number> = {
        R128: 0,
        R64: 1,
        R32: 2,
        R16: 3,
        QF: 4,
        SF: 5,
        F: 6,
      };
      if (upper in fixedPriority) return fixedPriority[upper];

      const numberedRound = upper.match(/^ROUND\s+(\d+)$/);
      if (numberedRound) return 100 + Number(numberedRound[1]);

      return 999;
    };

    const byRound = new Map<string, unknown[]>();
    source.forEach((m) => {
      const bracket =
        typeof (m as { bracket_type?: unknown }).bracket_type === "string"
          ? (m as { bracket_type: string }).bracket_type
          : "winners";
      if (bracket !== "winners") return;
      const rawRound =
        typeof (m as { round?: unknown }).round === "string"
          ? (m as { round: string }).round
          : "";
      const label = canonicalizeRound(rawRound);
      if (!label) return;
      const arr = byRound.get(label) ?? [];
      arr.push(m);
      byRound.set(label, arr);
    });

    const orderedLabels = Array.from(byRound.keys()).sort((a, b) => {
      const pa = getRoundPriority(a);
      const pb = getRoundPriority(b);
      if (pa !== pb) return pa - pb;
      return (byRound.get(b)?.length ?? 0) - (byRound.get(a)?.length ?? 0);
    });

    const idByRoundAndNumber = new Map<string, Map<number, string>>();
    orderedLabels.forEach((label) => {
      const inner = new Map<number, string>();
      let arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );

      if ((label || "").toUpperCase().trim() === "F" && arr.length > 1) {
        const onlyPrimaryFinal = arr.filter(
          (m) =>
            (toNumber((m as { match_number?: unknown }).match_number) ?? 0) <= 1,
        );
        arr =
          onlyPrimaryFinal.length > 0
            ? onlyPrimaryFinal.slice(0, 1)
            : arr.slice(0, 1);
      }

      if (arr.length > 1) {
        const byNumber = new Map<number, unknown>();
        const scoreOf = (match: unknown) => {
          const matchRecord =
            match && typeof match === "object"
              ? (match as Record<string, unknown>)
              : {};
          const p1 = normalizeBracketPlayer(matchRecord.player1);
          const p2 = normalizeBracketPlayer(matchRecord.player2);
          const s1 =
            toNumber(matchRecord.player1_points) ??
            toNumber(matchRecord.player1_match_points);
          const s2 =
            toNumber(matchRecord.player2_points) ??
            toNumber(matchRecord.player2_match_points);
          const hasScores = s1 !== null || s2 !== null;
          const hasDate =
            typeof matchRecord.date_time === "string" &&
            matchRecord.date_time.trim().length > 0;
          const source = typeof matchRecord.source === "string" ? matchRecord.source : "";
          const hasForfeit =
            source === "ff-1" || source === "ff-2" || source === "double-ff";
          let score = 0;
          if (p1.name && p2.name) score += 4;
          if (hasScores) score += 3;
          if (hasDate) score += 2;
          if (hasForfeit) score += 1;
          return score;
        };

        arr.forEach((match) => {
          const number =
            toNumber((match as { match_number?: unknown }).match_number) ?? 0;
          const existing = byNumber.get(number);
          if (!existing || scoreOf(match) >= scoreOf(existing)) {
            byNumber.set(number, match);
          }
        });

        arr = Array.from(byNumber.values()).sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );
      }

      arr.forEach((m) => {
        const num =
          toNumber((m as { match_number?: unknown }).match_number) ?? 0;
        const id = (m as { id?: unknown }).id;
        if (num > 0 && id !== undefined && id !== null)
          inner.set(num, String(id));
      });
      idByRoundAndNumber.set(label, inner);
    });

    return orderedLabels.map((label, idx) => {
      const nextLabel = orderedLabels[idx + 1] || null;
      const nextMap = nextLabel ? idByRoundAndNumber.get(nextLabel) : undefined;
      let arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );

      if ((label || "").toUpperCase().trim() === "F" && arr.length > 1) {
        const onlyPrimaryFinal = arr.filter(
          (m) =>
            (toNumber((m as { match_number?: unknown }).match_number) ?? 0) <= 1,
        );
        arr =
          onlyPrimaryFinal.length > 0
            ? onlyPrimaryFinal.slice(0, 1)
            : arr.slice(0, 1);
      }

      return {
        label,
        matches: arr.map((m) => {
          const matchNumber =
            toNumber((m as { match_number?: unknown }).match_number) ?? 0;
          const sourceTag = (m as { source?: unknown }).source;
          const p1 = normalizeBracketPlayer(
            (m as { player1?: unknown }).player1,
          );
          const p2 = normalizeBracketPlayer(
            (m as { player2?: unknown }).player2,
          );
          return {
            id: String((m as { id?: unknown }).id ?? ""),
            player1: p1.name || "",
            player2: p2.name || "",
            score1:
              toNumber(
                (
                  m as {
                    player1_points?: unknown;
                    player1_match_points?: unknown;
                  }
                ).player1_points,
              ) ??
              toNumber(
                (m as { player1_match_points?: unknown }).player1_match_points,
              ),
            score2:
              toNumber(
                (
                  m as {
                    player2_points?: unknown;
                    player2_match_points?: unknown;
                  }
                ).player2_points,
              ) ??
              toNumber(
                (m as { player2_match_points?: unknown }).player2_match_points,
              ),
            innings1: toNumber(
              (m as { player1_innings?: unknown }).player1_innings,
            ),
            innings2: toNumber(
              (m as { player2_innings?: unknown }).player2_innings,
            ),
            tieBreak1: toNumber(
              (m as { player1_tie_break?: unknown }).player1_tie_break,
            ),
            tieBreak2: toNumber(
              (m as { player2_tie_break?: unknown }).player2_tie_break,
            ),
            date:
              typeof (m as { date_time?: unknown }).date_time === "string"
                ? (m as { date_time: string }).date_time
                : null,
            nextMatchId:
              nextMap && matchNumber > 0
                ? nextMap.get(Math.ceil(matchNumber / 2))
                : undefined,
            byeTop: sourceTag === "bye-1",
            byeBottom: sourceTag === "bye-2",
            ffTop: sourceTag === "ff-1" || sourceTag === "double-ff",
            ffBottom: sourceTag === "ff-2" || sourceTag === "double-ff",
          };
        }),
      };
    });
  }, [activeStage, brMatchesByStage, normalizeBracketPlayer]);

  const activeDoubleEliminationRounds = useMemo(() => {
    if (!activeStage || activeStage.stageType !== "double_elimination") {
      return [] as Array<{
        label: string;
        matches: Array<{
          id: string;
          matchNumber: number | null;
          displayMatchNumber: number;
          globalMatchNumber: number | null;
          winnerToGlobalMatchNumber: number | null;
          loserToGlobalMatchNumber: number | null;
          player1: string;
          player1Country: string | null;
          player1FlagSrc: string | null;
          player2: string;
          player2Country: string | null;
          player2FlagSrc: string | null;
          score1: number | null;
          score2: number | null;
          dateTime: string | null;
          innings1: number | null;
          innings2: number | null;
          highRun1: number | null;
          highRun2: number | null;
          highRun1Second: number | null;
          highRun2Second: number | null;
          matchPoints1: number | null;
          matchPoints2: number | null;
          tieBreak1: number | null;
          tieBreak2: number | null;
          winner1: boolean;
          winner2: boolean;
        }>;
      }>;
    }
    const sourceRaw = brMatchesByStage[activeStage.documentId];
    const source = Array.isArray(sourceRaw) ? sourceRaw : [];
    const byRound = new Map<string, typeof source>();
    source
      .filter((m) => {
        const bracket =
          typeof (m as { bracket_type?: unknown }).bracket_type === "string"
            ? ((m as { bracket_type: string }).bracket_type as
                | "winners"
                | "losers")
            : "winners";
        return bracket === deBracketType;
      })
      .forEach((m) => {
        const label =
          typeof (m as { round?: unknown }).round === "string" &&
          (m as { round: string }).round.trim()
            ? (m as { round: string }).round.trim()
            : "Round";
        const arr = byRound.get(label) ?? [];
        arr.push(m);
        byRound.set(label, arr);
      });

    const getPriority = (label: string): number => {
      const upper = label.toUpperCase().trim();
      if (upper.startsWith("WINNERS R")) {
        return Number(upper.replace("WINNERS R", "")) || 500;
      }
      if (upper === "WINNERS FINAL") return 900;
      if (upper.startsWith("LOSERS R")) {
        return Number(upper.replace("LOSERS R", "")) || 500;
      }
      if (upper === "LOSERS FINAL") return 900;
      if (upper === "GRAND FINAL") return 1000;
      if (upper === "GRAND FINAL RESET") return 1001;
      return 9999;
    };

    let deDisplayCounter = 0;

    return Array.from(byRound.entries())
      .sort((a, b) => {
        const diff = getPriority(a[0]) - getPriority(b[0]);
        if (diff !== 0) return diff;
        return a[0].localeCompare(b[0]);
      })
      .map(([label, matches]) => ({
        label,
        matches: matches
          .slice()
          .sort(
            (a, b) =>
              (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
              (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
          )
          .map((m) => {
            deDisplayCounter += 1;
            const p1 = normalizeBracketPlayer((m as { player1?: unknown }).player1);
            const p2 = normalizeBracketPlayer((m as { player2?: unknown }).player2);
            const p1FlagSrc = p1.country
              ? getCountryFlagCdnUrl(p1.country, 40)
              : null;
            const p2FlagSrc = p2.country
              ? getCountryFlagCdnUrl(p2.country, 40)
              : null;
            return {
              id: String((m as { id?: unknown }).id ?? ""),
              matchNumber:
                toNumber((m as { match_number?: unknown }).match_number) ?? null,
              displayMatchNumber: deDisplayCounter,
              globalMatchNumber:
                toNumber(
                  (m as { global_match_number?: unknown }).global_match_number,
                ) ?? null,
              winnerToGlobalMatchNumber:
                toNumber(
                  (m as { winner_to_global_match_number?: unknown })
                    .winner_to_global_match_number,
                ) ?? null,
              loserToGlobalMatchNumber:
                toNumber(
                  (m as { loser_to_global_match_number?: unknown })
                    .loser_to_global_match_number,
                ) ?? null,
              player1: p1.name || "Unknown player",
              player2: p2.name || "Unknown player",
              player1Country: p1.country,
              player2Country: p2.country,
              player1FlagSrc: p1FlagSrc,
              player2FlagSrc: p2FlagSrc,
              score1:
                toNumber(
                  (m as { player1_points?: unknown }).player1_points,
                ) ??
                toNumber(
                  (m as { player1_match_points?: unknown }).player1_match_points,
                ),
              score2:
                toNumber(
                  (m as { player2_points?: unknown }).player2_points,
                ) ??
                toNumber(
                  (m as { player2_match_points?: unknown }).player2_match_points,
                ),
              innings1: toNumber(
                (m as { player1_innings?: unknown }).player1_innings,
              ),
              innings2: toNumber(
                (m as { player2_innings?: unknown }).player2_innings,
              ),
              highRun1: toNumber(
                (m as { player1_high_run?: unknown }).player1_high_run,
              ),
              highRun2: toNumber(
                (m as { player2_high_run?: unknown }).player2_high_run,
              ),
              highRun1Second: toNumber(
                (m as { player1_high_run_2?: unknown }).player1_high_run_2,
              ),
              highRun2Second: toNumber(
                (m as { player2_high_run_2?: unknown }).player2_high_run_2,
              ),
              matchPoints1: toNumber(
                (m as { player1_match_points?: unknown }).player1_match_points,
              ),
              matchPoints2: toNumber(
                (m as { player2_match_points?: unknown }).player2_match_points,
              ),
              tieBreak1: toNumber(
                (m as { player1_tie_break?: unknown }).player1_tie_break,
              ),
              tieBreak2: toNumber(
                (m as { player2_tie_break?: unknown }).player2_tie_break,
              ),
              dateTime:
                typeof (m as { date_time?: unknown }).date_time === "string"
                  ? (m as { date_time: string }).date_time
                  : null,
              winner1:
                String((m as { source?: unknown }).source ?? "") === "ff-2" ||
                (toNumber((m as { player1_points?: unknown }).player1_points) ??
                  -1) >
                  (toNumber((m as { player2_points?: unknown }).player2_points) ??
                    -1),
              winner2:
                String((m as { source?: unknown }).source ?? "") === "ff-1" ||
                (toNumber((m as { player2_points?: unknown }).player2_points) ??
                  -1) >
                  (toNumber((m as { player1_points?: unknown }).player1_points) ??
                    -1),
            };
          }),
      }));
  }, [activeStage, brMatchesByStage, deBracketType, normalizeBracketPlayer]);

  const displayedDoubleEliminationRounds = useMemo(() => {
    if (deSelectedRound === "all") return activeDoubleEliminationRounds;
    return activeDoubleEliminationRounds.filter(
      (round) => round.label === deSelectedRound,
    );
  }, [activeDoubleEliminationRounds, deSelectedRound]);

  useEffect(() => {
    setDeBracketType("winners");
    setDeSelectedRound("all");
    setDeExpandedMatchId(null);
  }, [activeStage?.documentId]);

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

  return (
    <div
      className="mx-auto w-full px-4 py-8"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <style>{liveBadgeAnimation}</style>
      <div className="flex flex-col gap-4">
        {showStandaloneTitle ? (
          <h1 className="text-2xl font-semibold">Tournament Events</h1>
        ) : null}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          {isLoading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
          {!isLoading && !error && !eventId && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {emptyStateMessage}
            </div>
          )}
          {!isLoading &&
            !error &&
            eventId &&
            eventStages.length === 0 &&
            (!showPublishedFinalResults ||
              publishedFinalResults.length === 0) && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No stages found for this event.
              </div>
            )}
          {eventInfo &&
            (eventStages.length > 0 ||
              (showPublishedFinalResults &&
                publishedFinalResults.length > 0)) && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  {showEventHeader ? (
                    <div className="mb-4 flex flex-col gap-1">
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {eventInfo.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {eventInfo.season && (
                          <span>Season {eventInfo.season}</span>
                        )}
                        {formatDateRange(
                          eventInfo.startDate,
                          eventInfo.endDate,
                        ) && (
                          <span>
                            {formatDateRange(
                              eventInfo.startDate,
                              eventInfo.endDate,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {showPublishedFinalResults &&
                    publishedFinalResults.length > 0 && (
                      <div className="mb-6 flex flex-col gap-3">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          Final standings
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full border-collapse text-sm">
                            <thead className="bg-emerald-900 text-white">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold">
                                  #
                                </th>
                                <th className="px-4 py-3 text-left font-semibold">
                                  Player
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  Match Pts
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  Caroms
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  Innings
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  AVG
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  Best AVG
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  H.R.
                                </th>
                                {showRankPointsColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Rank Pts
                                  </th>
                                )}
                                {showPenaltyColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Penalty
                                  </th>
                                )}
                                {showFinalPointsColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Final Pts
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {publishedFinalResults.map((result) => (
                                <tr
                                  key={result.id}
                                  className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                >
                                  <td className="px-4 py-3 font-semibold">
                                    {formatNumberValue(result.position)}
                                  </td>
                                  <td className="px-4 py-3 font-medium">
                                    {result.playerId ? (
                                      <Link
                                        href={playerProfileHref(
                                          result.playerId,
                                          result.playerName || "Unknown",
                                        )}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                      >
                                        <PlayerNameWithFlag
                                          name={result.playerName || "Unknown"}
                                          country={result.playerCountry}
                                        />
                                      </Link>
                                    ) : (
                                      <PlayerNameWithFlag
                                        name={result.playerName || "Unknown"}
                                        country={result.playerCountry}
                                      />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(result.matchPoints)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(
                                      result.caroms ?? result.points,
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(result.innings)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatAverage(
                                      result.caroms ?? result.points,
                                      result.innings,
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {result.bestAverage !== null
                                      ? (() => {
                                          const factor = Math.pow(10, 3);
                                          const truncated = Math.floor(result.bestAverage * factor) / factor;
                                          return truncated.toFixed(3);
                                        })()
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(result.highRun)}
                                  </td>
                                  {showRankPointsColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.rankingPoints)}
                                    </td>
                                  )}
                                  {showPenaltyColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.penalty)}
                                    </td>
                                  )}
                                  {showFinalPointsColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(
                                        getEffectiveFinalPoints(result),
                                      )}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  {showTimetable && timetableSlots.length > 0 && (
                    <div className="mb-6 flex flex-col gap-3">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Time table
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-sm">
                            <thead className="bg-slate-800 text-white">
                              <tr>
                                <th className="px-4 py-3 text-center font-semibold">Date</th>
                                <th className="px-4 py-3 text-center font-semibold">Time</th>
                                <th className="px-4 py-3 text-center font-semibold">Table</th>
                                <th className="px-4 py-3 text-center font-semibold">Type</th>
                                <th className="px-4 py-3 text-center font-semibold">Title</th>
                                <th className="px-4 py-3 text-center font-semibold">Stage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timetableSlots.map((slot) => {
                                const parsedDateTime = slot.dateTime ? new Date(slot.dateTime) : null;
                                const dateLabel =
                                  slot.dateTime && parsedDateTime && !Number.isNaN(parsedDateTime.getTime())
                                    ? formatDateForTable(slot.dateTime)
                                    : slot.date || "-";
                                const timeLabel =
                                  slot.dateTime && parsedDateTime && !Number.isNaN(parsedDateTime.getTime())
                                    ? parsedDateTime.toLocaleTimeString("el-GR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : slot.time || "-";
                                return (
                                  <tr
                                    key={slot.documentId}
                                    className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                  >
                                    <td className="px-4 py-3 text-center align-middle">{dateLabel}</td>
                                    <td className="px-4 py-3 text-center align-middle">{timeLabel}</td>
                                    <td className="px-4 py-3 text-center align-middle">{slot.tableLabel || "-"}</td>
                                    <td className="px-4 py-3 text-center align-middle">
                                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {slot.slotType}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="flex flex-col items-center gap-1 text-center">
                                        {slot.slotType === "training" && slot.trainingPlayerName ? (
                                          <div className="grid grid-cols-[20px_minmax(0,max-content)] items-center justify-center gap-2">
                                            <div className="flex h-4 w-5 items-center justify-center">
                                              {slot.trainingPlayerCountry ? (
                                                <img
                                                  src={getCountryFlagCdnUrl(slot.trainingPlayerCountry, 40) || ""}
                                                  alt={slot.trainingPlayerCountry || "flag"}
                                                  className="h-3.5 w-5 rounded-[2px] object-cover"
                                                  loading="lazy"
                                                  referrerPolicy="no-referrer"
                                                />
                                              ) : null}
                                            </div>
                                            <span className="text-left text-sm font-semibold leading-tight">
                                              {slot.trainingPlayerName}
                                            </span>
                                          </div>
                                        ) : slot.slotType !== "match" && slot.title ? (
                                          <span className="font-medium">{slot.title}</span>
                                        ) : null}
                                        {slot.slotType !== "training" && slot.slotType !== "match" && slot.subtitle ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.subtitle}
                                          </span>
                                        ) : null}
                                        {slot.slotType !== "training" && (slot.matchPlayer1Name || slot.matchPlayer2Name) ? (
                                          <div className="grid gap-1">
                                            {[{
                                              name: slot.matchPlayer1Name,
                                              country: slot.matchPlayer1Country,
                                            }, {
                                              name: slot.matchPlayer2Name,
                                              country: slot.matchPlayer2Country,
                                            }]
                                              .filter((player) => player.name)
                                              .map((player, index) => {
                                                const flagSrc = getCountryFlagCdnUrl(player.country ?? null, 40);
                                                return (
                                                  <div
                                                    key={`${slot.documentId}-player-${index}`}
                                                    className="grid grid-cols-[20px_minmax(0,1fr)] items-center justify-center gap-2"
                                                  >
                                                    <div className="flex h-4 w-5 items-center justify-center">
                                                      {flagSrc ? (
                                                        <img
                                                          src={flagSrc}
                                                          alt={player.country || "flag"}
                                                          className="h-3.5 w-5 rounded-[2px] object-cover"
                                                          loading="lazy"
                                                          referrerPolicy="no-referrer"
                                                        />
                                                      ) : null}
                                                    </div>
                                                    <span className="text-sm font-semibold leading-tight">
                                                      {player.name}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        ) : slot.slotType !== "training" && slot.matchLabel ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.matchLabel}
                                          </span>
                                        ) : null}
                                        {slot.slotType !== "training" && slot.description ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.description}
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">{slot.stageTitle || "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Tab Content */}
                  {!showPublishedFinalResults && eventStages.length > 0 && (
                    <div className="mt-4">
                      {eventStages.map((stage: NormalizedEventStage) => {
                        if (activeStageId !== stage.id) return null;

                        const stageDateRange = formatDateRange(
                          stage.startDate,
                          stage.endDate,
                        );

                        return (
                          <div key={stage.id} className="flex flex-col gap-4">
                            {stageDateRange && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {stageDateRange}
                              </div>
                            )}
                            {stageViewMode === "ranks" ? (
                              <div className="flex flex-col gap-3">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  Ranking - {stage.title || stage.order || ""}
                                </div>
                                <StageRankingTable
                                  stage={stage}
                                  embedded={embedded}
                                  playerProfileHref={playerProfileHref}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-3">
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                      Matches -{" "}
                                      {stage.title || stage.order || ""}
                                    </div>
                                    {!isBracketStageType(stage.stageType) &&
                                    (stageMatchGroups[stage.id] ?? []).length >
                                      0 ? (
                                      <div className="flex items-center">
                                        <input
                                          type="search"
                                          value={playerSearchQuery}
                                          onChange={(event) =>
                                            setPlayerSearchQuery(
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Search player..."
                                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                                        />
                                      </div>
                                    ) : null}
                                    {isBracketStageType(stage.stageType) ? (
                                      brLoadingByStage[stage.documentId] ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          Loading bracket...
                                        </div>
                                      ) : stage.stageType ===
                                          "double_elimination" ? (
                                        displayedDoubleEliminationRounds.length >
                                        0 ? (
                                          <div className="flex flex-col gap-4">
                                            <div className="grid gap-3 md:grid-cols-[220px_220px_minmax(0,1fr)]">
                                              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                                Bracket
                                                <select
                                                  value={deBracketType}
                                                  onChange={(event) =>
                                                    setDeBracketType(
                                                      event.target.value as
                                                        | "winners"
                                                        | "losers",
                                                    )
                                                  }
                                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                >
                                                  <option value="winners">
                                                    Winners
                                                  </option>
                                                  <option value="losers">
                                                    Losers
                                                  </option>
                                                </select>
                                              </label>
                                              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                                Round
                                                <select
                                                  value={deSelectedRound}
                                                  onChange={(event) =>
                                                    setDeSelectedRound(
                                                      event.target.value,
                                                    )
                                                  }
                                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                >
                                                  <option value="all">
                                                    Show all
                                                  </option>
                                                  {activeDoubleEliminationRounds.map(
                                                    (round) => (
                                                      <option
                                                        key={round.label}
                                                        value={round.label}
                                                      >
                                                        {round.label}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </label>
                                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                                                Premium round view for double
                                                elimination. Use Winners/Losers
                                                and round filters to focus on
                                                the active block.
                                              </div>
                                            </div>
                                            <div className="mx-auto grid w-[95%] max-w-[1600px] min-w-0 gap-4">
                                              {displayedDoubleEliminationRounds.map(
                                                (round, roundIndex) => (
                                                  <section
                                                    key={round.label}
                                                    className={`overflow-hidden rounded-[24px] border shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${
                                                      roundIndex % 2 === 0
                                                        ? "border-blue-200 bg-blue-50/65 dark:border-blue-800 dark:bg-blue-950/35"
                                                        : "border-sky-200 bg-sky-100/55 dark:border-sky-800 dark:bg-sky-950/30"
                                                    }`}
                                                  >
                                                    <div
                                                      className={`px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white ${
                                                        roundIndex % 2 === 0
                                                          ? "border-b border-blue-200 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 dark:border-blue-800"
                                                          : "border-b border-sky-200 bg-gradient-to-r from-sky-900 via-blue-800 to-sky-700 dark:border-sky-800"
                                                      }`}
                                                    >
                                                      {round.label}
                                                    </div>
                                                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                                      {round.matches.map(
                                                        (match, matchIndex) => {
                                                          const avg1 =
                                                            match.score1 !== null &&
                                                            match.innings1 &&
                                                            match.innings1 > 0
                                                              ? Math.trunc(
                                                                  (match.score1 /
                                                                    match.innings1) *
                                                                    1000,
                                                                ) / 1000
                                                              : null;
                                                          const avg2 =
                                                            match.score2 !== null &&
                                                            match.innings2 &&
                                                            match.innings2 > 0
                                                              ? Math.trunc(
                                                                  (match.score2 /
                                                                    match.innings2) *
                                                                    1000,
                                                                ) / 1000
                                                              : null;
                                                          const isExpanded =
                                                            deExpandedMatchId ===
                                                            match.id;

                                                          return (
                                                            <div key={match.id}>
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setDeExpandedMatchId(
                                                                    isExpanded
                                                                      ? null
                                                                      : match.id,
                                                                  )
                                                                }
                                                                className={`mx-auto grid w-[95%] min-w-0 grid-cols-[64px_minmax(280px,1fr)_40px_32px_40px_minmax(280px,1fr)_104px] items-center gap-1.5 px-3 py-3 text-left transition ${
                                                                  matchIndex % 2 === 0
                                                                    ? "bg-white/70 hover:bg-white dark:bg-slate-900/65 dark:hover:bg-slate-900"
                                                                    : "bg-blue-100/55 hover:bg-blue-100 dark:bg-blue-950/45 dark:hover:bg-blue-950/60"
                                                                }`}
                                                              >
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                  {`M${match.globalMatchNumber ?? match.displayMatchNumber ?? match.matchNumber ?? ""}`}
                                                                </div>
                                                                <div className="min-w-0">
                                                                  <div className="flex items-center justify-end gap-2 text-right">
                                                                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                                                      {match.player1}
                                                                    </span>
                                                                    {match.player1FlagSrc ? (
                                                                      <img
                                                                        src={match.player1FlagSrc}
                                                                        alt={match.player1Country ?? "flag"}
                                                                        className="h-3.5 w-5 rounded-[2px] object-cover"
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                      />
                                                                    ) : null}
                                                                  </div>
                                                                </div>
                                                                <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
                                                                  {match.score1 ?? "-"}
                                                                </div>
                                                                <div className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                                                                  vs
                                                                </div>
                                                                <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
                                                                  {match.score2 ?? "-"}
                                                                </div>
                                                                <div className="min-w-0">
                                                                  <div className="flex items-center gap-2">
                                                                    {match.player2FlagSrc ? (
                                                                      <img
                                                                        src={match.player2FlagSrc}
                                                                        alt={match.player2Country ?? "flag"}
                                                                        className="h-3.5 w-5 rounded-[2px] object-cover"
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                      />
                                                                    ) : null}
                                                                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                                                      {match.player2}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                                                                  {match.dateTime
                                                                    ? new Date(
                                                                        match.dateTime,
                                                                      ).toLocaleString(
                                                                        "el-GR",
                                                                      )
                                                                    : "Date"}
                                                                </div>
                                                              </button>
                                                              {isExpanded ? (
                                                                <div className="border-t border-slate-200 px-5 pb-5 dark:border-slate-800">
                                                                  <div className="mx-auto mt-4 w-[95%] max-w-[1600px] min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                                                    <div className="grid min-w-[860px] grid-cols-[minmax(180px,1.6fr)_repeat(8,minmax(56px,0.75fr))] items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                                      <div>Player</div>
                                                                      <div className="text-center">Winner</div>
                                                                      <div className="text-center">Points</div>
                                                                      <div className="text-center">Innings</div>
                                                                      <div className="text-center">Avg</div>
                                                                      <div className="text-center">H.R.1</div>
                                                                      <div className="text-center">H.R.2</div>
                                                                      <div className="text-center">MP</div>
                                                                      <div className="text-center">T.B.</div>
                                                                    </div>
                                                                    <div className="mt-3 space-y-2">
                                                                      <div className="grid min-w-[860px] grid-cols-[minmax(180px,1.6fr)_repeat(8,minmax(56px,0.75fr))] items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                                        <div className="font-medium">
                                                                          {match.player1}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.winner1
                                                                            ? "Yes"
                                                                            : "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.score1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.innings1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {avg1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun1Second ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.matchPoints1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.tieBreak1 ??
                                                                            "-"}
                                                                        </div>
                                                                      </div>
                                                                      <div className="grid min-w-[860px] grid-cols-[minmax(180px,1.6fr)_repeat(8,minmax(56px,0.75fr))] items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                                        <div className="font-medium">
                                                                          {match.player2}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.winner2
                                                                            ? "Yes"
                                                                            : "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.score2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.innings2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {avg2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun2Second ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.matchPoints2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.tieBreak2 ??
                                                                            "-"}
                                                                        </div>
                                                                      </div>
                                                                    </div>
                                                                    <div className="mt-4 grid min-w-[860px] grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                                                      <div className="text-left">
                                                                        Winner{" "}
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                          {match.winnerToGlobalMatchNumber
                                                                            ? `M${match.winnerToGlobalMatchNumber}`
                                                                            : round.label ===
                                                                                "Grand Final"
                                                                              ? "Champion"
                                                                              : "-"}
                                                                        </span>
                                                                      </div>
                                                                      <div className="text-right">
                                                                        Loser{" "}
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                          {match.loserToGlobalMatchNumber
                                                                            ? `M${match.loserToGlobalMatchNumber}`
                                                                            : "Out"}
                                                                        </span>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              ) : null}
                                                            </div>
                                                          );
                                                        },
                                                      )}
                                                    </div>
                                                  </section>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No bracket matches
                                          </div>
                                        )
                                      ) : activeBracketRounds.length > 0 ? (
                                        <SingleElimBracket
                                          rounds={activeBracketRounds}
                                        />
                                      ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          No bracket matches
                                        </div>
                                      )
                                    ) : (stageMatchGroups[stage.id] ?? [])
                                        .length === 0 ? (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        No matches
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-3">
                                        {filteredActiveStageGroups.length ===
                                        0 ? (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No players found.
                                          </div>
                                        ) : filteredActiveStageGroups.map(
                                          (group, groupIndex) => {
                                            const groupKey = getGroupKey(
                                              stage,
                                              group,
                                            );
                                            const previewPlayers =
                                              getGroupPreviewPlayers(group);
                                            const isLargeGroup =
                                              previewPlayers.length > 4;
                                            const matchingPlayerIds =
                                              normalizedPlayerSearchQuery.length >
                                              0
                                                ? new Set(
                                                    previewPlayers
                                                      .filter((player) =>
                                                        playerMatchesSearch(
                                                          player,
                                                          playerSearchTerms,
                                                        ),
                                                      )
                                                      .map(
                                                        (player) =>
                                                          player.documentId ||
                                                          `${player.name}-${player.country || "xx"}`,
                                                      ),
                                                  )
                                                : new Set<string>();
                                            const hasSearchMatch =
                                              matchingPlayerIds.size > 0;
                                            const isExpanded =
                                              normalizedPlayerSearchQuery.length >
                                                0 && hasSearchMatch
                                                ? true
                                                : expandedGroups.has(groupKey);
                                            const visibleMatches =
                                              normalizedPlayerSearchQuery.length >
                                                0 &&
                                              isLargeGroup &&
                                              hasSearchMatch
                                                ? group.matches.filter((match) =>
                                                    [match.top.player, match.bottom.player].some(
                                                      (player) =>
                                                        matchingPlayerIds.has(
                                                          player.documentId ||
                                                            `${player.name}-${player.country || "xx"}`,
                                                        ),
                                                    ),
                                                  )
                                                : group.matches;
                                            const showGroupStandings =
                                              !(
                                                normalizedPlayerSearchQuery.length >
                                                  0 &&
                                                isLargeGroup &&
                                                hasSearchMatch
                                              );

                                            return (
                                            <div
                                              key={group.key}
                                              className="flex flex-col gap-1.5"
                                            >
                                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setExpandedGroups((prev) => {
                                                      const next = new Set(prev);
                                                      if (next.has(groupKey)) {
                                                        next.delete(groupKey);
                                                      } else {
                                                        next.add(groupKey);
                                                      }
                                                      return next;
                                                    });
                                                  }}
                                                  className={clsx(
                                                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                                                    !isExpanded &&
                                                      (groupIndex % 2 === 0
                                                        ? "bg-gray-100/90 dark:bg-gray-800/60"
                                                        : "bg-gray-200/85 dark:bg-gray-700/60"),
                                                  )}
                                                >
                                                  <div className="flex items-center gap-1.5">
                                                    <svg
                                                      className={clsx(
                                                        "h-4 w-4 transition-transform",
                                                        isExpanded && "rotate-90",
                                                      )}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5l7 7-7 7"
                                                      />
                                                    </svg>
                                                    <div className="font-semibold text-gray-700 dark:text-gray-200">
                                                      Group {group.number ?? "?"}
                                                    </div>
                                                    {!isExpanded ? (
                                                      <div
                                                        className="ml-5 grid flex-1 items-center gap-x-7 gap-y-1.5 text-[11px] font-normal text-gray-500 dark:text-gray-300"
                                                        style={{
                                                          gridTemplateColumns:
                                                            previewGridTemplateColumns ||
                                                            `repeat(${Math.max(Math.min(previewPlayers.length, previewColumnCount), 1)}, minmax(0, 1fr))`,
                                                        }}
                                                      >
                                                        {previewPlayers.map((player) => (
                                                          (() => {
                                                            const playerLabel =
                                                              getPreviewPlayerLabel(
                                                                player,
                                                              );
                                                            const isSearchMatch =
                                                              matchingPlayerIds.has(
                                                                player.documentId ||
                                                                  `${player.name}-${player.country || "xx"}`,
                                                              );

                                                            return (
                                                          <div
                                                            key={
                                                              player.documentId ||
                                                              `${player.name}-${player.country || "xx"}`
                                                            }
                                                            className="flex min-w-0 items-center gap-2"
                                                          >
                                                            {getCountryFlagCdnUrl(
                                                              player.country ?? null,
                                                              40,
                                                            ) ? (
                                                              <img
                                                                src={getCountryFlagCdnUrl(
                                                                  player.country ?? null,
                                                                  40,
                                                                )!}
                                                                alt={player.country || "flag"}
                                                                className="h-4 w-[22px] rounded-[2px] object-cover"
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer"
                                                              />
                                                            ) : null}
                                                            <span
                                                              className={clsx(
                                                                "truncate leading-none font-semibold",
                                                                isSearchMatch &&
                                                                  "text-yellow-600 dark:text-yellow-300",
                                                              )}
                                                            >
                                                              {playerLabel}
                                                            </span>
                                                          </div>
                                                            );
                                                          })()
                                                        ))}
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                </button>
                                              </div>
                                              {isExpanded ? (
                                              <>
                                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                <table className="min-w-full text-xs">
                                                  <thead className="bg-blue-600 text-white">
                                                    <tr>
                                                      <th className="px-4 py-2 font-medium">
                                                        Player
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Date
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Result
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Points
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Innings
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Average
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        High Run
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        High Run 2
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Match Points
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {visibleMatches.map(
                                                      (match) => (
                                                        <Fragment
                                                          key={match.key}
                                                        >
                                                          {(() => {
                                                            const playerIds = [
                                                              match.top.player
                                                                .documentId,
                                                              match.bottom
                                                                .player
                                                                .documentId,
                                                            ]
                                                              .filter(
                                                                (
                                                                  value,
                                                                ): value is string =>
                                                                  typeof value ===
                                                                    "string" &&
                                                                  value.trim()
                                                                    .length > 0,
                                                              )
                                                              .sort();
                                                            const matchLiveKey =
                                                              playerIds.length ===
                                                                2 &&
                                                              stage.documentId &&
                                                              group.number !=
                                                                null
                                                                ? `${stage.documentId}::${group.number}::${playerIds.join("::")}`
                                                                : null;
                                                            const liveSession =
                                                              (() => {
                                                                if (
                                                                  matchLiveKey
                                                                ) {
                                                                  const directMatch =
                                                                    liveSessionByMatchKey.get(
                                                                      matchLiveKey,
                                                                    ) ?? null;
                                                                  if (
                                                                    directMatch
                                                                  )
                                                                    return directMatch;
                                                                }
                                                                const pairNameKey =
                                                                  [
                                                                    normalizeLiveName(
                                                                      match.top
                                                                        .player
                                                                        .name ||
                                                                        match
                                                                          .top
                                                                          .player
                                                                          .nativeName,
                                                                    ),
                                                                    normalizeLiveName(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .name ||
                                                                        match
                                                                          .bottom
                                                                          .player
                                                                          .nativeName,
                                                                    ),
                                                                  ]
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    )
                                                                    .sort()
                                                                    .join("::");

                                                                if (
                                                                  pairNameKey
                                                                ) {
                                                                  const exactNameMatch =
                                                                    liveSessionByPlayerNames.get(
                                                                      pairNameKey,
                                                                    ) ?? null;
                                                                  if (
                                                                    exactNameMatch
                                                                  )
                                                                    return exactNameMatch;

                                                                  const stageScopedSessions =
                                                                    liveSessionsByStageId.get(
                                                                      stage.documentId,
                                                                    ) ?? [];
                                                                  const stageScopedMatch =
                                                                    stageScopedSessions.find(
                                                                      (session) => {
                                                                        const stagePairKey =
                                                                          [
                                                                            normalizeLiveName(
                                                                              session.player1Name,
                                                                            ),
                                                                            normalizeLiveName(
                                                                              session.player2Name,
                                                                            ),
                                                                          ]
                                                                            .filter(
                                                                              (
                                                                                value,
                                                                              ): value is string =>
                                                                                value.length >
                                                                                0,
                                                                            )
                                                                            .sort()
                                                                            .join("::");
                                                                        return (
                                                                          stagePairKey.length >
                                                                            0 &&
                                                                          stagePairKey ===
                                                                            pairNameKey
                                                                        );
                                                                      },
                                                                    ) ?? null;
                                                                  if (
                                                                    stageScopedMatch
                                                                  )
                                                                    return stageScopedMatch;
                                                                }

                                                                const expandedKeys =
                                                                  new Set<string>();
                                                                const topCandidates =
                                                                  [
                                                                    match.top
                                                                      .player
                                                                      .name,
                                                                    match.top
                                                                      .player
                                                                      .nativeName,
                                                                  ]
                                                                    .map(
                                                                      (value) =>
                                                                        normalizeLiveName(
                                                                          value,
                                                                        ),
                                                                    )
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    );
                                                                const bottomCandidates =
                                                                  [
                                                                    match.bottom
                                                                      .player
                                                                      .name,
                                                                    match.bottom
                                                                      .player
                                                                      .nativeName,
                                                                  ]
                                                                    .map(
                                                                      (value) =>
                                                                        normalizeLiveName(
                                                                          value,
                                                                        ),
                                                                    )
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    );
                                                                topCandidates.forEach(
                                                                  (topName) => {
                                                                    bottomCandidates.forEach(
                                                                      (
                                                                        bottomName,
                                                                      ) => {
                                                                        expandedKeys.add(
                                                                          [
                                                                            topName,
                                                                            bottomName,
                                                                          ]
                                                                            .sort()
                                                                            .join(
                                                                              "::",
                                                                            ),
                                                                        );
                                                                      },
                                                                    );
                                                                  },
                                                                );
                                                                for (const candidateKey of expandedKeys) {
                                                                  const candidate =
                                                                    liveSessionByPlayerNames.get(
                                                                      candidateKey,
                                                                    );
                                                                  if (candidate)
                                                                    return candidate;
                                                                }
                                                                return null;
                                                              })();
                                                            const liveSessionId =
                                                              liveSession?.documentId ||
                                                              liveSession?.id ||
                                                              null;
                                                            const hasActiveLiveSession =
                                                              Boolean(liveSessionId) &&
                                                              liveSession?.sessionStatus ===
                                                                "in_progress";

                                                            return (
                                                              <>
                                                                <tr
                                                                  className={clsx(
                                                                    "border-t-[3px] border-white dark:border-white text-gray-700 dark:text-gray-200",
                                                                    getMatchRowClass(
                                                                      match.top
                                                                        .outcome,
                                                                    ),
                                                                  )}
                                                                >
                                                                  <td className="px-4 py-2 font-medium">
                                                                    {match.top
                                                                      .player
                                                                      .id ? (
                                                                      <Link
                                                                        href={playerProfileHref(
                                                                          match
                                                                            .top
                                                                            .player
                                                                            .id,
                                                                          match
                                                                            .top
                                                                            .player
                                                                            .name,
                                                                        )}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                      >
                                                                        <PlayerNameWithFlag
                                                                          name={
                                                                            match
                                                                              .top
                                                                              .player
                                                                              .name ||
                                                                            "Unknown"
                                                                          }
                                                                          nativeName={
                                                                            match
                                                                              .top
                                                                              .player
                                                                              .nativeName
                                                                          }
                                                                          country={
                                                                            match
                                                                              .top
                                                                              .player
                                                                              .country
                                                                          }
                                                                          highlight={playerMatchesSearch(
                                                                            match
                                                                              .top
                                                                              .player,
                                                                            playerSearchTerms,
                                                                          )}
                                                                        />
                                                                      </Link>
                                                                    ) : (
                                                                      <PlayerNameWithFlag
                                                                        name={
                                                                          match
                                                                            .top
                                                                            .player
                                                                            .name ||
                                                                          "Unknown"
                                                                        }
                                                                        nativeName={
                                                                          match
                                                                            .top
                                                                            .player
                                                                            .nativeName
                                                                        }
                                                                        country={
                                                                          match
                                                                            .top
                                                                            .player
                                                                            .country
                                                                        }
                                                                        highlight={playerMatchesSearch(
                                                                          match
                                                                            .top
                                                                            .player,
                                                                          playerSearchTerms,
                                                                        )}
                                                                      />
                                                                    )}
                                                                  </td>
                                                                  <td
                                                                    className={clsx(
                                                                      "px-4 py-2",
                                                                      getDateCellClass(),
                                                                    )}
                                                                    rowSpan={2}
                                                                  >
                                                                    {hasActiveLiveSession ? (
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          if (liveSessionId) {
                                                                            onLiveMatchOpen?.(liveSessionId);
                                                                          }
                                                                        }}
                                                                        className="flex min-h-[72px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-200 px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-950 shadow-sm transition hover:bg-amber-100"
                                                                        style={{ animation: "btLivePulse 1.25s ease-in-out infinite" }}
                                                                      >
                                                                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                                                                        <span>Live</span>
                                                                      </button>
                                                                    ) : (
                                                                      <div className="flex min-h-[72px] items-center justify-center">
                                                                        <span>
                                                                          {formatDateForTable(
                                                                            match.dateTime,
                                                                          )}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center font-semibold">
                                                                    {formatOutcomeLabel(
                                                                      match.top
                                                                        .outcome,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match.top
                                                                        .player
                                                                        .points,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match.top
                                                                        .player
                                                                        .innings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatAverage(
                                                                      match.top
                                                                        .player
                                                                        .points,
                                                                      match.top
                                                                        .player
                                                                        .innings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match.top
                                                                        .player
                                                                        .highRun,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match.top
                                                                        .player
                                                                        .highRun2,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match.top
                                                                        .player
                                                                        .matchPoints,
                                                                    )}
                                                                  </td>
                                                                </tr>
                                                                <tr
                                                                  className={clsx(
                                                                    "border-b-[5px] border-white dark:border-white text-gray-700 dark:text-gray-200",
                                                                    getMatchRowClass(
                                                                      match
                                                                        .bottom
                                                                        .outcome,
                                                                    ),
                                                                  )}
                                                                >
                                                                  <td className="px-4 py-2 font-medium">
                                                                    {match
                                                                      .bottom
                                                                      .player
                                                                      .id ? (
                                                                      <Link
                                                                        href={playerProfileHref(
                                                                          match
                                                                            .bottom
                                                                            .player
                                                                            .id,
                                                                          match
                                                                            .bottom
                                                                            .player
                                                                            .name,
                                                                        )}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                      >
                                                                        <PlayerNameWithFlag
                                                                          name={
                                                                            match
                                                                              .bottom
                                                                              .player
                                                                              .name ||
                                                                            "Unknown"
                                                                          }
                                                                          nativeName={
                                                                            match
                                                                              .bottom
                                                                              .player
                                                                              .nativeName
                                                                          }
                                                                          country={
                                                                            match
                                                                              .bottom
                                                                              .player
                                                                              .country
                                                                          }
                                                                          highlight={playerMatchesSearch(
                                                                            match
                                                                              .bottom
                                                                              .player,
                                                                            playerSearchTerms,
                                                                          )}
                                                                        />
                                                                      </Link>
                                                                    ) : (
                                                                      <PlayerNameWithFlag
                                                                        name={
                                                                          match
                                                                            .bottom
                                                                            .player
                                                                            .name ||
                                                                          "Unknown"
                                                                        }
                                                                        nativeName={
                                                                          match
                                                                            .bottom
                                                                            .player
                                                                            .nativeName
                                                                        }
                                                                        country={
                                                                          match
                                                                            .bottom
                                                                            .player
                                                                            .country
                                                                        }
                                                                        highlight={playerMatchesSearch(
                                                                          match
                                                                            .bottom
                                                                            .player,
                                                                          playerSearchTerms,
                                                                        )}
                                                                      />
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center font-semibold">
                                                                    {formatOutcomeLabel(
                                                                      match
                                                                        .bottom
                                                                        .outcome,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .points,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .innings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatAverage(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .points,
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .innings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .highRun,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .highRun2,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {formatNumberValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .matchPoints,
                                                                    )}
                                                                  </td>
                                                                </tr>
                                                              </>
                                                            );
                                                          })()}
                                                        </Fragment>
                                                      ),
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                              {showGroupStandings ? (
                                                <GroupStandingsTable
                                                  standings={buildGroupStandings(
                                                    group.matches,
                                                  )}
                                                  embedded={embedded}
                                                />
                                              ) : null}
                                              </>
                                              ) : null}
                                            </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function TournamentEventsPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto px-4 py-8">Φόρτωση...</div>}
    >
      <TournamentEventsContent />
    </Suspense>
  );
}
