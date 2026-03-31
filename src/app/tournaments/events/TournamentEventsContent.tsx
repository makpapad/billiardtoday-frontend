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

type TournamentEventsContentProps = {
  eventIdOverride?: string | null;
  preferredStageDocumentId?: string | null;
  onStageSelect?: (stageDocumentId: string) => void;
  showPublishedFinalResults?: boolean;
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
}: {
  name: string;
  nativeName?: string | null;
  country?: string | null;
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
        <span>{name || "Unknown"}</span>
        {nativeName && nativeName.trim() !== name.trim() && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
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

function StageRankingTable({
  stage,
  embedded,
  playerProfileHref,
}: {
  stage: NormalizedEventStage;
  embedded: boolean;
  playerProfileHref: (playerId: string | number, playerName: string) => string;
}) {
  const showGroupColumn = stage.results.some(
    (result) => result.groupNumber !== null,
  );
  const showGroupPositionColumn = stage.results.some(
    (result) => result.groupPosition !== null,
  );

  if (stage.results.length === 0) {
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
          {stage.results.map((result, index) => (
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
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            ? normalizedStage.stage_type.trim()
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
    () =>
      eventStages.reduce<Record<string, StageMatchGroup[]>>((acc, stage) => {
        acc[stage.id] = buildStageMatchGroups(stage.groups);
        return acc;
      }, {}),
    [eventStages],
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
  const showRankPointsColumn = useMemo(
    () => publishedFinalResults.some((result) => result.rankingPoints !== null),
    [publishedFinalResults],
  );
  const showPenaltyColumn = useMemo(
    () => publishedFinalResults.some((result) => result.penalty !== null),
    [publishedFinalResults],
  );
  const showFinalPointsColumn = useMemo(
    () => publishedFinalResults.some((result) => result.finalPoints !== null),
    [publishedFinalResults],
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
  const filteredActiveStageGroups = useMemo(() => {
    if (!activeStage) return [];

    const groups = stageMatchGroups[activeStage.id] ?? [];
    if (!normalizedPlayerSearchQuery) return groups;

    const searchTerms = normalizedPlayerSearchQuery
      .split(" ")
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    if (searchTerms.length === 0) return groups;

    return groups.filter((group) =>
      group.matches.some((match) =>
        [match.top.player, match.bottom.player].some((player) => {
          const haystack = [player.name, player.nativeName, player.country]
            .map((value) => normalizeLiveName(value))
            .filter((value): value is string => value.length > 0)
            .join(" ");

          return searchTerms.every((term) => haystack.includes(term));
        }),
      ),
    );
  }, [
    activeStage,
    normalizeLiveName,
    normalizedPlayerSearchQuery,
    stageMatchGroups,
  ]);
  const previewGridTemplateColumns = useMemo(() => {
    if (filteredActiveStageGroups.length === 0) return "";

    const maxPreviewColumns = 3;
    const maxLengths: number[] = [];
    filteredActiveStageGroups.forEach((group) => {
      getGroupPreviewPlayers(group).forEach((player, index) => {
        const columnIndex = index % maxPreviewColumns;
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
  }, [filteredActiveStageGroups]);
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
    (player: unknown): { name: string } => {
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

        if (!attr || typeof attr !== "object") return { name: "" };
        const fullName = (attr as Record<string, unknown>).full_name;
        return { name: typeof fullName === "string" ? fullName : "" };
      } catch {
        return { name: "" };
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
    if (!activeStage || activeStage.stageType !== "brackets") return;
    if (brMatchesByStage[activeStage.documentId]) return;
    void fetchBracketMatches(activeStage.documentId);
  }, [activeStage, brMatchesByStage, fetchBracketMatches]);

  const activeBracketRounds = useMemo<BracketRoundView[]>(() => {
    if (!activeStage || activeStage.stageType !== "brackets") return [];
    const sourceRaw = brMatchesByStage[activeStage.documentId];
    const source = Array.isArray(sourceRaw) ? sourceRaw : [];
    if (source.length === 0) return [];

    const canonicalizeRound = (raw: string): string => {
      const upper = (raw || "").toUpperCase().trim();
      if (!upper) return "";
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

    const roundPriority: Record<string, number> = {
      R32: 0,
      R16: 1,
      QF: 2,
      SF: 3,
      F: 4,
    };
    const orderedLabels = Array.from(byRound.keys()).sort((a, b) => {
      const pa = roundPriority[a] ?? 100;
      const pb = roundPriority[b] ?? 100;
      if (pa !== pb) return pa - pb;
      return (byRound.get(b)?.length ?? 0) - (byRound.get(a)?.length ?? 0);
    });

    const idByRoundAndNumber = new Map<string, Map<number, string>>();
    orderedLabels.forEach((label) => {
      const inner = new Map<number, string>();
      const arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );
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
      const arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );

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
                                      {formatNumberValue(result.finalPoints)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                                    {stage.stageType !== "brackets" &&
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
                                    {stage.stageType === "brackets" ? (
                                      brLoadingByStage[stage.documentId] ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          Loading bracket...
                                        </div>
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
                                            const groupKey = `${stage.documentId || stage.id}-${group.number ?? group.key}`;
                                            const isExpanded = expandedGroups.has(groupKey);
                                            const previewPlayers =
                                              getGroupPreviewPlayers(group);

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
                                                        className="ml-2 grid flex-1 items-center gap-x-7 gap-y-1.5 text-[11px] font-normal text-gray-500 dark:text-gray-300"
                                                        style={{
                                                          gridTemplateColumns:
                                                            previewGridTemplateColumns ||
                                                            `repeat(${Math.max(previewPlayers.length, 1)}, minmax(0, 1fr))`,
                                                        }}
                                                      >
                                                        {previewPlayers.map((player) => (
                                                          (() => {
                                                            const playerLabel =
                                                              getPreviewPlayerLabel(
                                                                player,
                                                              );
                                                            const isSearchMatch =
                                                              normalizedPlayerSearchQuery.length >
                                                                0 &&
                                                              [player.name, player.nativeName]
                                                                .map((value) =>
                                                                  normalizeLiveName(value),
                                                                )
                                                                .some((value) =>
                                                                  value.includes(
                                                                    normalizedPlayerSearchQuery,
                                                                  ),
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
                                                                "truncate leading-none",
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
                                                    {group.matches.map(
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
                                              <GroupStandingsTable
                                                standings={buildGroupStandings(
                                                  group.matches,
                                                )}
                                                embedded={embedded}
                                              />
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
