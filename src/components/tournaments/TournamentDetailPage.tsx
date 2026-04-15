"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveScoreBoardCard } from "@/components/LiveScoreBoardCard";
import {
  LiveStatsHighlightModal,
  type LiveScoreItem,
} from "@/components/live/LiveClubView";
import {
  LiveVideoDrawer,
  type DrawerLaunchOrigin,
  type LiveVideoDrawerSession,
} from "@/components/live/LiveVideoDrawer";
import type { LiveSessionItem } from "@/components/live/types";
import { TournamentEventsContent } from "@/app/tournaments/events/TournamentEventsContent";
import type { RankingSeriesData } from "@/lib/rankings";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";
import type {
  EventApiResponse,
  GroupStanding,
  NormalizedEventStage,
  NormalizedTimetableSlot,
  StageMatchGroup,
  StrapiFinalResult,
  StrapiGroup,
  StrapiResult,
} from "@/app/tournaments/events/types";
import {
  buildGroupStandings,
  buildStageMatchGroups,
  formatAverage,
  formatDateForTable,
  formatNumberValue,
  formatRecord,
  hasPlayedStageMatch,
  normalizeEntity,
  normalizeGroup,
  normalizeResult,
  toNumber,
  toRelationArray,
} from "@/app/tournaments/events/utils";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { normalizeMediaUrl } from "@/lib/liveSessions";
import { normalizeLiveVideoEntries } from "@/lib/liveVideos";

type Props = {
  summary: TournamentEventSummary;
  embedded?: boolean;
  initialEventData?: EventApiResponse | null;
  initialSeriesData?: RankingSeriesData | null;
};

type TournamentLiveScreen = {
  screenId: string;
  screenName: string;
  isActive: boolean;
  tournamentId: string;
  lastUpdate?: string;
};

type EventLiveSession = LiveSessionItem & {
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

type WsTournamentPayload = {
  type?: string;
  clubId?: string | null;
  eventId?: string | null;
  stageId?: string | null;
  reason?: string | null;
  screenId?: string;
  screenIdentifier?: string | null;
  sessionId?: string | number | null;
  ended?: boolean;
  isRunning?: boolean;
  activePlayer?: number | null;
  current?: "A" | "B" | null;
  progress?: number;
  innings?: number | null;
  totalBlocks?: number | null;
  gameDurationSeconds?: number | null;
  targetPoints?: number | null;
  targetPointsP1?: number | null;
  targetPointsP2?: number | null;
  matchSheet?: unknown;
  matchSheetJson?: unknown;
  sheet?: unknown;
  inningsDetail?: unknown;
  liveVideos?: unknown;
  ts?: number;
  session?: Record<string, any>;
  players?: Array<{
    name?: string | null;
    full_name?: string | null;
    full_name_en?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    liveRun?: number | null;
    innings?: number | null;
    hr?: number | null;
    hr2?: number | null;
    avgFormatted?: string | null;
    accPercent?: number | null;
    playerTimeSeconds?: number | null;
    secondsPerInning?: number | null;
    targetPoints?: number | null;
    target_points?: number | null;
    photoUrl?: string | null;
    photo?: string | null;
    avatarUrl?: string | null;
    imageUrl?: string | null;
    photoMainUrl?: string | null;
    photo_main?: string | null;
    timeoutsUsed?: number | null;
    timeouts?: number | null;
    maxTimeouts?: number | null;
  }>;
};

type GroupPopoverData = {
  title: string;
  standings: GroupStanding[];
  matches: StageMatchGroup["matches"];
};

type HeroMenuButtonProps = {
  label: string;
  iconSrc: string;
  active: boolean;
  onClick: () => void;
};

type TournamentParticipantRow = {
  id: string;
  documentId: string | null;
  name: string;
  country: string | null;
  status: string;
  birthDate: string | null;
  registrationOrder: number;
  seriesRank: number | null;
  seriesTotalPoints: number;
};

function HeroMenuButton({
  label,
  iconSrc,
  active,
  onClick,
}: HeroMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative inline-flex h-[56px] w-[56px] items-center justify-center rounded-[20px] border transition duration-200 sm:h-[62px] sm:w-[62px] ${
        active
          ? "border-white/70 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
          : "border-white/15 bg-white/10 hover:bg-white/15"
      }`}
    >
      <Image
        src={iconSrc}
        alt={label}
        width={56}
        height={56}
        className={`h-[44px] w-[44px] object-contain transition duration-200 sm:h-[50px] sm:w-[50px] ${
          active ? "scale-105" : "opacity-95 group-hover:scale-105"
        }`}
        unoptimized
      />
      <span className="pointer-events-none absolute -bottom-11 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_32px_rgba(15,23,42,0.38)] group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

const formatParticipantStatus = (value: unknown) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Registered";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeDateOnly = (value: unknown) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return isoMatch ? isoMatch[1] + "-" + isoMatch[2] + "-" + isoMatch[3] : null;
};

type InningDetailEntry = {
  inning: number;
  player1?: { pt: number; tot: number };
  player2?: { pt: number; tot: number };
};

type SessionSnapshot = {
  innings: number;
  player1Points: number;
  player2Points: number;
};

const deriveSecondHighRunFromInnings = (
  entries: InningDetailEntry[] | undefined,
  side: "A" | "B",
) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const runs = entries
    .map((entry) =>
      side === "A" ? entry.player1?.pt ?? null : entry.player2?.pt ?? null,
    )
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
    )
    .sort((a, b) => b - a);

  if (runs.length >= 2) return runs[1];
  return runs.length === 1 ? 0 : null;
};

const resolveLiveHighRun2 = (
  session: EventLiveSession | null | undefined,
  side: "A" | "B",
  fallback: number | null,
) => {
  const explicit =
    side === "A" ? session?.state?.bestRun2A : session?.state?.bestRun2B;
  if (
    typeof explicit === "number" &&
    Number.isFinite(explicit) &&
    explicit > 0
  ) {
    return explicit;
  }

  const derived = deriveSecondHighRunFromInnings(
    session?.state?.inningsDetail,
    side,
  );
  if (typeof derived === "number" && Number.isFinite(derived)) {
    return derived;
  }

  return fallback;
};

const isPlaceholderPlayerName = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  return !normalized || normalized === "player 1" || normalized === "player 2";
};

const resolveTournamentPayloadPlayerName = (
  player:
    | {
        name?: string | null;
        full_name?: string | null;
        full_name_en?: string | null;
        fullName?: string | null;
        fullNameEn?: string | null;
      }
    | null
    | undefined,
  fallback?: string | null,
) => {
  const englishName =
    typeof player?.full_name_en === "string"
      ? player.full_name_en.trim()
      : typeof (player as any)?.fullNameEn === "string"
        ? (player as any).fullNameEn.trim()
        : "";
  if (englishName) return englishName;

  const nativeName =
    typeof (player as any)?.full_name === "string"
      ? (player as any).full_name.trim()
      : typeof (player as any)?.fullName === "string"
        ? (player as any).fullName.trim()
        : "";
  if (nativeName) return nativeName;

  const plainName = typeof player?.name === "string" ? player.name.trim() : "";
  if (plainName) return plainName;

  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : null;
};

const resolveEventSessionPlayerName = (
  sessionObj: any,
  side: "A" | "B",
  fallback?: string | null,
) => {
  const stateName =
    side === "A" ? sessionObj?.state?.playerAName : sessionObj?.state?.playerBName;
  if (typeof stateName === "string" && stateName.trim()) return stateName.trim();

  const topLevelName =
    side === "A" ? sessionObj?.player1Name : sessionObj?.player2Name;
  if (typeof topLevelName === "string" && topLevelName.trim()) return topLevelName.trim();

  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : null;
};

function PlayerWithFlag({
  name,
  country,
}: {
  name: string;
  country?: string | null;
}) {
  const flagSrc = getCountryFlagCdnUrl(country ?? null, 40);
  return (
    <span className="inline-flex items-center gap-2">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt={country || "flag"}
          className="h-3.5 w-5 rounded-[2px] object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function GroupTooltip({
  data,
  embedded,
  locale,
}: {
  data: GroupPopoverData;
  embedded: boolean;
  locale?: string;
}) {
  const hasStandingActivity = (player: GroupStanding) =>
    player.record.wins > 0 ||
    player.record.draws > 0 ||
    player.record.losses > 0 ||
    player.totalMatchPoints > 0 ||
    player.totalPoints > 0 ||
    player.totalInnings > 0 ||
    (player.highRun ?? 0) > 0 ||
    (player.highRun2 ?? 0) > 0 ||
    (player.bestAverage ?? 0) > 0;
  const visibleStandings = data.standings.filter(hasStandingActivity);
  const hasStandings = visibleStandings.length > 0;
  return (
    <div className="absolute left-0 bottom-full z-30 -mb-1 w-full max-w-full rounded-2xl border border-slate-200 bg-white px-3 pb-2 pt-3 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{data.title}</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Live group view
        </div>
      </div>

      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-[11px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Player</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
              <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R2</th>
            </tr>
          </thead>
          <tbody>
            {data.matches.map((match) => {
              const topPoints = Number(match.top.player.points ?? 0) || 0;
              const bottomPoints = Number(match.bottom.player.points ?? 0) || 0;
              const topRowClass =
                topPoints === bottomPoints
                  ? "border-t border-slate-200 bg-slate-50"
                  : topPoints > bottomPoints
                    ? "border-t border-slate-200 bg-emerald-50/80"
                    : "border-t border-slate-200 bg-rose-50/80";
              const bottomRowClass =
                topPoints === bottomPoints
                  ? "border-t border-slate-200 bg-slate-50"
                  : bottomPoints > topPoints
                    ? "border-t border-slate-200 bg-emerald-50/80"
                    : "border-t border-slate-200 bg-rose-50/80";

              return (
              <>
                <tr
                  key={`${match.key}-top`}
                  className={topRowClass}
                >
                  <td className="px-2 py-1.5 font-medium">
                    <Link
                      href={`${embedded ? "/embed" : ""}/players/${match.top.player.id}-${match.top.player.name.trim().replace(/\s+/g, "-")}`}
                      className="text-blue-600 hover:underline"
                    >
                      <PlayerWithFlag
                        name={match.top.player.name}
                        country={match.top.player.country}
                      />
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.points)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.innings)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatAverage(
                      match.top.player.points,
                      match.top.player.innings,
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.highRun)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.highRun2)}
                  </td>
                </tr>
                <tr
                  key={`${match.key}-bottom`}
                  className={bottomRowClass}
                >
                  <td className="px-2 py-1.5 font-medium">
                    <Link
                      href={`${embedded ? "/embed" : ""}/players/${match.bottom.player.id}-${match.bottom.player.name.trim().replace(/\s+/g, "-")}`}
                      className="text-blue-600 hover:underline"
                    >
                      <PlayerWithFlag
                        name={match.bottom.player.name}
                        country={match.bottom.player.country}
                      />
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.points)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.innings)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatAverage(
                      match.bottom.player.points,
                      match.bottom.player.innings,
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.highRun)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.highRun2)}
                  </td>
                </tr>
              </>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasStandings ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-[11px]">
            <thead className="bg-emerald-700 text-white">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Player</th>
                <th className="px-2 py-1.5 text-center font-semibold">Pos</th>
                <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
                <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
                <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
                <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              </tr>
            </thead>
            <tbody>
              {visibleStandings.map((player) => (
                <tr
                  key={player.key}
                  className="border-t border-slate-200 bg-white text-slate-700"
                >
                  <td className="px-2 py-1.5 font-medium">
                    {player.playerId ? (
                      <Link
                        href={`${embedded ? "/embed" : ""}/players/${player.playerId}-${player.playerName.trim().replace(/\s+/g, "-")}`}
                        className="text-blue-600 hover:underline"
                      >
                        <PlayerWithFlag
                          name={player.playerName}
                          country={player.playerCountry}
                        />
                      </Link>
                    ) : (
                      <PlayerWithFlag
                        name={player.playerName}
                        country={player.playerCountry}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">
                    {player.place}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {hasStandingActivity(player)
                      ? formatNumberValue(player.totalPoints)
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {hasStandingActivity(player)
                      ? formatNumberValue(player.totalInnings)
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {hasStandingActivity(player)
                      ? formatAverage(player.totalPoints, player.totalInnings)
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {hasStandingActivity(player)
                      ? formatNumberValue(player.highRun)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";
const EVENT_FALLBACK_POLL_MS = 60000;
const LIVE_SESSIONS_FALLBACK_POLL_MS = 30000;

const withEntityField = (
  entity: unknown,
  field: string,
  value: unknown,
) => {
  if (!entity || typeof entity !== "object") return entity;
  const record = entity as Record<string, unknown>;
  if (
    typeof record.attributes === "object" &&
    record.attributes !== null &&
    !Array.isArray(record.attributes)
  ) {
    return {
      ...record,
      attributes: {
        ...(record.attributes as Record<string, unknown>),
        [field]: value,
      },
    };
  }
  return {
    ...record,
    [field]: value,
  };
};

const normalizeNameForMatch = (value: string | null | undefined) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const buildNameFragments = (value: string | null | undefined) =>
  normalizeNameForMatch(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

const buildPairKey = (
  left: string | null | undefined,
  right: string | null | undefined,
) => {
  const a = String(left || "").trim();
  const b = String(right || "").trim();
  if (!a || !b) return null;
  return [a, b].sort().join("::");
};

const buildSessionPairKeys = (session: EventLiveSession) => {
  const keys = new Set<string>();

  const documentPairKey = buildPairKey(
    session.player1DocumentId,
    session.player2DocumentId,
  );
  if (documentPairKey) keys.add(`doc:${documentPairKey}`);

  const namePairKey = buildPairKey(
    normalizeNameForMatch(session.state?.playerAName ?? session.player1Name ?? null),
    normalizeNameForMatch(session.state?.playerBName ?? session.player2Name ?? null),
  );
  if (namePairKey) keys.add(`name:${namePairKey}`);

  return keys;
};

const createGroupPopoverData = (
  group: StageMatchGroup,
  session?: EventLiveSession | null,
): GroupPopoverData | null => {
  const sessionPairKey = buildPairKey(
    normalizeNameForMatch(
      session?.state?.playerAName ?? session?.player1Name ?? null,
    ),
    normalizeNameForMatch(
      session?.state?.playerBName ?? session?.player2Name ?? null,
    ),
  );

  const patchedMatches = group.matches.map((match) => {
    if (!session || !sessionPairKey) return match;
    const matchPairKey = buildPairKey(
      normalizeNameForMatch(match.top.player.name || match.top.player.nativeName),
      normalizeNameForMatch(
        match.bottom.player.name || match.bottom.player.nativeName,
      ),
    );
    if (!matchPairKey || matchPairKey !== sessionPairKey) return match;

    return {
      ...match,
      top: {
        ...match.top,
        player: {
          ...match.top.player,
          points:
            typeof session.state?.scoreA === "number"
              ? session.state.scoreA
              : match.top.player.points,
          innings:
            typeof session.state?.inningsA === "number"
              ? session.state.inningsA
              : match.top.player.innings,
          highRun:
            typeof session.state?.bestRunA === "number"
              ? session.state.bestRunA
              : match.top.player.highRun,
          highRun2: resolveLiveHighRun2(session, "A", match.top.player.highRun2),
        },
      },
      bottom: {
        ...match.bottom,
        player: {
          ...match.bottom.player,
          points:
            typeof session.state?.scoreB === "number"
              ? session.state.scoreB
              : match.bottom.player.points,
          innings:
            typeof session.state?.inningsB === "number"
              ? session.state.inningsB
              : match.bottom.player.innings,
          highRun:
            typeof session.state?.bestRunB === "number"
              ? session.state.bestRunB
              : match.bottom.player.highRun,
          highRun2: resolveLiveHighRun2(session, "B", match.bottom.player.highRun2),
        },
      },
    };
  });

  const playedMatches = patchedMatches.filter(hasPlayedStageMatch);
  const standings = buildGroupStandings(patchedMatches);
  if (playedMatches.length === 0 && standings.length === 0) return null;
  return {
    title: `Group ${group.number ?? group.key}`,
    standings,
    matches: playedMatches,
  };
};

const mergeLiveSessions = (
  primary: EventLiveSession[],
  secondary: EventLiveSession[],
) => {
  const preferText = (
    nextValue: string | null | undefined,
    fallbackValue: string | null | undefined,
  ): string | null | undefined => {
    if (typeof nextValue === "string" && nextValue.trim()) return nextValue;
    if (typeof fallbackValue === "string" && fallbackValue.trim()) return fallbackValue;
    return nextValue ?? fallbackValue;
  };
  const merged = new Map<string, EventLiveSession>();
  for (const session of [...secondary, ...primary]) {
    const key =
      session.screenIdentifier ||
      session.screenId ||
      session.documentId ||
      session.sessionId ||
      session.id;
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, session);
      continue;
    }
    const existingIsRunning =
      Boolean(existing.state?.isRunning) ||
      existing.sessionStatus === "in_progress";
    const nextIsRunning =
      Boolean(session.state?.isRunning) ||
      session.sessionStatus === "in_progress";
    const preserveRunningState = existingIsRunning && !nextIsRunning;
    const nextPlayerAName =
      session.state?.playerAName ?? session.player1Name ?? null;
    const nextPlayerBName =
      session.state?.playerBName ?? session.player2Name ?? null;
    const existingPlayerAName =
      existing.state?.playerAName ?? existing.player1Name ?? null;
    const existingPlayerBName =
      existing.state?.playerBName ?? existing.player2Name ?? null;
    merged.set(key, {
      ...existing,
      ...session,
      liveVideos: normalizeLiveVideoEntries(
        session.liveVideos ?? session.state?.liveVideos ?? existing.liveVideos ?? existing.state?.liveVideos,
      ),
      sessionStatus: preserveRunningState
        ? existing.sessionStatus
        : session.sessionStatus,
      state: {
        ...existing.state,
        ...session.state,
        liveVideos: normalizeLiveVideoEntries(
          session.state?.liveVideos ?? session.liveVideos ?? existing.state?.liveVideos ?? existing.liveVideos,
        ),
        playerAPhotoUrl: preferText(
          session.state?.playerAPhotoUrl,
          shouldReusePlayerPhoto(nextPlayerAName, existingPlayerAName)
            ? existing.state?.playerAPhotoUrl
            : null,
        ),
        playerAPhotoMainUrl: preferText(
          session.state?.playerAPhotoMainUrl,
          shouldReusePlayerPhoto(nextPlayerAName, existingPlayerAName)
            ? existing.state?.playerAPhotoMainUrl
            : null,
        ),
        playerBPhotoUrl: preferText(
          session.state?.playerBPhotoUrl,
          shouldReusePlayerPhoto(nextPlayerBName, existingPlayerBName)
            ? existing.state?.playerBPhotoUrl
            : null,
        ),
        playerBPhotoMainUrl: preferText(
          session.state?.playerBPhotoMainUrl,
          shouldReusePlayerPhoto(nextPlayerBName, existingPlayerBName)
            ? existing.state?.playerBPhotoMainUrl
            : null,
        ),
        isRunning: preserveRunningState
          ? existing.state?.isRunning
          : session.state?.isRunning,
      },
    });
  }
  return Array.from(merged.values());
};

const resolvePreferredPhotoValue = (
  ...values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return normalizeMediaUrl(value.trim()) ?? value.trim();
    }
  }
  return null;
};

const shouldReusePlayerPhoto = (
  nextName: string | null | undefined,
  previousName: string | null | undefined,
) => {
  const next = normalizeNameForMatch(nextName);
  const prev = normalizeNameForMatch(previousName);
  if (!next || !prev) return true;
  return next === prev;
};

function buildInningsDetailFromSnapshots(snapshots: SessionSnapshot[]): InningDetailEntry[] {
  if (!Array.isArray(snapshots) || snapshots.length < 2) return [];
  const map = new Map<number, InningDetailEntry>();
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const inning = Math.max(
      1,
      Number.isFinite(curr.innings) && curr.innings ? curr.innings : i,
    );
    const deltaP1 = Math.max(0, (curr.player1Points ?? 0) - (prev.player1Points ?? 0));
    const deltaP2 = Math.max(0, (curr.player2Points ?? 0) - (prev.player2Points ?? 0));
    const inningChanged = (curr.innings ?? 0) !== (prev.innings ?? 0);
    const scoreChanged = deltaP1 > 0 || deltaP2 > 0;
    if (!inningChanged && !scoreChanged) continue;
    if (!map.has(inning)) map.set(inning, { inning });
    const entry = map.get(inning)!;
    const prevP1 = Number(entry.player1?.pt ?? 0);
    const prevP2 = Number(entry.player2?.pt ?? 0);
    entry.player1 = {
      pt: prevP1 + deltaP1,
      tot: Math.max(0, curr.player1Points ?? 0),
    };
    entry.player2 = {
      pt: prevP2 + deltaP2,
      tot: Math.max(0, curr.player2Points ?? 0),
    };
  }
  return Array.from(map.values())
    .filter((entry) => (entry.player1?.tot ?? 0) > 0 || (entry.player2?.tot ?? 0) > 0)
    .sort((a, b) => a.inning - b.inning);
}

type TournamentLiveScreensResponse = {
  success: boolean;
  data: Array<{
    tournamentId: string;
    tournamentTitle: string;
    liveScreens: TournamentLiveScreen[];
  }>;
  error?: string;
};

const formatDate = (value: string | null, locale?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateRange = (
  start: string | null,
  end: string | null,
  locale?: string,
) => {
  const startText = formatDate(start, locale);
  const endText = formatDate(end, locale);
  if (startText && endText) {
    return startText === endText ? startText : `${startText} - ${endText}`;
  }
  return startText || endText || null;
};

const formatGmtOffsetLabel = (offsetMinutes: number) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `GMT${sign}${String(hours).padStart(2, "0")}${
    minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : ""
  }`;
};

const sortTableLabel = (value: string) => value.trim().toLowerCase();
const normalizeLookupText = (value: string | null | undefined) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const PUBLIC_TIMEZONE_STORAGE_KEY = "bt-public-timezone-offset-minutes";
const formatDateTimeWithOffset = (
  dateTime: string | null,
  offsetMinutes: number | null,
) => {
  if (!dateTime || offsetMinutes === null) return null;
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) return null;
  const shifted = new Date(parsed.getTime() + offsetMinutes * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
  };
};

const highlightText = (value: string, query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return value;
  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escaped})`, "ig");
  const parts = value.split(matcher);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-yellow-200 px-0.5 text-current"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
};

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) =>
  typeof metadata?.[key] === "string" ? String(metadata[key]).trim() : "";

const getMetadataNumber = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatRoundNodeLabel = (
  roundCode: string,
  roundIndex: number | null,
) => {
  const normalized = roundCode.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "F" || normalized === "FINAL") return "FINAL";
  if (roundIndex === null || !Number.isFinite(roundIndex)) return normalized;
  return `${normalized}${roundIndex}`;
};

const inferLegacyRoundNodeLabel = (matchNumber: number | null) => {
  if (matchNumber === null || !Number.isFinite(matchNumber)) return null;
  if (matchNumber === 57) return "FINAL";
  if (matchNumber >= 55 && matchNumber <= 56) return `SF${matchNumber - 54}`;
  if (matchNumber >= 51 && matchNumber <= 54) return `QF${matchNumber - 50}`;
  if (matchNumber >= 43 && matchNumber <= 50) return `L16-${matchNumber - 42}`;
  return null;
};

const buildOwnMatchNodeLabel = (
  matchNumber: number | null,
  metadata: Record<string, unknown> | null | undefined,
) => {
  const roundCode = getMetadataString(metadata, "roundCode");
  const roundIndex = getMetadataNumber(metadata, "roundIndex");
  return (
    formatRoundNodeLabel(roundCode, roundIndex) ||
    inferLegacyRoundNodeLabel(matchNumber)
  );
};

const buildPlaceholderSideLabel = (
  metadata: Record<string, unknown> | null | undefined,
  side: "left" | "right",
  matchNodeLabelByNumber: Map<number, string>,
) => {
  const roleKey =
    side === "left" ? "placeholderLeftRole" : "placeholderRightRole";
  const matchKey =
    side === "left"
      ? "placeholderLeftMatchNumber"
      : "placeholderRightMatchNumber";
  const role = getMetadataString(metadata, roleKey);
  const matchNumber = getMetadataNumber(metadata, matchKey);
  if (!role || !Number.isFinite(matchNumber ?? NaN)) return null;
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "qual") return `QUAL ${matchNumber}`;
  const resolvedMatchNumber = Number(matchNumber);
  const sourceNodeLabel = matchNodeLabelByNumber.get(resolvedMatchNumber);
  if (
    sourceNodeLabel &&
    (sourceNodeLabel === "FINAL" || sourceNodeLabel.startsWith("QUAL "))
  ) {
    return sourceNodeLabel;
  }
  return `${normalizedRole === "loser" ? "Loser" : "Winner"} from Match ${resolvedMatchNumber}`;
};

const resolveMediaUrl = (url: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base =
    process.env.NEXT_PUBLIC_STRAPI_URL || "https://app.billiardtoday.com";
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
};

export function TournamentDetailPage({
  summary,
  embedded = false,
  initialEventData = null,
  initialSeriesData = null,
}: Props) {
  const hasInfoDescription =
    typeof summary.description === "string" && summary.description.trim().length > 0;

  const fullPageHref = buildTournamentHref(
    summary.documentId,
    summary.title,
    summary.season,
    false,
  );
  const [browserLocale, setBrowserLocale] = useState<string | null>(null);
  const stageCount = summary.stages.length;
  const scheduleLabel = formatDateRange(
    summary.startDate,
    summary.endDate,
    browserLocale ?? undefined,
  );
  const organizerLogoUrl = resolveMediaUrl(summary.organizerLogoUrl);
  const venueMetaParts = useMemo(() => {
    const uniquePush = (parts: string[], value: string) => {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return;
      }

      const exists = parts.some(
        (candidate) =>
          candidate.localeCompare(normalizedValue, undefined, {
            sensitivity: "accent",
          }) === 0,
      );

      if (!exists) {
        parts.push(normalizedValue);
      }
    };

    const country = String(
      summary.venueCountry ?? summary.clubCountry ?? "",
    ).trim();
    const rawLocation = String(
      summary.venueCity ?? summary.clubCity ?? "",
    ).trim();
    const venueName = String(
      summary.venueName ?? summary.clubName ?? "",
    ).trim();

    let cityName = "";
    let districtName = "";

    if (rawLocation) {
      const countryPattern = country
        ? new RegExp(
            `\\b${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "gi",
          )
        : null;
      const locationWithoutCountry = (
        countryPattern ? rawLocation.replace(countryPattern, " ") : rawLocation
      )
        .replace(/\s+/g, " ")
        .trim();

      const segmentedLocationParts = locationWithoutCountry
        .split(/\s*[,/|]\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (segmentedLocationParts.length >= 2) {
        cityName = segmentedLocationParts[0] ?? "";
        districtName = segmentedLocationParts.slice(1).join(" ");
      } else if (locationWithoutCountry) {
        const athensMatch = locationWithoutCountry.match(
          /^(.*?)(?:\s+)?(Athens)$/i,
        );

        if (athensMatch) {
          cityName = athensMatch[2]?.trim() ?? "";
          districtName = athensMatch[1]?.trim() ?? "";
        } else {
          cityName = locationWithoutCountry;
        }
      }
    }

    const resolvedParts: string[] = [];
    uniquePush(resolvedParts, country);
    uniquePush(resolvedParts, cityName);
    uniquePush(resolvedParts, districtName);
    uniquePush(resolvedParts, venueName);

    return resolvedParts;
  }, [
    summary.clubCity,
    summary.clubCountry,
    summary.clubName,
    summary.venueCity,
    summary.venueCountry,
    summary.venueName,
  ]);
  const finalStageDocumentId =
    summary.stages.find((stage) => stage.isFinal)?.documentId ??
    summary.stages[summary.stages.length - 1]?.documentId ??
    null;
  const [activeView, setActiveView] = useState<"tournament" | "live">(
    "tournament",
  );
  const [tournamentPanelMode, setTournamentPanelMode] = useState<
    "stages" | "finals" | "gallery" | "timetable" | "participants" | "info"
  >("stages");
  const [timetableViewMode, setTimetableViewMode] = useState<
    "matches" | "training"
  >("matches");
  const [timetableSearchQuery, setTimetableSearchQuery] = useState("");
  const [selectedTimezoneOffsetMinutes, setSelectedTimezoneOffsetMinutes] =
    useState<number | null>(null);
  const [overviewMode, setOverviewMode] = useState<"results" | "ranks">(
    "results",
  );
  const [selectedStageDocumentId, setSelectedStageDocumentId] = useState<
    string | null
  >(summary.stages[0]?.documentId ?? null);
  const [liveScreensData, setLiveScreensData] = useState<
    TournamentLiveScreensResponse["data"]
  >([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [eventLiveSessions, setEventLiveSessions] = useState<
    EventLiveSession[]
  >([]);
  const [wsLiveSessions, setWsLiveSessions] = useState<EventLiveSession[]>([]);
  const [expandedLiveSessionIds, setExpandedLiveSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [eventData, setEventData] = useState<EventApiResponse | null>(initialEventData);
  const [participantSortMode, setParticipantSortMode] = useState<
    "registration" | "age" | "ranking"
  >("registration");
  const [participantAgeDirection, setParticipantAgeDirection] = useState<"asc" | "desc">("asc");
  const [highlightedLiveSessionId, setHighlightedLiveSessionId] = useState<
    string | null
  >(null);
  const [highlightItem, setHighlightItem] = useState<LiveScoreItem | null>(
    null,
  );
  const [videoDrawerSessionId, setVideoDrawerSessionId] = useState<string | null>(null);
  const [videoDrawerVideoId, setVideoDrawerVideoId] = useState<string | null>(null);
  const [videoDrawerLaunchOrigin, setVideoDrawerLaunchOrigin] =
    useState<DrawerLaunchOrigin | null>(null);
  const [videoDrawerSelectedSessionIds, setVideoDrawerSelectedSessionIds] = useState<string[]>([]);
  const [isWideDesktop, setIsWideDesktop] = useState(false);
  const [suppressLiveGridClicks, setSuppressLiveGridClicks] = useState(false);
  const mobileVideoDrawerRef = useRef<HTMLDivElement | null>(null);
  const skipNextLiveTopScrollRef = useRef(false);
  const lastModalCloseAtRef = useRef(0);
  const sessionSnapshotsRef = useRef<Map<string, SessionSnapshot[]>>(new Map());
  const sessionDetailsRef = useRef<Map<string, InningDetailEntry[]>>(new Map());
  const lastClosedHighlightRef = useRef<{
    sessionId?: string;
    screenId?: string;
    at: number;
  } | null>(null);
  const [hoveredGroupSessionId, setHoveredGroupSessionId] = useState<
    string | null
  >(null);
  const [openGroupSessionId, setOpenGroupSessionId] = useState<string | null>(
    null,
  );
  const tournamentScrollYRef = useRef<number | null>(null);
  const pendingTournamentRestoreYRef = useRef<number | null>(null);
  const previousViewRef = useRef<"tournament" | "live">("tournament");
  const tournamentContentRef = useRef<HTMLDivElement | null>(null);
  const liveContentRef = useRef<HTMLDivElement | null>(null);
  const screenSocketKeysRef = useRef<string>("");
  const lastStructuralRefreshAtRef = useRef(0);
  const derivedClubDocumentId =
    summary.clubDocumentId ||
    eventLiveSessions.find((session) => session.clubId)?.clubId ||
    null;

  const recordSnapshot = (sessionKey: string | undefined | null, snapshot: SessionSnapshot) => {
    if (!sessionKey) return;
    const map = sessionSnapshotsRef.current;
    const prev = map.get(sessionKey) ?? [];
    const next = [...prev, snapshot];
    if (next.length > 300) next.splice(0, next.length - 300);
    map.set(sessionKey, next);
  };

  const resolveFallbackInningsDetail = (sessionKey: string | undefined | null) => {
    if (!sessionKey) return undefined;
    const snapshots = sessionSnapshotsRef.current.get(sessionKey);
    if (!snapshots) return undefined;
    const detail = buildInningsDetailFromSnapshots(snapshots);
    return detail.length > 0 ? detail : undefined;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextLocale =
      window.navigator.languages?.find(
        (value) => typeof value === "string" && value.trim(),
      ) ||
      window.navigator.language ||
      null;
    setBrowserLocale(nextLocale);
  }, []);

  const fetchEventPayload = useCallback(async () => {
    const response = await fetch(
      `/event-data/${encodeURIComponent(summary.documentId)}`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Failed to load event data.");
    return (await response.json().catch(() => null)) as EventApiResponse | null;
  }, [summary.documentId]);

  const fetchStageMatchesPayload = useCallback(async (stageDocumentId: string) => {
    const response = await fetch(
      `/api/event-stages/${encodeURIComponent(stageDocumentId)}/matches`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Failed to load stage matches.");
    const payload = (await response.json().catch(() => null)) as
      | { matches?: unknown[] }
      | null;
    return Array.isArray(payload?.matches) ? payload.matches : [];
  }, []);

  const fetchStageStandingsPayload = useCallback(async (stageDocumentId: string) => {
    const response = await fetch(
      `/api/event-stages/${encodeURIComponent(stageDocumentId)}/standings`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Failed to load stage standings.");
    const payload = (await response.json().catch(() => null)) as
      | { results?: unknown[]; data?: unknown[]; standings?: unknown[] }
      | null;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    return Array.isArray(payload?.standings) ? payload.standings : [];
  }, []);

  const fetchFinalResultsPayload = useCallback(async () => {
    const response = await fetch(
      `/api/events/${encodeURIComponent(summary.documentId)}/final-results`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Failed to load final results.");
    const payload = (await response.json().catch(() => null)) as
      | { data?: unknown[] }
      | null;
    return Array.isArray(payload?.data) ? payload.data : [];
  }, [summary.documentId]);

  const replaceStageField = useCallback(
    (stageDocumentId: string, field: "groups" | "results", value: unknown[]) => {
      setEventData((current) => {
        if (!current?.data?.event_stages) return current;
        const currentStages = toRelationArray(current.data.event_stages);
        let changed = false;
        const nextStages = currentStages.map((stage, index) => {
          const normalizedStage = normalizeEntity(
            stage,
            `stage-${index}`,
          ) as { documentId?: string | null };
          if (normalizedStage.documentId !== stageDocumentId) return stage;
          changed = true;
          return withEntityField(stage, field, value);
        }) as unknown as NonNullable<EventApiResponse["data"]>["event_stages"];

        if (!changed) return current;
        return {
          ...current,
          data: {
            ...current.data,
            event_stages: nextStages,
          },
        };
      });
    },
    [],
  );

  const replaceFinalResults = useCallback((value: unknown[]) => {
    setEventData((current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: {
          ...current.data,
          results_final:
            value as unknown as StrapiFinalResult[],
        },
      };
    });
  }, []);

  const refreshStageMatches = useCallback(
    async (stageDocumentId: string) => {
      if (!stageDocumentId) return;
      try {
        const matches = (await fetchStageMatchesPayload(
          stageDocumentId,
        )) as StrapiGroup[];
        replaceStageField(stageDocumentId, "groups", matches);
      } catch {
        // Keep current stage UI on transient targeted refresh failures.
      }
    },
    [fetchStageMatchesPayload, replaceStageField],
  );

  const refreshStageStandings = useCallback(
    async (stageDocumentId: string) => {
      if (!stageDocumentId) return;
      try {
        const standings = (await fetchStageStandingsPayload(
          stageDocumentId,
        )) as StrapiResult[];
        replaceStageField(stageDocumentId, "results", standings);
      } catch {
        // Keep current stage UI on transient targeted refresh failures.
      }
    },
    [fetchStageStandingsPayload, replaceStageField],
  );

  const refreshFinalResults = useCallback(async () => {
    try {
      const finals = await fetchFinalResultsPayload();
      replaceFinalResults(finals);
    } catch {
      // Keep current final results UI on transient targeted refresh failures.
    }
  }, [fetchFinalResultsPayload, replaceFinalResults]);

  const refreshEventData = useCallback(async () => {
    try {
      const payload = await fetchEventPayload();
      setEventData((current) => {
        const currentSerialized = JSON.stringify(current);
        const nextSerialized = JSON.stringify(payload);
        return currentSerialized === nextSerialized ? current : payload;
      });
    } catch {
      // Keep current UI state and data on transient refresh failures.
    }
  }, [fetchEventPayload]);

  const refreshEventLiveSessions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/tournaments/${encodeURIComponent(summary.documentId)}/live-sessions`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => ({ data: [] }))) as {
        data?: EventLiveSession[];
      };
      if (!response.ok) {
        throw new Error("Failed to load event live sessions.");
      }

      const nextSessions = Array.isArray(payload.data) ? payload.data : [];
      nextSessions.forEach((session) => {
        const sessionKey = String(session.sessionId || session.screenId || "").trim();
        const state = session.state || {};
        recordSnapshot(sessionKey, {
          innings:
            (state.inningsCount ?? state.inningsA ?? state.inningsB ?? 0) || 1,
          player1Points: state.scoreA ?? 0,
          player2Points: state.scoreB ?? 0,
        });
        if (!state.inningsDetail || state.inningsDetail.length === 0) {
          const cached =
            sessionDetailsRef.current.get(sessionKey) ??
            resolveFallbackInningsDetail(sessionKey);
          if (cached?.length) {
            state.inningsDetail = cached;
          }
        }
        if (state.inningsDetail && state.inningsDetail.length > 0) {
          sessionDetailsRef.current.set(sessionKey, state.inningsDetail);
        }
      });
      setEventLiveSessions(nextSessions);
    } catch {
      setEventLiveSessions([]);
    }
  }, [summary.documentId]);

  useEffect(() => {
    let cancelled = false;

    const fetchEventData = async () => {
      try {
        const payload = await fetchEventPayload();
        if (!cancelled) {
          setEventData(payload);
        }
      } catch {
        if (!cancelled && !initialEventData?.data) {
          setEventData(null);
        }
      }
    };

    void fetchEventData();
    return () => {
      cancelled = true;
    };
  }, [fetchEventPayload, initialEventData]);

  useEffect(() => {
    if (activeView !== "tournament") return;

    let cancelled = false;

    const refreshVisibleEventData = async () => {
      await refreshEventData();
      if (cancelled) return;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") return;
      void refreshVisibleEventData();
    };

    const handleFocus = () => {
      void refreshVisibleEventData();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshVisibleEventData();
    }, EVENT_FALLBACK_POLL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeView, refreshEventData]);

  useEffect(() => {
    if (previousViewRef.current === "tournament" && activeView === "live") {
      tournamentScrollYRef.current = window.scrollY;
    }

    if (
      previousViewRef.current === "live" &&
      activeView === "tournament" &&
      tournamentScrollYRef.current !== null
    ) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }

    previousViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    if (
      activeView !== "tournament" ||
      pendingTournamentRestoreYRef.current === null
    )
      return;

    const restoreY = pendingTournamentRestoreYRef.current;
    const restoreScroll = () => {
      window.scrollTo({ top: restoreY, behavior: "auto" });
    };

    const frameOne = requestAnimationFrame(restoreScroll);
    const frameTwo = requestAnimationFrame(() => {
      requestAnimationFrame(restoreScroll);
    });
    const timeoutOne = window.setTimeout(restoreScroll, 80);
    const timeoutTwo = window.setTimeout(restoreScroll, 180);
    const timeoutThree = window.setTimeout(restoreScroll, 320);
    let attempts = 0;
    const interval = window.setInterval(() => {
      restoreScroll();
      attempts += 1;
      if (attempts >= 8) {
        window.clearInterval(interval);
        pendingTournamentRestoreYRef.current = null;
      }
    }, 120);
    const timeoutFinal = window.setTimeout(() => {
      restoreScroll();
      pendingTournamentRestoreYRef.current = null;
      window.clearInterval(interval);
    }, 1000);

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      window.clearTimeout(timeoutOne);
      window.clearTimeout(timeoutTwo);
      window.clearTimeout(timeoutThree);
      window.clearTimeout(timeoutFinal);
      window.clearInterval(interval);
    };
  }, [activeView, eventData, selectedStageDocumentId]);

  useEffect(() => {
    if (activeView !== "live") return;

    let cancelled = false;

    const fetchLiveScreens = async () => {
      try {
        setIsLiveLoading(true);
        setLiveError(null);
        const response = await fetch("/api/admin/tournament/live-screens", {
          cache: "no-store",
        });
        const payload = (await response
          .json()
          .catch(() => null)) as TournamentLiveScreensResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.error || "Failed to load live tournament screens.",
          );
        }

        if (!cancelled) {
          setLiveScreensData(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(
            error instanceof Error
              ? error.message
              : "Failed to load live tournament screens.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLiveLoading(false);
        }
      }
    };

    void fetchLiveScreens();
    const interval = window.setInterval(fetchLiveScreens, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;

    const runRefresh = async () => {
      await refreshEventLiveSessions();
      if (cancelled) return;
    };

    void runRefresh();
    const interval = window.setInterval(
      runRefresh,
      LIVE_SESSIONS_FALLBACK_POLL_MS,
    );
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshEventLiveSessions]);

  useEffect(() => {
    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);
    wsUrl.search = params.toString();

    const socket = new WebSocket(wsUrl.toString());
    let isClosed = false;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe:event",
          eventId: summary.documentId,
        }),
      );
    };

    socket.onmessage = (event) => {
      if (isClosed) return;
      try {
        const payload = JSON.parse(
          String(event.data || "{}"),
        ) as WsTournamentPayload;
        if (String(payload.eventId || "").trim() !== String(summary.documentId)) {
          return;
        }

        if (payload.type === "stage_matches_dirty" && payload.stageId) {
          void refreshStageMatches(String(payload.stageId));
          return;
        }

        if (payload.type === "stage_standings_dirty" && payload.stageId) {
          void refreshStageStandings(String(payload.stageId));
          return;
        }

        if (payload.type === "final_results_dirty") {
          void refreshFinalResults();
          return;
        }

        if (
          payload.type === "event_shell_dirty" ||
          payload.type === "timetable_dirty"
        ) {
          const now = Date.now();
          if (now - lastStructuralRefreshAtRef.current < 1500) return;
          lastStructuralRefreshAtRef.current = now;
          void refreshEventData();
          return;
        }

        if (
          (payload.type === "SESSION_ASSIGNED" ||
            payload.type === "SESSION_UPDATED") &&
          String(payload.eventId || payload.session?.eventId || "").trim() ===
            String(summary.documentId)
        ) {
          void refreshEventLiveSessions();
        }
      } catch {
        // Ignore malformed payloads from unrelated channels.
      }
    };

    return () => {
      isClosed = true;
      try {
        socket.close();
      } catch {
        // ignore close errors
      }
    };
  }, [
    refreshFinalResults,
    refreshEventData,
    refreshEventLiveSessions,
    refreshStageMatches,
    refreshStageStandings,
    summary.documentId,
  ]);

  useEffect(() => {
    if (!derivedClubDocumentId) {
      setWsLiveSessions([]);
      return;
    }

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);

    wsUrl.search = params.toString();

    const socket = new WebSocket(wsUrl.toString());

    const upsertLiveSession = (item: EventLiveSession) => {
      setWsLiveSessions((prev) => {
        const next = mergeLiveSessions([item], prev);
        return next.sort((a, b) =>
          (b.updatedAt || "").localeCompare(a.updatedAt || ""),
        );
      });
    };

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe:club",
          clubId: derivedClubDocumentId,
        }),
      );
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(
          String(event.data || "{}"),
        ) as WsTournamentPayload;
        const payloadClubId = String(
          payload.clubId ?? payload.session?.clubId ?? "",
        );
        if (payloadClubId !== String(derivedClubDocumentId)) return;

        if (
          (payload.type === "SESSION_ASSIGNED" ||
            payload.type === "SESSION_UPDATED") &&
          payload.session &&
          typeof payload.session === "object"
        ) {
          const sessionObj = payload.session;
          const sessionDocumentId =
            typeof sessionObj.documentId === "string" &&
            sessionObj.documentId.trim().length > 0
              ? sessionObj.documentId.trim()
              : null;
          const lifecycleSessionId = String(
            sessionObj.documentId ??
              payload.sessionId ??
              sessionObj.id ??
              payload.screenIdentifier ??
              payload.screenId ??
              "",
          ).trim();
          const lifecycleScreenId = String(
            payload.screenIdentifier ??
              payload.screenId ??
              sessionObj.screenIdentifier ??
              "",
          ).trim();
          const lifecycleStatus =
            String(
              (payload.session?.sessionStatus ??
                payload.session?.status ??
                payload.type) ||
                "",
            ).trim() || null;

          if (
            payload.ended === true ||
            lifecycleStatus === "finished" ||
            lifecycleStatus === "cancelled"
          ) {
            setWsLiveSessions((prev) =>
              prev.filter(
                (entry) =>
                  entry.sessionId !== lifecycleSessionId &&
                  entry.documentId !== lifecycleSessionId &&
                  entry.id !== lifecycleSessionId &&
                  entry.screenId !== lifecycleScreenId &&
                  entry.screenIdentifier !== lifecycleScreenId,
              ),
            );
            return;
          }

          upsertLiveSession({
            id: lifecycleSessionId || lifecycleScreenId || "unknown-session",
            documentId:
              sessionDocumentId ||
              lifecycleSessionId ||
              lifecycleScreenId ||
              "",
            sessionId:
              lifecycleSessionId || lifecycleScreenId || "unknown-session",
            screenId: lifecycleScreenId || null,
            screenIdentifier: lifecycleScreenId || null,
            liveVideos: normalizeLiveVideoEntries(
              sessionObj.liveVideos ??
                sessionObj.live_videos ??
                sessionObj.youtubeVideoId ??
                sessionObj.videoId,
            ),
            updatedAt: new Date().toISOString(),
            clubId: derivedClubDocumentId,
            eventId:
              typeof sessionObj.eventId === "string"
                ? sessionObj.eventId
                : null,
            eventStageId:
              typeof sessionObj.eventStageId === "string"
                ? sessionObj.eventStageId
                : null,
            groupNumber:
              typeof sessionObj.groupNumber === "number"
                ? sessionObj.groupNumber
                : typeof sessionObj.groupNumber === "string"
                  ? Number(sessionObj.groupNumber)
                  : null,
            player1DocumentId:
              typeof sessionObj.player1DocumentId === "string"
                ? sessionObj.player1DocumentId
                : null,
            player2DocumentId:
              typeof sessionObj.player2DocumentId === "string"
                ? sessionObj.player2DocumentId
                : null,
            player1Name: resolveEventSessionPlayerName(sessionObj, "A"),
            player2Name: resolveEventSessionPlayerName(sessionObj, "B"),
            sessionStatus: lifecycleStatus,
            state: {
              scoreA: Number(sessionObj.player1_points ?? 0) || 0,
              scoreB: Number(sessionObj.player2_points ?? 0) || 0,
              inningsA: Number(sessionObj.player1_innings ?? 0) || 0,
              inningsB: Number(sessionObj.player2_innings ?? 0) || 0,
              inningsCount: Math.max(
                Number(sessionObj.player1_innings ?? 0) || 0,
                Number(sessionObj.player2_innings ?? 0) || 0,
              ),
              bestRunA: Number(sessionObj.player1_high_run ?? 0) || 0,
              bestRunB: Number(sessionObj.player2_high_run ?? 0) || 0,
              bestRun2A: Number(sessionObj.player1_high_run_2 ?? 0) || 0,
              bestRun2B: Number(sessionObj.player2_high_run_2 ?? 0) || 0,
              playerAName:
                resolveEventSessionPlayerName(sessionObj, "A", "Player A") ?? "Player A",
              playerBName:
                resolveEventSessionPlayerName(sessionObj, "B", "Player B") ?? "Player B",
              playerACountry:
                typeof sessionObj.state?.playerACountry === "string"
                  ? sessionObj.state.playerACountry
                  : typeof sessionObj.player1Country === "string"
                  ? sessionObj.player1Country
                  : null,
              playerBCountry:
                typeof sessionObj.state?.playerBCountry === "string"
                  ? sessionObj.state.playerBCountry
                  : typeof sessionObj.player2Country === "string"
                  ? sessionObj.player2Country
                  : null,
              playerAPhotoUrl:
                typeof sessionObj.state?.playerAPhotoUrl === "string"
                  ? sessionObj.state.playerAPhotoUrl
                  : typeof sessionObj.player1PhotoUrl === "string"
                  ? sessionObj.player1PhotoUrl
                  : null,
              playerAPhotoMainUrl:
                typeof sessionObj.state?.playerAPhotoMainUrl === "string"
                  ? sessionObj.state.playerAPhotoMainUrl
                  : typeof sessionObj.player1PhotoMainUrl === "string"
                    ? sessionObj.player1PhotoMainUrl
                    : null,
              playerBPhotoUrl:
                typeof sessionObj.state?.playerBPhotoUrl === "string"
                  ? sessionObj.state.playerBPhotoUrl
                  : typeof sessionObj.player2PhotoUrl === "string"
                  ? sessionObj.player2PhotoUrl
                  : null,
              playerBPhotoMainUrl:
                typeof sessionObj.state?.playerBPhotoMainUrl === "string"
                  ? sessionObj.state.playerBPhotoMainUrl
                  : typeof sessionObj.player2PhotoMainUrl === "string"
                    ? sessionObj.player2PhotoMainUrl
                    : null,
              progress: Number(sessionObj.progress ?? 0) || 0,
              totalBlocks: 40,
              isRunning: lifecycleStatus === "in_progress",
              tournamentName:
                typeof sessionObj.eventTitle === "string"
                  ? sessionObj.eventTitle
                  : null,
              stageName:
                typeof sessionObj.stageTitle === "string"
                  ? sessionObj.stageTitle
                  : null,
              groupName:
                typeof sessionObj.groupLabel === "string"
                  ? sessionObj.groupLabel
                  : null,
              tableName:
                typeof sessionObj.tableNumber === "string"
                  ? sessionObj.tableNumber
                  : null,
            },
          });
          return;
        }

        if (payload.type !== "score:update") return;
        if (eventLiveSessions.length > 0) return;
        if (payload.ended === true) {
          const endedSessionId = String(payload.sessionId ?? "");
          const endedScreenId = String(payload.screenId ?? "");
          setWsLiveSessions((prev) =>
            prev.filter(
              (entry) =>
                entry.sessionId !== endedSessionId &&
                entry.documentId !== endedSessionId &&
                entry.id !== endedSessionId &&
                entry.screenId !== endedScreenId &&
                entry.screenIdentifier !== endedScreenId,
            ),
          );
          return;
        }

        const players = Array.isArray(payload.players) ? payload.players : [];
        const playerA = players[0] ?? {};
        const playerB = players[1] ?? {};
        const sessionId = String(
          payload.sessionId ?? payload.screenId ?? "",
        ).trim();
        const screenId = String(payload.screenId ?? "").trim();
        const existingSession =
          wsLiveSessions.find((entry) => entry.screenId === screenId) ??
          wsLiveSessions.find((entry) => entry.sessionId === sessionId);
        const current: "A" | "B" | undefined =
          payload.current ??
          (payload.activePlayer === 1
            ? "A"
            : payload.activePlayer === 2
              ? "B"
              : undefined);
        const incomingPlayerAName = resolveTournamentPayloadPlayerName(
          playerA,
          existingSession?.state?.playerAName ?? existingSession?.player1Name ?? null,
        );
        const incomingPlayerBName = resolveTournamentPayloadPlayerName(
          playerB,
          existingSession?.state?.playerBName ?? existingSession?.player2Name ?? null,
        );
        const nextPlayerAName = isPlaceholderPlayerName(incomingPlayerAName)
          ? (existingSession?.state?.playerAName ??
            existingSession?.player1Name ??
            null)
          : incomingPlayerAName;
        const nextPlayerBName = isPlaceholderPlayerName(incomingPlayerBName)
          ? (existingSession?.state?.playerBName ??
            existingSession?.player2Name ??
            null)
          : incomingPlayerBName;
        const liveInningsDetail = Array.isArray(payload.inningsDetail)
          ? (payload.inningsDetail as InningDetailEntry[])
          : undefined;
        upsertLiveSession({
          id: sessionId || screenId || "unknown-session",
          documentId: sessionId || screenId || "unknown-session",
          sessionId: sessionId || screenId || "unknown-session",
          screenId: screenId || null,
          screenIdentifier: screenId || null,
          updatedAt:
            typeof payload.ts === "number" && Number.isFinite(payload.ts)
              ? new Date(payload.ts).toISOString()
              : new Date().toISOString(),
          clubId: derivedClubDocumentId,
          eventId: null,
          eventStageId: null,
          groupNumber: null,
          player1DocumentId: null,
          player2DocumentId: null,
          player1Name: nextPlayerAName,
          player2Name: nextPlayerBName,
          sessionStatus: payload.isRunning ? "in_progress" : "pending",
          state: {
            scoreA: Number(playerA.points ?? 0) || 0,
            scoreB: Number(playerB.points ?? 0) || 0,
            runA: Number(playerA.run ?? 0) || 0,
            runB: Number(playerB.run ?? 0) || 0,
            liveRunA: Number(playerA.liveRun ?? playerA.run ?? 0) || 0,
            liveRunB: Number(playerB.liveRun ?? playerB.run ?? 0) || 0,
            inningsA: Number(playerA.innings ?? 0) || 0,
            inningsB: Number(playerB.innings ?? 0) || 0,
            inningsCount: Math.max(
              Number(playerA.innings ?? 0) || 0,
              Number(playerB.innings ?? 0) || 0,
            ),
            bestRunA: Number(playerA.hr ?? 0) || 0,
            bestRunB: Number(playerB.hr ?? 0) || 0,
            bestRun2A:
              Number(
                playerA.hr2 ??
                  deriveSecondHighRunFromInnings(liveInningsDetail, "A") ??
                  0,
              ) || 0,
            bestRun2B:
              Number(
                playerB.hr2 ??
                  deriveSecondHighRunFromInnings(liveInningsDetail, "B") ??
                  0,
              ) || 0,
            avgFormattedA:
              typeof playerA.avgFormatted === "string"
                ? playerA.avgFormatted
                : undefined,
            avgFormattedB:
              typeof playerB.avgFormatted === "string"
                ? playerB.avgFormatted
                : undefined,
            accPercentA:
              typeof playerA.accPercent === "number"
                ? playerA.accPercent
                : undefined,
            accPercentB:
              typeof playerB.accPercent === "number"
                ? playerB.accPercent
                : undefined,
            playerAName: nextPlayerAName ?? "Player A",
            playerBName: nextPlayerBName ?? "Player B",
            playerACountry:
              typeof playerA.country === "string" ? playerA.country : null,
            playerBCountry:
              typeof playerB.country === "string" ? playerB.country : null,
            progress: Number(payload.progress ?? 0) || 0,
            totalBlocks: 40,
            isRunning: Boolean(payload.isRunning),
            inningsDetail: liveInningsDetail,
            current,
          },
        });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      socket.close();
    };
  }, [derivedClubDocumentId, eventLiveSessions]);

  useEffect(() => {
    const screenIds = Array.from(
      new Set(
        eventLiveSessions
          .map((session) =>
            String(
              session.screenId || session.screenIdentifier || "",
            ).trim(),
          )
          .filter((value) => value.length > 0),
      ),
    );

    const nextKey = screenIds.slice().sort().join("|");
    if (!nextKey) {
      screenSocketKeysRef.current = "";
      setWsLiveSessions([]);
      return;
    }
    screenSocketKeysRef.current = nextKey;

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );

    const sockets = screenIds.map((screenId) => {
      const params = new URLSearchParams();
      if (WS_TOKEN) params.set("token", WS_TOKEN);
      params.set("screenId", screenId);

      const socketUrl = new URL(wsUrl.toString());
      socketUrl.search = params.toString();

      const socket = new WebSocket(socketUrl.toString());
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(
            String(event.data || "{}"),
          ) as WsTournamentPayload;
          const baseSession =
            eventLiveSessions.find(
              (entry) =>
                String(
                  entry.screenId || entry.screenIdentifier || "",
                ).trim() === screenId,
            ) ?? null;

          if (
            (payload.type === "SESSION_ASSIGNED" ||
              payload.type === "SESSION_UPDATED") &&
            payload.session &&
            typeof payload.session === "object"
          ) {
            const sessionObj = payload.session;
            const rawLifecycleStatus = String(
              sessionObj.sessionStatus ??
                sessionObj.status ??
                payload.type ??
                "",
            ).trim();
            const lifecycleScreenId = String(
              payload.screenIdentifier ??
                payload.screenId ??
                sessionObj.screenIdentifier ??
                baseSession?.screenIdentifier ??
                baseSession?.screenId ??
                "",
            ).trim();
            if (lifecycleScreenId !== screenId) return;

            const lifecycleSessionId = String(
              sessionObj.documentId ??
                payload.sessionId ??
                sessionObj.id ??
                baseSession?.documentId ??
                baseSession?.sessionId ??
                screenId,
            ).trim();
            const lifecycleStatus =
              rawLifecycleStatus === "SESSION_ASSIGNED" ||
              rawLifecycleStatus === "SESSION_UPDATED"
                ? (baseSession?.sessionStatus ?? null)
                : rawLifecycleStatus || baseSession?.sessionStatus || null;
            const lifecycleIsRunning =
              lifecycleStatus === "in_progress" ||
              Boolean(baseSession?.state?.isRunning);

            if (
              payload.ended === true ||
              lifecycleStatus === "finished" ||
              lifecycleStatus === "cancelled"
            ) {
              setWsLiveSessions((prev) =>
                prev.filter((entry) => {
                  const entryScreenId = String(
                    entry.screenId || entry.screenIdentifier || "",
                  ).trim();
                  const entrySessionId = String(
                    entry.sessionId || entry.documentId || entry.id || "",
                  ).trim();
                  return (
                    entryScreenId !== lifecycleScreenId &&
                    entrySessionId !== lifecycleSessionId
                  );
                }),
              );
            return;
          }

          const lifecycleSnapshotKey =
            lifecycleSessionId || lifecycleScreenId || screenId;
          recordSnapshot(lifecycleSnapshotKey, {
            innings: Math.max(
              Number(sessionObj.player1_innings ?? baseSession?.state?.inningsA ?? 0) || 0,
              Number(sessionObj.player2_innings ?? baseSession?.state?.inningsB ?? 0) || 0,
              1,
            ),
            player1Points:
              Number(sessionObj.player1_points ?? baseSession?.state?.scoreA ?? 0) || 0,
            player2Points:
              Number(sessionObj.player2_points ?? baseSession?.state?.scoreB ?? 0) || 0,
          });
          const lifecycleFallbackDetail =
            sessionDetailsRef.current.get(lifecycleSnapshotKey) ??
            resolveFallbackInningsDetail(lifecycleSnapshotKey);
          if (lifecycleFallbackDetail?.length) {
            sessionDetailsRef.current.set(
              lifecycleSnapshotKey,
              lifecycleFallbackDetail,
            );
          }

          setWsLiveSessions((prev) => {
            const next = mergeLiveSessions(
                [
                  {
                    id: lifecycleSessionId || lifecycleScreenId || screenId,
                    documentId:
                      (typeof sessionObj.documentId === "string" &&
                      sessionObj.documentId.trim().length > 0
                        ? sessionObj.documentId.trim()
                        : null) ||
                      baseSession?.documentId ||
                      lifecycleSessionId ||
                      lifecycleScreenId ||
                      screenId,
                    sessionId:
                      lifecycleSessionId ||
                      baseSession?.sessionId ||
                      lifecycleScreenId ||
                      screenId,
                    screenId: lifecycleScreenId || screenId,
                    screenIdentifier:
                      lifecycleScreenId ||
                      baseSession?.screenIdentifier ||
                      screenId,
                    liveVideos: normalizeLiveVideoEntries(
                      sessionObj.liveVideos ??
                        sessionObj.live_videos ??
                        sessionObj.youtubeVideoId ??
                        sessionObj.videoId ??
                        baseSession?.liveVideos ??
                        baseSession?.state?.liveVideos,
                    ),
                    updatedAt: new Date().toISOString(),
                    clubId: baseSession?.clubId ?? derivedClubDocumentId ?? null,
                    clubName: baseSession?.clubName ?? null,
                    clubCity: baseSession?.clubCity ?? null,
                    clubFederationName:
                      baseSession?.clubFederationName ?? null,
                    eventId:
                      typeof sessionObj.eventId === "string"
                        ? sessionObj.eventId
                        : baseSession?.eventId ?? null,
                    eventStageId:
                      typeof sessionObj.eventStageId === "string"
                        ? sessionObj.eventStageId
                        : baseSession?.eventStageId ?? null,
                    groupNumber:
                      typeof sessionObj.groupNumber === "number"
                        ? sessionObj.groupNumber
                        : typeof sessionObj.groupNumber === "string"
                          ? Number(sessionObj.groupNumber)
                          : baseSession?.groupNumber ?? null,
                    player1DocumentId:
                      typeof sessionObj.player1DocumentId === "string"
                        ? sessionObj.player1DocumentId
                        : baseSession?.player1DocumentId ?? null,
                    player2DocumentId:
                      typeof sessionObj.player2DocumentId === "string"
                        ? sessionObj.player2DocumentId
                        : baseSession?.player2DocumentId ?? null,
                    player1Name:
                      resolveEventSessionPlayerName(
                        sessionObj,
                        "A",
                        baseSession?.player1Name ?? null,
                      ),
                    player2Name:
                      resolveEventSessionPlayerName(
                        sessionObj,
                        "B",
                        baseSession?.player2Name ?? null,
                      ),
                    sessionStatus: lifecycleStatus,
                    state: {
                      ...baseSession?.state,
                      scoreA:
                        Number(sessionObj.player1_points ?? baseSession?.state?.scoreA ?? 0) || 0,
                      scoreB:
                        Number(sessionObj.player2_points ?? baseSession?.state?.scoreB ?? 0) || 0,
                      inningsA:
                        Number(sessionObj.player1_innings ?? baseSession?.state?.inningsA ?? 0) || 0,
                      inningsB:
                        Number(sessionObj.player2_innings ?? baseSession?.state?.inningsB ?? 0) || 0,
                      inningsCount: Math.max(
                        Number(
                          sessionObj.player1_innings ??
                            baseSession?.state?.inningsA ??
                            0,
                        ) || 0,
                        Number(
                          sessionObj.player2_innings ??
                            baseSession?.state?.inningsB ??
                            0,
                        ) || 0,
                      ),
                      bestRunA:
                        Number(sessionObj.player1_high_run ?? baseSession?.state?.bestRunA ?? 0) || 0,
                      bestRunB:
                        Number(sessionObj.player2_high_run ?? baseSession?.state?.bestRunB ?? 0) || 0,
                      bestRun2A:
                        Number(sessionObj.player1_high_run_2 ?? baseSession?.state?.bestRun2A ?? 0) || 0,
                      bestRun2B:
                        Number(sessionObj.player2_high_run_2 ?? baseSession?.state?.bestRun2B ?? 0) || 0,
                      playerAName:
                        resolveEventSessionPlayerName(
                          sessionObj,
                          "A",
                          baseSession?.state?.playerAName ??
                            baseSession?.player1Name ??
                            "Player A",
                        ) ?? "Player A",
                      playerBName:
                        resolveEventSessionPlayerName(
                          sessionObj,
                          "B",
                          baseSession?.state?.playerBName ??
                            baseSession?.player2Name ??
                            "Player B",
                        ) ?? "Player B",
                      playerACountry:
                        typeof sessionObj.state?.playerACountry === "string"
                          ? sessionObj.state.playerACountry
                          : typeof sessionObj.player1Country === "string"
                          ? sessionObj.player1Country
                          : baseSession?.state?.playerACountry ?? null,
                      playerBCountry:
                        typeof sessionObj.state?.playerBCountry === "string"
                          ? sessionObj.state.playerBCountry
                          : typeof sessionObj.player2Country === "string"
                          ? sessionObj.player2Country
                          : baseSession?.state?.playerBCountry ?? null,
                      playerAPhotoUrl:
                        typeof sessionObj.state?.playerAPhotoUrl === "string"
                          ? sessionObj.state.playerAPhotoUrl
                          : typeof sessionObj.player1PhotoUrl === "string"
                          ? sessionObj.player1PhotoUrl
                          : shouldReusePlayerPhoto(
                              resolveEventSessionPlayerName(
                                sessionObj,
                                "A",
                                baseSession?.state?.playerAName ??
                                  baseSession?.player1Name ??
                                  null,
                              ),
                              baseSession?.state?.playerAName ??
                                baseSession?.player1Name ??
                                null,
                            )
                          ? baseSession?.state?.playerAPhotoUrl ?? null
                          : null,
                      playerAPhotoMainUrl:
                        typeof sessionObj.state?.playerAPhotoMainUrl === "string"
                          ? sessionObj.state.playerAPhotoMainUrl
                          : typeof sessionObj.player1PhotoMainUrl === "string"
                          ? sessionObj.player1PhotoMainUrl
                          : shouldReusePlayerPhoto(
                              resolveEventSessionPlayerName(
                                sessionObj,
                                "A",
                                baseSession?.state?.playerAName ??
                                  baseSession?.player1Name ??
                                  null,
                              ),
                              baseSession?.state?.playerAName ??
                                baseSession?.player1Name ??
                                null,
                            )
                          ? baseSession?.state?.playerAPhotoMainUrl ?? null
                          : null,
                      playerBPhotoUrl:
                        typeof sessionObj.state?.playerBPhotoUrl === "string"
                          ? sessionObj.state.playerBPhotoUrl
                          : typeof sessionObj.player2PhotoUrl === "string"
                          ? sessionObj.player2PhotoUrl
                          : shouldReusePlayerPhoto(
                              resolveEventSessionPlayerName(
                                sessionObj,
                                "B",
                                baseSession?.state?.playerBName ??
                                  baseSession?.player2Name ??
                                  null,
                              ),
                              baseSession?.state?.playerBName ??
                                baseSession?.player2Name ??
                                null,
                            )
                          ? baseSession?.state?.playerBPhotoUrl ?? null
                          : null,
                      playerBPhotoMainUrl:
                        typeof sessionObj.state?.playerBPhotoMainUrl === "string"
                          ? sessionObj.state.playerBPhotoMainUrl
                          : typeof sessionObj.player2PhotoMainUrl === "string"
                          ? sessionObj.player2PhotoMainUrl
                          : shouldReusePlayerPhoto(
                              resolveEventSessionPlayerName(
                                sessionObj,
                                "B",
                                baseSession?.state?.playerBName ??
                                  baseSession?.player2Name ??
                                  null,
                              ),
                              baseSession?.state?.playerBName ??
                                baseSession?.player2Name ??
                                null,
                            )
                          ? baseSession?.state?.playerBPhotoMainUrl ?? null
                          : null,
                      progress:
                        Number(sessionObj.progress ?? baseSession?.state?.progress ?? 0) || 0,
                      totalBlocks:
                        Number(sessionObj.totalBlocks ?? baseSession?.state?.totalBlocks ?? 40) || 40,
                      isRunning: lifecycleIsRunning,
                      timeoutsA:
                        Number(
                          sessionObj.player1_timeouts_used ??
                            sessionObj.timeoutsA ??
                            baseSession?.state?.timeoutsA ??
                            0,
                        ) || 0,
                      timeoutsB:
                        Number(
                          sessionObj.player2_timeouts_used ??
                            sessionObj.timeoutsB ??
                            baseSession?.state?.timeoutsB ??
                            0,
                        ) || 0,
                      maxTimeoutsA:
                        Number(
                          sessionObj.player1_max_timeouts ??
                            sessionObj.maxTimeoutsA ??
                            baseSession?.state?.maxTimeoutsA ??
                            3,
                        ) || 3,
                      maxTimeoutsB:
                        Number(
                          sessionObj.player2_max_timeouts ??
                            sessionObj.maxTimeoutsB ??
                            baseSession?.state?.maxTimeoutsB ??
                            3,
                        ) || 3,
                      avgFormattedA:
                        typeof sessionObj.player1_avg_formatted === "string"
                          ? sessionObj.player1_avg_formatted
                          : typeof sessionObj.player1AvgFormatted === "string"
                            ? sessionObj.player1AvgFormatted
                            : baseSession?.state?.avgFormattedA,
                      avgFormattedB:
                        typeof sessionObj.player2_avg_formatted === "string"
                          ? sessionObj.player2_avg_formatted
                          : typeof sessionObj.player2AvgFormatted === "string"
                            ? sessionObj.player2AvgFormatted
                            : baseSession?.state?.avgFormattedB,
                      accPercentA:
                        typeof sessionObj.player1_acc_percent === "number"
                          ? sessionObj.player1_acc_percent
                          : typeof sessionObj.player1AccPercent === "number"
                            ? sessionObj.player1AccPercent
                            : baseSession?.state?.accPercentA,
                      accPercentB:
                        typeof sessionObj.player2_acc_percent === "number"
                          ? sessionObj.player2_acc_percent
                          : typeof sessionObj.player2AccPercent === "number"
                            ? sessionObj.player2AccPercent
                            : baseSession?.state?.accPercentB,
                      playerATimeSeconds:
                        typeof sessionObj.player1_time_seconds === "number"
                          ? sessionObj.player1_time_seconds
                          : typeof sessionObj.player1TimeSeconds === "number"
                            ? sessionObj.player1TimeSeconds
                            : baseSession?.state?.playerATimeSeconds,
                      playerBTimeSeconds:
                        typeof sessionObj.player2_time_seconds === "number"
                          ? sessionObj.player2_time_seconds
                          : typeof sessionObj.player2TimeSeconds === "number"
                            ? sessionObj.player2TimeSeconds
                            : baseSession?.state?.playerBTimeSeconds,
                      secondsPerInningA:
                        typeof sessionObj.player1_seconds_per_inning === "number"
                          ? sessionObj.player1_seconds_per_inning
                          : typeof sessionObj.player1SecondsPerInning === "number"
                            ? sessionObj.player1SecondsPerInning
                            : baseSession?.state?.secondsPerInningA,
                      secondsPerInningB:
                        typeof sessionObj.player2_seconds_per_inning === "number"
                          ? sessionObj.player2_seconds_per_inning
                          : typeof sessionObj.player2SecondsPerInning === "number"
                            ? sessionObj.player2SecondsPerInning
                            : baseSession?.state?.secondsPerInningB,
                      targetPointsA:
                        typeof sessionObj.targetPointsP1 === "number"
                          ? sessionObj.targetPointsP1
                          : typeof sessionObj.target_points_p1 === "number"
                            ? sessionObj.target_points_p1
                            : typeof sessionObj.targetPoints === "number"
                              ? sessionObj.targetPoints
                              : typeof sessionObj.target_points === "number"
                                ? sessionObj.target_points
                            : baseSession?.state?.targetPointsA ?? null,
                      targetPointsB:
                        typeof sessionObj.targetPointsP2 === "number"
                          ? sessionObj.targetPointsP2
                          : typeof sessionObj.target_points_p2 === "number"
                            ? sessionObj.target_points_p2
                            : typeof sessionObj.targetPoints === "number"
                              ? sessionObj.targetPoints
                              : typeof sessionObj.target_points === "number"
                                ? sessionObj.target_points
                            : baseSession?.state?.targetPointsB ?? null,
                      gameDurationSeconds:
                        typeof sessionObj.gameDurationSeconds === "number"
                          ? sessionObj.gameDurationSeconds
                          : baseSession?.state?.gameDurationSeconds,
                      inningsDetail:
                        baseSession?.state?.inningsDetail ??
                        lifecycleFallbackDetail,
                      tournamentName:
                        typeof sessionObj.eventTitle === "string"
                          ? sessionObj.eventTitle
                          : baseSession?.state?.tournamentName ?? null,
                      stageName:
                        typeof sessionObj.stageTitle === "string"
                          ? sessionObj.stageTitle
                          : baseSession?.state?.stageName ?? null,
                      groupName:
                        typeof sessionObj.groupLabel === "string"
                          ? sessionObj.groupLabel
                          : baseSession?.state?.groupName ?? null,
                      tableName:
                        typeof sessionObj.tableNumber === "string"
                          ? sessionObj.tableNumber
                          : baseSession?.state?.tableName ?? null,
                    },
                  },
                ],
                prev,
              );

              return next.sort((a, b) =>
                (b.updatedAt || "").localeCompare(a.updatedAt || ""),
              );
            });
            return;
          }

          if (payload.type !== "score:update") return;
          if (String(payload.screenId || "").trim() !== screenId) return;
          if (payload.ended === true) {
            setWsLiveSessions((prev) =>
              prev.filter((entry) => {
                const entryScreenId = String(
                  entry.screenId || entry.screenIdentifier || "",
                ).trim();
                const entrySessionId = String(
                  entry.sessionId || entry.documentId || entry.id || "",
                ).trim();
                const payloadSessionId = String(payload.sessionId || "").trim();
                return (
                  entryScreenId !== screenId &&
                  entrySessionId !== payloadSessionId
                );
              }),
            );
            return;
          }

          const players = Array.isArray(payload.players) ? payload.players : [];
          const playerA = players[0] ?? {};
          const playerB = players[1] ?? {};
          const scoreUpdateIsRunning =
            Boolean(payload.isRunning) ||
            baseSession?.sessionStatus === "in_progress" ||
            Boolean(baseSession?.state?.isRunning);
          const sessionId = String(
            payload.sessionId ??
              baseSession?.sessionId ??
              baseSession?.documentId ??
              screenId,
          ).trim();
          const current: "A" | "B" | undefined =
            payload.current ??
            (payload.activePlayer === 1
              ? "A"
              : payload.activePlayer === 2
                ? "B"
                : undefined);

          const scoreUpdateSnapshotKey = sessionId || screenId;
          recordSnapshot(scoreUpdateSnapshotKey, {
            innings: Math.max(
              Number(playerA.innings ?? 0) || 0,
              Number(playerB.innings ?? 0) || 0,
              1,
            ),
            player1Points: Number(playerA.points ?? 0) || 0,
            player2Points: Number(playerB.points ?? 0) || 0,
          });
          const scoreUpdateFallbackDetail =
            sessionDetailsRef.current.get(scoreUpdateSnapshotKey) ??
            resolveFallbackInningsDetail(scoreUpdateSnapshotKey);
          if (scoreUpdateFallbackDetail?.length) {
            sessionDetailsRef.current.set(
              scoreUpdateSnapshotKey,
              scoreUpdateFallbackDetail,
            );
          }
          const scoreUpdateDetail =
            (Array.isArray(payload.inningsDetail)
              ? (payload.inningsDetail as InningDetailEntry[])
              : undefined) ??
            scoreUpdateFallbackDetail;

          setWsLiveSessions((prev) => {
            const next = mergeLiveSessions(
              [
                {
                  id: sessionId || screenId,
                  documentId:
                    baseSession?.documentId || sessionId || screenId,
                  sessionId:
                    baseSession?.sessionId || sessionId || screenId,
                  screenId,
                  screenIdentifier:
                    baseSession?.screenIdentifier || screenId,
                  liveVideos: normalizeLiveVideoEntries(
                    payload.session?.liveVideos ??
                      payload.session?.live_videos ??
                      payload.session?.youtubeVideoId ??
                      payload.session?.videoId ??
                      baseSession?.liveVideos ??
                      baseSession?.state?.liveVideos,
                  ),
                  updatedAt:
                    typeof payload.ts === "number" &&
                    Number.isFinite(payload.ts)
                      ? new Date(payload.ts).toISOString()
                      : new Date().toISOString(),
                  clubId: baseSession?.clubId ?? derivedClubDocumentId ?? null,
                  clubName: baseSession?.clubName ?? null,
                  clubCity: baseSession?.clubCity ?? null,
                  clubFederationName:
                    baseSession?.clubFederationName ?? null,
                  eventId: baseSession?.eventId ?? null,
                  eventStageId: baseSession?.eventStageId ?? null,
                  groupNumber: baseSession?.groupNumber ?? null,
                  player1DocumentId: baseSession?.player1DocumentId ?? null,
                  player2DocumentId: baseSession?.player2DocumentId ?? null,
                  player1Name: baseSession?.player1Name ?? null,
                  player2Name: baseSession?.player2Name ?? null,
                  sessionStatus: scoreUpdateIsRunning
                    ? "in_progress"
                    : (baseSession?.sessionStatus ?? "pending"),
                  state: {
                    ...baseSession?.state,
                    scoreA: Number(playerA.points ?? 0) || 0,
                    scoreB: Number(playerB.points ?? 0) || 0,
                    runA: Number(playerA.run ?? 0) || 0,
                    runB: Number(playerB.run ?? 0) || 0,
                    liveRunA:
                      Number(playerA.liveRun ?? playerA.run ?? 0) || 0,
                    liveRunB:
                      Number(playerB.liveRun ?? playerB.run ?? 0) || 0,
                    inningsA: Number(playerA.innings ?? 0) || 0,
                    inningsB: Number(playerB.innings ?? 0) || 0,
                    inningsCount: Math.max(
                      Number(playerA.innings ?? 0) || 0,
                      Number(playerB.innings ?? 0) || 0,
                    ),
                    bestRunA: Number(playerA.hr ?? 0) || 0,
                    bestRunB: Number(playerB.hr ?? 0) || 0,
                    bestRun2A:
                      Number(
                        playerA.hr2 ??
                          deriveSecondHighRunFromInnings(scoreUpdateDetail, "A") ??
                          0,
                      ) || 0,
                    bestRun2B:
                      Number(
                        playerB.hr2 ??
                          deriveSecondHighRunFromInnings(scoreUpdateDetail, "B") ??
                          0,
                      ) || 0,
                    avgFormattedA:
                      typeof playerA.avgFormatted === "string"
                        ? playerA.avgFormatted
                        : baseSession?.state?.avgFormattedA,
                    avgFormattedB:
                      typeof playerB.avgFormatted === "string"
                        ? playerB.avgFormatted
                        : baseSession?.state?.avgFormattedB,
                    accPercentA:
                      typeof playerA.accPercent === "number"
                        ? playerA.accPercent
                        : baseSession?.state?.accPercentA,
                    accPercentB:
                      typeof playerB.accPercent === "number"
                        ? playerB.accPercent
                        : baseSession?.state?.accPercentB,
                    playerATimeSeconds:
                      typeof playerA.playerTimeSeconds === "number"
                        ? playerA.playerTimeSeconds
                        : baseSession?.state?.playerATimeSeconds,
                    playerBTimeSeconds:
                      typeof playerB.playerTimeSeconds === "number"
                        ? playerB.playerTimeSeconds
                        : baseSession?.state?.playerBTimeSeconds,
                    secondsPerInningA:
                      typeof playerA.secondsPerInning === "number"
                        ? playerA.secondsPerInning
                        : baseSession?.state?.secondsPerInningA,
                    secondsPerInningB:
                      typeof playerB.secondsPerInning === "number"
                        ? playerB.secondsPerInning
                        : baseSession?.state?.secondsPerInningB,
                    playerAName:
                      typeof playerA.name === "string" &&
                      !isPlaceholderPlayerName(playerA.name)
                        ? playerA.name
                        : baseSession?.state?.playerAName ??
                          baseSession?.player1Name ??
                          "Player A",
                    playerBName:
                      typeof playerB.name === "string" &&
                      !isPlaceholderPlayerName(playerB.name)
                        ? playerB.name
                        : baseSession?.state?.playerBName ??
                          baseSession?.player2Name ??
                          "Player B",
                    playerACountry:
                      typeof playerA.country === "string"
                        ? playerA.country
                        : baseSession?.state?.playerACountry ??
                          null,
                    playerBCountry:
                      typeof playerB.country === "string"
                        ? playerB.country
                        : baseSession?.state?.playerBCountry ??
                          null,
                    playerAPhotoUrl:
                      typeof playerA.photoUrl === "string"
                        ? playerA.photoUrl
                        : typeof playerA.photo === "string"
                          ? playerA.photo
                          : typeof playerA.avatarUrl === "string"
                            ? playerA.avatarUrl
                            : typeof playerA.imageUrl === "string"
                              ? playerA.imageUrl
                              : baseSession?.state?.playerAPhotoUrl ?? null,
                    playerBPhotoUrl:
                      typeof playerB.photoUrl === "string"
                        ? playerB.photoUrl
                        : typeof playerB.photo === "string"
                          ? playerB.photo
                          : typeof playerB.avatarUrl === "string"
                            ? playerB.avatarUrl
                            : typeof playerB.imageUrl === "string"
                              ? playerB.imageUrl
                              : baseSession?.state?.playerBPhotoUrl ?? null,
                    playerAPhotoMainUrl:
                      typeof playerA.photoMainUrl === "string"
                        ? playerA.photoMainUrl
                        : typeof playerA.photo_main === "string"
                          ? playerA.photo_main
                          : baseSession?.state?.playerAPhotoMainUrl ?? null,
                    playerBPhotoMainUrl:
                      typeof playerB.photoMainUrl === "string"
                        ? playerB.photoMainUrl
                        : typeof playerB.photo_main === "string"
                          ? playerB.photo_main
                          : baseSession?.state?.playerBPhotoMainUrl ?? null,
                    progress: Number(payload.progress ?? 0) || 0,
                    totalBlocks:
                      Number(payload.totalBlocks ?? baseSession?.state?.totalBlocks ?? 40) || 40,
                    isRunning: scoreUpdateIsRunning,
                    timeoutsA:
                      Number(
                        playerA.timeoutsUsed ??
                          playerA.timeouts ??
                          baseSession?.state?.timeoutsA ??
                          0,
                      ) || 0,
                    timeoutsB:
                      Number(
                        playerB.timeoutsUsed ??
                          playerB.timeouts ??
                          baseSession?.state?.timeoutsB ??
                          0,
                      ) || 0,
                    maxTimeoutsA:
                      Number(
                        playerA.maxTimeouts ??
                          baseSession?.state?.maxTimeoutsA ??
                          3,
                      ) || 3,
                    maxTimeoutsB:
                      Number(
                        playerB.maxTimeouts ??
                          baseSession?.state?.maxTimeoutsB ??
                          3,
                      ) || 3,
                    targetPointsA:
                      typeof playerA.targetPoints === "number"
                        ? playerA.targetPoints
                        : typeof playerA.target_points === "number"
                          ? playerA.target_points
                          : typeof payload.targetPointsP1 === "number"
                            ? payload.targetPointsP1
                            : typeof payload.targetPoints === "number"
                              ? payload.targetPoints
                              : baseSession?.state?.targetPointsA ?? null,
                    targetPointsB:
                      typeof playerB.targetPoints === "number"
                        ? playerB.targetPoints
                        : typeof playerB.target_points === "number"
                          ? playerB.target_points
                          : typeof payload.targetPointsP2 === "number"
                            ? payload.targetPointsP2
                            : typeof payload.targetPoints === "number"
                              ? payload.targetPoints
                              : baseSession?.state?.targetPointsB ?? null,
                    gameDurationSeconds:
                      typeof payload.gameDurationSeconds === "number"
                        ? payload.gameDurationSeconds
                        : baseSession?.state?.gameDurationSeconds,
                    inningsDetail:
                      scoreUpdateDetail ??
                      baseSession?.state?.inningsDetail,
                    current,
                  },
                },
              ],
              prev,
            );

            return next.sort((a, b) =>
              (b.updatedAt || "").localeCompare(a.updatedAt || ""),
            );
          });
        } catch {
          // ignore malformed payloads
        }
      };

      return socket;
    });

    return () => {
      sockets.forEach((socket) => socket.close());
    };
  }, [derivedClubDocumentId, eventLiveSessions]);

  useEffect(() => {
    if (activeView !== "live" || !highlightedLiveSessionId) return;
    const target = document.getElementById(
      `tournament-live-session-${highlightedLiveSessionId}`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeView, highlightedLiveSessionId, eventLiveSessions]);

  const tournamentLiveScreens = useMemo(
    () =>
      liveScreensData
        .filter((item) => item.tournamentId === summary.documentId)
        .flatMap((item) => item.liveScreens ?? []),
    [liveScreensData, summary.documentId],
  );
  const activeLiveScreens = useMemo(
    () => tournamentLiveScreens.filter((screen) => screen.isActive),
    [tournamentLiveScreens],
  );
  const allowedEventPairKeys = useMemo(() => {
    const keys = new Set<string>();
    const stagesArray = toRelationArray(eventData?.data?.event_stages);

    stagesArray.forEach((stage, index) => {
      const normalizedStage = normalizeEntity<any>(stage, `live-stage-${index}`);
      const groupsRaw = toRelationArray(normalizedStage.groups);
      const normalizedGroups = groupsRaw.map((group, groupIndex) =>
        normalizeGroup(group, `${normalizedStage.id}-live-group-${groupIndex}`),
      );

      buildStageMatchGroups(normalizedGroups).forEach((group) => {
        group.matches.forEach((match) => {
          const documentPairKey = buildPairKey(
            match.top.player.documentId,
            match.bottom.player.documentId,
          );
          if (documentPairKey) keys.add(`doc:${documentPairKey}`);

          const namePairKey = buildPairKey(
            normalizeNameForMatch(
              match.top.player.nativeName ?? match.top.player.name,
            ),
            normalizeNameForMatch(
              match.bottom.player.nativeName ?? match.bottom.player.name,
            ),
          );
          if (namePairKey) keys.add(`name:${namePairKey}`);
        });
      });
    });

    return keys;
  }, [eventData]);
  const allowedEventSessionKeys = useMemo(() => {
    const keys = new Set<string>();
    eventLiveSessions.forEach((session) => {
      [
        session.documentId,
        session.sessionId,
        session.id,
        session.screenId,
        session.screenIdentifier,
      ]
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
        .forEach((value) => keys.add(value));
    });
    return keys;
  }, [eventLiveSessions]);
  const filteredWsLiveSessions = useMemo(() => {
    if (eventLiveSessions.length === 0 || allowedEventSessionKeys.size === 0) {
      return [];
    }
    return wsLiveSessions.filter((session) =>
      [
        session.documentId,
        session.sessionId,
        session.id,
        session.screenId,
        session.screenIdentifier,
      ]
        .map((value) => String(value || "").trim())
        .some((value) => value.length > 0 && allowedEventSessionKeys.has(value)),
    );
  }, [allowedEventSessionKeys, eventLiveSessions.length, wsLiveSessions]);
  const filteredEventLiveSessions = useMemo(() => {
    if (allowedEventPairKeys.size === 0) return eventLiveSessions;
    return eventLiveSessions.filter((session) =>
      Array.from(buildSessionPairKeys(session)).some((key) =>
        allowedEventPairKeys.has(key),
      ),
    );
  }, [allowedEventPairKeys, eventLiveSessions]);
  const filteredWsLiveSessionsByPair = useMemo(() => {
    if (allowedEventPairKeys.size === 0) return filteredWsLiveSessions;
    return filteredWsLiveSessions.filter((session) =>
      Array.from(buildSessionPairKeys(session)).some((key) =>
        allowedEventPairKeys.has(key),
      ),
    );
  }, [allowedEventPairKeys, filteredWsLiveSessions]);
  const mergedEventLiveSessions = useMemo(
    () =>
      mergeLiveSessions(
        filteredWsLiveSessionsByPair,
        filteredEventLiveSessions,
      ),
    [filteredEventLiveSessions, filteredWsLiveSessionsByPair],
  );
  const apiPhotoFallbackBySessionId = useMemo(() => {
    const map = new Map<
      string,
      {
        playerAName: string | null;
        playerBName: string | null;
        playerAPhotoUrl: string | null;
        playerAPhotoMainUrl: string | null;
        playerBPhotoUrl: string | null;
        playerBPhotoMainUrl: string | null;
      }
    >();
    eventLiveSessions.forEach((session) => {
      const key = String(
        session.sessionId ||
          session.documentId ||
          session.screenIdentifier ||
          session.screenId ||
          session.id ||
          "",
      ).trim();
      if (!key) return;
      map.set(key, {
        playerAName:
          typeof session.state?.playerAName === "string"
            ? session.state.playerAName
            : session.player1Name ?? null,
        playerBName:
          typeof session.state?.playerBName === "string"
            ? session.state.playerBName
            : session.player2Name ?? null,
        playerAPhotoUrl: session.state?.playerAPhotoUrl ?? null,
        playerAPhotoMainUrl: session.state?.playerAPhotoMainUrl ?? null,
        playerBPhotoUrl: session.state?.playerBPhotoUrl ?? null,
        playerBPhotoMainUrl: session.state?.playerBPhotoMainUrl ?? null,
      });
    });
    return map;
  }, [eventLiveSessions]);

  const resolveSessionMatchedPhotoValue = useCallback(
    (
      preferred: string | null | undefined,
      fallback: string | null | undefined,
      currentPlayerName: string | null | undefined,
      fallbackPlayerName: string | null | undefined,
    ) => {
      if (typeof preferred === "string" && preferred.trim()) {
        return resolvePreferredPhotoValue(preferred);
      }
      if (
        normalizeNameForMatch(currentPlayerName) &&
        normalizeNameForMatch(currentPlayerName) ===
          normalizeNameForMatch(fallbackPlayerName)
      ) {
        return resolvePreferredPhotoValue(fallback);
      }
      return null;
    },
    [],
  );

  const buildHighlightItem = useCallback(
    (session: {
      id?: string | number | null;
      sessionId?: string | null;
      documentId?: string | null;
      screenId?: string | null;
      screenIdentifier?: string | null;
      updatedAt?: string | null;
      clubId?: string | number | null;
      clubName?: string | null;
      clubCity?: string | null;
      clubFederationName?: string | null;
      state?: Record<string, any> | null;
    }): LiveScoreItem => {
      const key = String(
        session.sessionId ||
          session.documentId ||
          session.screenIdentifier ||
          session.screenId ||
          session.id ||
          "",
      ).trim();
      const photoFallback = key
        ? apiPhotoFallbackBySessionId.get(key) ?? null
        : null;
      const state = (session.state ?? {}) as Record<string, any>;

      return {
        id: session.id ?? key,
        sessionId: String(session.sessionId ?? key),
        screenId: session.screenId ?? undefined,
        updatedAt: session.updatedAt ?? undefined,
        clubId: session.clubId ?? undefined,
        clubName: session.clubName ?? undefined,
        clubCity: session.clubCity ?? undefined,
        clubFederationName: session.clubFederationName ?? undefined,
        state: {
          ...state,
          playerAPhotoUrl: resolveSessionMatchedPhotoValue(
            state.playerAPhotoUrl,
            photoFallback?.playerAPhotoUrl,
            state.playerAName,
            photoFallback?.playerAName,
          ),
          playerAPhotoMainUrl: resolveSessionMatchedPhotoValue(
            state.playerAPhotoMainUrl,
            photoFallback?.playerAPhotoMainUrl,
            state.playerAName,
            photoFallback?.playerAName,
          ),
          playerBPhotoUrl: resolveSessionMatchedPhotoValue(
            state.playerBPhotoUrl,
            photoFallback?.playerBPhotoUrl,
            state.playerBName,
            photoFallback?.playerBName,
          ),
          playerBPhotoMainUrl: resolveSessionMatchedPhotoValue(
            state.playerBPhotoMainUrl,
            photoFallback?.playerBPhotoMainUrl,
            state.playerBName,
            photoFallback?.playerBName,
          ),
        } as any,
      };
    },
    [apiPhotoFallbackBySessionId, resolveSessionMatchedPhotoValue],
  );

  const getHighlightItemSignature = useCallback((item: LiveScoreItem | null) => {
    if (!item) return null;
    const state = (item.state ?? {}) as Record<string, any>;
    return JSON.stringify({
      sessionId: item.sessionId ?? null,
      screenId: item.screenId ?? null,
      updatedAt: item.updatedAt ?? null,
      scoreA: state.scoreA ?? null,
      scoreB: state.scoreB ?? null,
      runA: state.runA ?? null,
      runB: state.runB ?? null,
      liveRunA: state.liveRunA ?? null,
      liveRunB: state.liveRunB ?? null,
      inningsA: state.inningsA ?? null,
      inningsB: state.inningsB ?? null,
      inningsCount: state.inningsCount ?? null,
      current: state.current ?? null,
      playerAPhotoUrl: state.playerAPhotoUrl ?? null,
      playerAPhotoMainUrl: state.playerAPhotoMainUrl ?? null,
      playerBPhotoUrl: state.playerBPhotoUrl ?? null,
      playerBPhotoMainUrl: state.playerBPhotoMainUrl ?? null,
      bestRunA: state.bestRunA ?? null,
      bestRunB: state.bestRunB ?? null,
      avgFormattedA: state.avgFormattedA ?? null,
      avgFormattedB: state.avgFormattedB ?? null,
      accPercentA: state.accPercentA ?? null,
      accPercentB: state.accPercentB ?? null,
      secondsPerInningA: state.secondsPerInningA ?? null,
      secondsPerInningB: state.secondsPerInningB ?? null,
      playerATimeSeconds: state.playerATimeSeconds ?? null,
      playerBTimeSeconds: state.playerBTimeSeconds ?? null,
      targetPointsA: state.targetPointsA ?? null,
      targetPointsB: state.targetPointsB ?? null,
      gameDurationSeconds: state.gameDurationSeconds ?? null,
    });
  }, []);

  const eventStages = useMemo<NormalizedEventStage[]>(() => {
    if (!eventData?.data?.event_stages) return [];

    const stagesArray = toRelationArray(eventData.data.event_stages);

    return stagesArray
      .map((stage, index) => {
        const normalizedStage = normalizeEntity<any>(stage, `stage-${index}`);
        const groupsRaw = toRelationArray(normalizedStage.groups);
        const resultsRaw = toRelationArray(normalizedStage.results);

        return {
          id: normalizedStage.id,
          documentId: normalizedStage.documentId,
          title:
            typeof normalizedStage.title === "string"
              ? normalizedStage.title.trim()
              : "",
          startDate:
            typeof normalizedStage.start_date === "string"
              ? normalizedStage.start_date
              : null,
          endDate:
            typeof normalizedStage.end_date === "string"
              ? normalizedStage.end_date
              : null,
          order: toNumber(normalizedStage.order),
          isFinal: Boolean(normalizedStage.is_final),
          stageType:
            typeof normalizedStage.stage_type === "string"
              ? normalizedStage.stage_type.trim()
              : null,
          groups: groupsRaw
            .map((group, groupIndex) =>
              normalizeGroup(
                group,
                `${normalizedStage.id}-group-${groupIndex}`,
              ),
            )
            .sort((a, b) => {
              if (a.number !== null && b.number !== null)
                return a.number - b.number;
              if (a.number !== null) return -1;
              if (b.number !== null) return 1;
              return a.id.localeCompare(b.id);
            }),
          results: resultsRaw.map((result, resultIndex) =>
            normalizeResult(
              result,
              `${normalizedStage.id}-result-${resultIndex}`,
            ),
          ),
        } satisfies NormalizedEventStage;
      })
      .sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const timetableTrainingPlayers = useMemo(() => {
    const byId = new Map<string, { name: string; country: string | null }>();
    eventStages.forEach((stage) => {
      stage.groups.forEach((group) => {
        [group.player1, group.player2].forEach((player) => {
          if (!player.documentId || !player.name) return;
          byId.set(player.documentId, {
            name: player.name,
            country: player.country,
          });
        });
      });
    });
    const players = [...byId.values()];
    return {
      list: players,
      resolve(label: string | null) {
        const query = normalizeLookupText(label);
        if (!query) return null;
        return (
          players.find((player) => {
            const full = normalizeLookupText(player.name);
            return (
              full === query ||
              full.includes(query) ||
              query.includes(full) ||
              full.split(" ").some((part) => part === query)
            );
          }) ?? null
        );
      },
    };
  }, [eventStages]);

  const timetableSlots = useMemo<NormalizedTimetableSlot[]>(() => {
    if (!eventData?.data?.timetable_slots) return [];

    return toRelationArray(eventData.data.timetable_slots)
      .map((slot, index) => {
        const normalized = normalizeEntity<any>(slot, `slot-${index}`);
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
          player1 &&
          typeof (player1 as Record<string, unknown>).country === "string"
            ? ((player1 as Record<string, unknown>).country as string)
            : normalized.metadata &&
                typeof normalized.metadata === "object" &&
                typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer1Country === "string"
              ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer1Country as string)
            : null;
        const player2Country =
          player2 &&
          typeof (player2 as Record<string, unknown>).country === "string"
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
        const resolvedTrainingPlayer =
          normalized.slot_type === "training"
            ? timetableTrainingPlayers.resolve(
                trainingPlayerName ||
                  (typeof normalized.subtitle === "string" ? normalized.subtitle : "") ||
                  (typeof normalized.title === "string" ? normalized.title : ""),
              )
            : null;

        return {
          id: normalized.id,
          documentId: normalized.documentId,
          slotType:
            typeof normalized.slot_type === "string" && normalized.slot_type.trim()
              ? normalized.slot_type
              : "match",
          title: typeof normalized.title === "string" ? normalized.title : "",
          subtitle:
            typeof normalized.subtitle === "string" ? normalized.subtitle : "",
          description:
            typeof normalized.description === "string"
              ? normalized.description
              : "",
          date: typeof normalized.date === "string" ? normalized.date : "",
          time: typeof normalized.time === "string" ? normalized.time : "",
          dateTime:
            typeof normalized.date_time === "string"
              ? normalized.date_time
              : null,
          tableLabel:
            typeof normalized.table_label === "string"
              ? normalized.table_label
              : "",
          tableOrder: toNumber(normalized.table_order),
          slotOrder: toNumber(normalized.slot_order),
          slotStatus:
            typeof normalized.slot_status === "string" && normalized.slot_status.trim()
              ? normalized.slot_status
              : "scheduled",
          isVisible: normalized.is_visible !== false,
          isPublished: normalized.is_published === true,
          source:
            typeof normalized.source === "string" ? normalized.source : "",
          metadata:
            normalized.metadata && typeof normalized.metadata === "object"
              ? (normalized.metadata as Record<string, unknown>)
              : null,
          customStageLabel:
            normalized.metadata &&
            typeof normalized.metadata === "object" &&
            typeof (normalized.metadata as Record<string, unknown>).customStageLabel === "string"
              ? ((normalized.metadata as Record<string, unknown>).customStageLabel as string).trim() || null
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
          trainingPlayerName:
            trainingPlayerName || resolvedTrainingPlayer?.name || null,
          trainingPlayerCountry:
            trainingPlayerCountry || resolvedTrainingPlayer?.country || null,
          matchPlayer1Name: player1Name || null,
          matchPlayer2Name: player2Name || null,
          matchPlayer1Country:
            player1Country,
          matchPlayer2Country:
            player2Country,
          matchDocumentId: match?.documentId ?? null,
        } satisfies NormalizedTimetableSlot;
      })
      .filter((slot) => slot.isVisible)
      .sort((a, b) => {
        const aHasCalendarInfo = Boolean(a.dateTime || a.date || a.time);
        const bHasCalendarInfo = Boolean(b.dateTime || b.date || b.time);
        if (aHasCalendarInfo !== bHasCalendarInfo) {
          return aHasCalendarInfo ? -1 : 1;
        }
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
        if (a.matchNumber !== null && b.matchNumber !== null && a.matchNumber !== b.matchNumber) {
          return a.matchNumber - b.matchNumber;
        }
        if (a.matchNumber !== null) return -1;
        if (b.matchNumber !== null) return 1;
        if (
          a.slotOrder !== null &&
          b.slotOrder !== null &&
          a.slotOrder !== b.slotOrder
        ) {
          return a.slotOrder - b.slotOrder;
        }
        if (a.slotOrder !== null) return -1;
        if (b.slotOrder !== null) return 1;
        if (
          a.tableOrder !== null &&
          b.tableOrder !== null &&
          a.tableOrder !== b.tableOrder
        ) {
          return a.tableOrder - b.tableOrder;
        }
        if (a.tableOrder !== null) return -1;
        if (b.tableOrder !== null) return 1;
        if (sortTableLabel(a.tableLabel) !== sortTableLabel(b.tableLabel)) {
          return sortTableLabel(a.tableLabel).localeCompare(
            sortTableLabel(b.tableLabel),
          );
        }
        return a.id.localeCompare(b.id);
      });
  }, [eventData, timetableTrainingPlayers]);

  const isYouthTournament = useMemo(() => {
    const normalizedCategory = String(summary.category || "").trim().toLowerCase();
    return normalizedCategory === "youth" || normalizedCategory.includes("youth");
  }, [summary.category]);

  const seriesLeaderboardByPlayerId = useMemo(() => {
    const next = new Map<
      string,
      {
        rank: number | null;
        totalPoints: number;
      }
    >();

    (initialSeriesData?.leaderboard ?? []).forEach((row) => {
      const playerDocumentId = String(row.playerDocumentId || "").trim();
      if (!playerDocumentId) return;
      next.set(playerDocumentId, {
        rank: typeof row.rank === "number" && Number.isFinite(row.rank) ? row.rank : null,
        totalPoints:
          typeof row.totalPoints === "number" && Number.isFinite(row.totalPoints)
            ? row.totalPoints
            : 0,
      });
    });

    return next;
  }, [initialSeriesData]);

  const isSeriesTournament = Boolean(summary.rankingSeriesSlug);

  useEffect(() => {
    if (!isYouthTournament && participantSortMode === "age") {
      setParticipantSortMode("registration");
    }
    if (!isSeriesTournament && participantSortMode === "ranking") {
      setParticipantSortMode("registration");
    }
  }, [isSeriesTournament, isYouthTournament, participantSortMode]);

  const tournamentParticipants = useMemo<TournamentParticipantRow[]>(() => {
    if (eventData?.data?.players) {
      return toRelationArray(eventData.data.players).map((player, index) => {
        const normalized = normalizeEntity<{
          full_name?: unknown;
          full_name_en?: unknown;
          country?: unknown;
          status?: unknown;
          birth_date?: unknown;
        }>(player, `participant-${index + 1}`);

        const name =
          typeof normalized.full_name_en === "string" && normalized.full_name_en.trim()
            ? normalized.full_name_en.trim()
            : typeof normalized.full_name === "string" && normalized.full_name.trim()
              ? normalized.full_name.trim()
              : `Player ${index + 1}`;

        const country =
          typeof normalized.country === "string" && normalized.country.trim()
            ? normalized.country.trim()
            : null;

        return {
          id: normalized.id,
          documentId: normalized.documentId ?? null,
          name,
          country,
          status: formatParticipantStatus(normalized.status),
          birthDate: normalizeDateOnly(normalized.birth_date),
          registrationOrder: index,
          seriesRank: null,
          seriesTotalPoints: 0,
        };
      });
    }

    const uniquePlayers = new Map<string, TournamentParticipantRow>();
    const stages = toRelationArray(eventData?.data?.event_stages);

    stages.forEach((stage, stageIndex) => {
      const normalizedStage = normalizeEntity<{ groups?: unknown }>(
        stage,
        `participant-stage-${stageIndex + 1}`,
      );
      const groups = toRelationArray(normalizedStage.groups);
      groups.forEach((group, groupIndex) => {
        const normalizedGroup = normalizeEntity<{ player1?: unknown; player2?: unknown }>(
          group,
          `participant-group-${groupIndex + 1}`,
        );
        [normalizedGroup.player1, normalizedGroup.player2].forEach((player, playerIndex) => {
          if (!player) return;
          const normalizedPlayer = normalizeEntity<{
            full_name?: unknown;
            full_name_en?: unknown;
            country?: unknown;
            birth_date?: unknown;
          }>(player, `derived-participant-${groupIndex + 1}-${playerIndex + 1}`);
          if (uniquePlayers.has(normalizedPlayer.id)) return;
          const name =
            typeof normalizedPlayer.full_name_en === "string" && normalizedPlayer.full_name_en.trim()
              ? normalizedPlayer.full_name_en.trim()
              : typeof normalizedPlayer.full_name === "string" && normalizedPlayer.full_name.trim()
                ? normalizedPlayer.full_name.trim()
                : `Player ${uniquePlayers.size + 1}`;
          const country =
            typeof normalizedPlayer.country === "string" && normalizedPlayer.country.trim()
              ? normalizedPlayer.country.trim()
              : null;
          uniquePlayers.set(normalizedPlayer.id, {
            id: normalizedPlayer.id,
            documentId: normalizedPlayer.documentId ?? null,
            name,
            country,
            status: "Registered",
            birthDate: normalizeDateOnly(normalizedPlayer.birth_date),
            registrationOrder: uniquePlayers.size,
            seriesRank: null,
            seriesTotalPoints: 0,
          });
        });
      });
    });

    return Array.from(uniquePlayers.values());
  }, [eventData]);

  const participantsWithSeriesData = useMemo<TournamentParticipantRow[]>(() => {
    return tournamentParticipants.map((player) => {
      const ranking = player.documentId ? seriesLeaderboardByPlayerId.get(player.documentId) : null;
      return {
        ...player,
        seriesRank: ranking?.rank ?? null,
        seriesTotalPoints: ranking?.totalPoints ?? 0,
      };
    });
  }, [seriesLeaderboardByPlayerId, tournamentParticipants]);

  const visibleTournamentParticipants = useMemo<TournamentParticipantRow[]>(() => {
    const rows = [...participantsWithSeriesData];

    if (participantSortMode === "age") {
      rows.sort((left, right) => {
        const leftBirthDate = left.birthDate;
        const rightBirthDate = right.birthDate;

        if (leftBirthDate && rightBirthDate && leftBirthDate !== rightBirthDate) {
          return participantAgeDirection === "asc"
            ? leftBirthDate.localeCompare(rightBirthDate)
            : rightBirthDate.localeCompare(leftBirthDate);
        }
        if (leftBirthDate && !rightBirthDate) return -1;
        if (!leftBirthDate && rightBirthDate) return 1;
        return left.registrationOrder - right.registrationOrder;
      });
      return rows;
    }

    if (participantSortMode === "ranking") {
      rows.sort((left, right) => {
        if (left.seriesRank !== null && right.seriesRank !== null && left.seriesRank !== right.seriesRank) {
          return left.seriesRank - right.seriesRank;
        }
        if (left.seriesRank !== null && right.seriesRank === null) return -1;
        if (left.seriesRank === null && right.seriesRank !== null) return 1;
        if (left.seriesTotalPoints !== right.seriesTotalPoints) {
          return right.seriesTotalPoints - left.seriesTotalPoints;
        }
        return left.registrationOrder - right.registrationOrder;
      });
      return rows;
    }

    rows.sort((left, right) => left.registrationOrder - right.registrationOrder);
    return rows;
  }, [participantAgeDirection, participantSortMode, participantsWithSeriesData]);

  const eventTimezoneOffsetMinutes = useMemo(() => {
    const raw =
      eventData?.data?.timetable_config &&
      typeof eventData.data.timetable_config === "object"
        ? (eventData.data.timetable_config as { timezoneOffsetMinutes?: unknown })
            .timezoneOffsetMinutes
        : null;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 180;
  }, [eventData]);

  const timetableMatchNodeLabelByNumber = useMemo(() => {
    const next = new Map<number, string>();
    timetableSlots.forEach((slot) => {
      if (slot.matchNumber === null) return;
      const label = buildOwnMatchNodeLabel(slot.matchNumber, slot.metadata);
      if (label) next.set(slot.matchNumber, label);
    });
    return next;
  }, [timetableSlots]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setSelectedTimezoneOffsetMinutes(eventTimezoneOffsetMinutes);
      return;
    }
    const stored = window.localStorage.getItem(PUBLIC_TIMEZONE_STORAGE_KEY);
    const parsed = stored !== null ? Number(stored) : Number.NaN;
    if (Number.isFinite(parsed)) {
      setSelectedTimezoneOffsetMinutes(parsed);
      return;
    }
    setSelectedTimezoneOffsetMinutes(eventTimezoneOffsetMinutes);
  }, [eventTimezoneOffsetMinutes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTimezoneOffsetMinutes === null) return;
    window.localStorage.setItem(
      PUBLIC_TIMEZONE_STORAGE_KEY,
      String(selectedTimezoneOffsetMinutes),
    );
  }, [selectedTimezoneOffsetMinutes]);

  const timezoneOptions = useMemo(
    () =>
      Array.from({ length: 27 }, (_, index) => {
        const hours = index - 12;
        return {
          value: hours * 60,
          label: formatGmtOffsetLabel(hours * 60),
        };
      }),
    [],
  );

  const playerProfileHref = (playerId: string, playerName: string) =>
    `${embedded ? "/embed" : ""}/players/${String(playerId)}-${playerName.trim().replace(/\s+/g, "-")}`;

  const visibleTimetableSlots = useMemo(() => {
    const trimmedQuery = normalizeLookupText(timetableSearchQuery);
    if (timetableViewMode === "training") {
      return timetableSlots.filter((slot) => {
        if (slot.slotType !== "training") return false;
        if (!trimmedQuery) return true;
        const haystack = [
          slot.title,
          slot.subtitle,
          slot.description,
          slot.trainingPlayerName,
          slot.stageTitle,
          slot.customStageLabel,
          slot.tableLabel,
        ]
          .map((value) => normalizeLookupText(value))
          .filter(Boolean)
          .join(" ");
        return haystack.includes(trimmedQuery);
      });
    }
    return timetableSlots.filter((slot) => {
      if (slot.slotType === "training") return false;
      if (!trimmedQuery) return true;
      const placeholder =
        typeof slot.metadata?.placeholderLabel === "string"
          ? slot.metadata.placeholderLabel
          : "";
      const groupNumber =
        typeof slot.groupNumber === "number" && Number.isFinite(slot.groupNumber)
          ? String(slot.groupNumber)
          : "";
      const matchNumber =
        typeof slot.matchNumber === "number" && Number.isFinite(slot.matchNumber)
          ? String(slot.matchNumber)
          : "";
      const haystack = [
        slot.title,
        slot.subtitle,
        slot.description,
        slot.matchLabel,
        slot.stageTitle,
        slot.customStageLabel,
        slot.matchPlayer1Name,
        slot.matchPlayer1Country,
        slot.matchPlayer2Name,
        slot.matchPlayer2Country,
        slot.tableLabel,
        placeholder,
        groupNumber,
        groupNumber ? `group ${groupNumber}` : "",
        groupNumber ? `g${groupNumber}` : "",
        matchNumber,
        matchNumber ? `match ${matchNumber}` : "",
      ]
        .map((value) => normalizeLookupText(value))
        .filter(Boolean)
        .join(" ")
        .trim();
      return haystack.includes(trimmedQuery);
    });
  }, [timetableSearchQuery, timetableSlots, timetableViewMode]);

  const stageMatchGroups = useMemo<Record<string, StageMatchGroup[]>>(
    () =>
      eventStages.reduce<Record<string, StageMatchGroup[]>>((acc, stage) => {
        acc[stage.documentId] = buildStageMatchGroups(stage.groups);
        acc[stage.id] = acc[stage.documentId];
        return acc;
      }, {}),
    [eventStages],
  );
  const liveCards = useMemo(
    () =>
      mergedEventLiveSessions.filter(
        (session) =>
          session.state?.isRunning ||
          session.sessionStatus === "in_progress",
      ),
    [mergedEventLiveSessions],
  );
  const tournamentVideoSessions = useMemo<LiveVideoDrawerSession[]>(
    () =>
      liveCards.reduce<LiveVideoDrawerSession[]>((acc, session) => {
        const liveVideos = normalizeLiveVideoEntries(
          session.liveVideos ?? session.state?.liveVideos,
        );
        acc.push({
          sessionId: session.sessionId,
          screenId: session.screenId ?? session.screenIdentifier ?? null,
          title:
            session.state?.tournamentName?.trim() ||
            summary.title ||
            "Live match",
          subtitle:
            [session.state?.stageName, session.state?.groupName, session.state?.tableName]
              .filter(Boolean)
              .join(" • ") || null,
          playerAName: session.state?.playerAName ?? session.player1Name ?? null,
          playerBName: session.state?.playerBName ?? session.player2Name ?? null,
          playerACountry: session.state?.playerACountry ?? null,
          playerBCountry: session.state?.playerBCountry ?? null,
          scoreA: session.state?.scoreA ?? null,
          scoreB: session.state?.scoreB ?? null,
          runA: session.state?.liveRunA ?? session.state?.runA ?? null,
          runB: session.state?.liveRunB ?? session.state?.runB ?? null,
          avgFormattedA: session.state?.avgFormattedA ?? null,
          avgFormattedB: session.state?.avgFormattedB ?? null,
          accPercentA: session.state?.accPercentA ?? null,
          accPercentB: session.state?.accPercentB ?? null,
          bestRunA: session.state?.bestRunA ?? null,
          bestRunB: session.state?.bestRunB ?? null,
          bestRun2A: session.state?.bestRun2A ?? null,
          bestRun2B: session.state?.bestRun2B ?? null,
          inningsCount: session.state?.inningsCount ?? null,
          inningsDetail: session.state?.inningsDetail ?? undefined,
          current: session.state?.current,
          liveVideos,
        });
        return acc;
      }, []),
    [liveCards, summary.title],
  );

  const videoDrawerOpen = liveCards.length > 0;
  const mobileVideoDrawerSessionId =
    videoDrawerSessionId ?? tournamentVideoSessions[0]?.sessionId ?? null;
  const mobileVideoDrawerVideoId =
    videoDrawerVideoId ??
    tournamentVideoSessions.find(
      (session) => session.sessionId === mobileVideoDrawerSessionId,
    )?.liveVideos[0]?.videoId ??
    null;
  const videoDrawerShellStyle = videoDrawerOpen
    ? ({
        width: "min(1680px, calc(100vw - 48px))",
        maxWidth: "100%",
      } as React.CSSProperties)
    : undefined;

  const scrollMobileVideoDrawerIntoView = useCallback(() => {
    if (typeof window === "undefined" || isWideDesktop) return;
    const panel = mobileVideoDrawerRef.current;
    if (!panel) return;
    window.requestAnimationFrame(() => {
      const top = Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 20);
      window.scrollTo({ top, behavior: "smooth" });
    });
  }, [isWideDesktop]);

  useEffect(() => {
    if (!videoDrawerSessionId) return;
    scrollMobileVideoDrawerIntoView();
  }, [scrollMobileVideoDrawerIntoView, videoDrawerSessionId]);

  const handleOpenLiveVideos = useCallback(
    (
      session: EventLiveSession,
      origin?: { left: number; top: number; width: number; height: number } | null,
    ) => {
      const liveVideos = normalizeLiveVideoEntries(
        session.liveVideos ?? session.state?.liveVideos,
      );
      setVideoDrawerSessionId(session.sessionId);
      setVideoDrawerVideoId(liveVideos[0]?.videoId ?? null);
      setVideoDrawerLaunchOrigin(origin ?? null);
      skipNextLiveTopScrollRef.current = true;
      scrollMobileVideoDrawerIntoView();
    },
    [scrollMobileVideoDrawerIntoView],
  );

  useEffect(() => {
    if (activeView !== "live") return;
    if (highlightedLiveSessionId) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (skipNextLiveTopScrollRef.current) {
      skipNextLiveTopScrollRef.current = false;
      return;
    }

    const scrollToLiveTop = () => {
      liveContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.setTimeout(() => {
        window.scrollBy({ top: -88, behavior: "smooth" });
      }, 40);
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLiveTop);
    });
    const timeout = window.setTimeout(scrollToLiveTop, 120);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [activeView, highlightedLiveSessionId, liveCards.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsWideDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const groupPopoverBySessionId = useMemo(() => {
    const result = new Map<string, GroupPopoverData>();

    const buildNameKeys = (
      a: string | null | undefined,
      b: string | null | undefined,
    ) => {
      const left = normalizeNameForMatch(a);
      const right = normalizeNameForMatch(b);
      if (!left || !right) return [];
      return [[left, right].sort().join("::")];
    };

    const findByNames = (session: EventLiveSession) => {
      const pairNameKeys = new Set<string>([
        ...buildNameKeys(session.player1Name, session.player2Name),
        ...buildNameKeys(
          session.state?.playerAName,
          session.state?.playerBName,
        ),
      ]);
      const sessionFragments = new Set<string>([
        ...buildNameFragments(session.player1Name),
        ...buildNameFragments(session.player2Name),
        ...buildNameFragments(session.state?.playerAName),
        ...buildNameFragments(session.state?.playerBName),
      ]);

      for (const stage of eventStages) {
        const groupedMatches = stageMatchGroups[stage.documentId] ?? [];
        for (const group of groupedMatches) {
          const hit = group.matches.find((match) => {
            const candidateKeys = new Set<string>([
              ...buildNameKeys(match.top.player.name, match.bottom.player.name),
              ...buildNameKeys(
                match.top.player.nativeName,
                match.bottom.player.nativeName,
              ),
              ...buildNameKeys(
                match.top.player.name || match.top.player.nativeName,
                match.bottom.player.name || match.bottom.player.nativeName,
              ),
            ]);
            for (const key of candidateKeys) {
              if (pairNameKeys.has(key)) return true;
            }
            if (sessionFragments.size > 0) {
              const candidateFragments = new Set<string>([
                ...buildNameFragments(match.top.player.name),
                ...buildNameFragments(match.bottom.player.name),
                ...buildNameFragments(match.top.player.nativeName),
                ...buildNameFragments(match.bottom.player.nativeName),
              ]);
              let overlap = 0;
              for (const fragment of candidateFragments) {
                if (sessionFragments.has(fragment)) overlap += 1;
              }
              if (overlap >= 2) return true;
            }
            return false;
          });
          if (hit) {
            return createGroupPopoverData(group, session);
          }
        }
      }

      return null;
    };

    liveCards.forEach((session) => {
      let popover: GroupPopoverData | null = null;
      if (session.eventStageId && session.groupNumber != null) {
        const groupedMatches = stageMatchGroups[session.eventStageId] ?? [];
        const group =
          groupedMatches.find(
            (entry) => entry.number === session.groupNumber,
          ) ?? null;
        if (group) {
          popover = createGroupPopoverData(group, session);
        }
      }

      if (!popover) {
        popover = findByNames(session);
      }

      if (popover) {
        result.set(session.sessionId, popover);
      }
    });

    return result;
  }, [eventStages, liveCards, stageMatchGroups]);

  useEffect(() => {
    if (!highlightItem) return;
    const recentlyClosed = lastClosedHighlightRef.current;
    if (
      recentlyClosed &&
      Date.now() - recentlyClosed.at < 1200 &&
      (recentlyClosed.sessionId === highlightItem.sessionId ||
        (recentlyClosed.screenId &&
          recentlyClosed.screenId === highlightItem.screenId))
    ) {
      return;
    }
    const fresh =
      liveCards.find((x) => x.sessionId === highlightItem.sessionId) ??
      liveCards.find(
        (x) => x.screenId && x.screenId === highlightItem.screenId,
      );
    if (!fresh) return;
    const nextHighlightItem = buildHighlightItem(fresh as any);
    if (
      getHighlightItemSignature(highlightItem) ===
      getHighlightItemSignature(nextHighlightItem)
    ) {
      return;
    }
    setHighlightItem(nextHighlightItem);
  }, [buildHighlightItem, getHighlightItemSignature, liveCards, highlightItem]);

  const handleCardClick = (session: EventLiveSession) => {
    if (Date.now() - lastModalCloseAtRef.current < 250) return;
    lastClosedHighlightRef.current = null;
    setHoveredGroupSessionId(null);
    setOpenGroupSessionId(null);
    if (isWideDesktop) {
      const liveVideos = normalizeLiveVideoEntries(
        session.liveVideos ?? session.state?.liveVideos,
      );
      setVideoDrawerSessionId(session.sessionId);
      setVideoDrawerVideoId(liveVideos[0]?.videoId ?? null);
    }
    window.setTimeout(() => {
      setHighlightItem(buildHighlightItem(session));
    }, 0);
  };

  const handleInlineCardExpandedChange = (
    expanded: boolean,
    sessionId: string,
  ) => {
    if (!expanded && openGroupSessionId === sessionId) {
      setOpenGroupSessionId(null);
    }
    setExpandedLiveSessionIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  };

  useEffect(() => {
    setExpandedLiveSessionIds((prev) => {
      const valid = new Set(liveCards.map((session) => session.sessionId));
      const next = new Set<string>();
      prev.forEach((sessionId) => {
        if (valid.has(sessionId)) next.add(sessionId);
      });
      return next;
    });
  }, [liveCards]);

  const toggleGroupPopover = (sessionId: string) => {
    const willOpen = openGroupSessionId !== sessionId;
    if (!willOpen) {
      setOpenGroupSessionId(null);
      return;
    }
    setOpenGroupSessionId(null);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        setOpenGroupSessionId(sessionId);
      });
    } else {
      setOpenGroupSessionId(sessionId);
    }
  };

  const switchToLive = () => {
    if (activeView === "tournament") {
      tournamentScrollYRef.current = window.scrollY;
    }
    setActiveView("live");
  };

  const switchToTournament = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    if (tournamentScrollYRef.current !== null) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }
    setTournamentPanelMode("stages");
    setActiveView("tournament");
  };

  const openFinalStandings = () => {
    if (finalStageDocumentId) {
      setSelectedStageDocumentId(finalStageDocumentId);
    }
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    if (tournamentScrollYRef.current !== null) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }
    setTournamentPanelMode("finals");
    setActiveView("tournament");
    window.setTimeout(() => {
      tournamentContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleHighlightClose = () => {
    lastModalCloseAtRef.current = Date.now();
    lastClosedHighlightRef.current = {
      sessionId: highlightItem?.sessionId,
      screenId: highlightItem?.screenId,
      at: Date.now(),
    };
    setHoveredGroupSessionId(null);
    setOpenGroupSessionId(null);
    setSuppressLiveGridClicks(true);
    setHighlightItem(null);
    window.setTimeout(() => {
      setSuppressLiveGridClicks(false);
    }, 400);
  };

  const ageSortButtonLabel =
    participantSortMode === "age"
      ? participantAgeDirection === "asc"
        ? "Age ↑"
        : "Age ↓"
      : "Sort by age";

  const handleAgeSortClick = () => {
    if (participantSortMode !== "age") {
      setParticipantSortMode("age");
      setParticipantAgeDirection("asc");
      return;
    }
    if (participantAgeDirection === "asc") {
      setParticipantAgeDirection("desc");
      return;
    }
    setParticipantSortMode("registration");
    setParticipantAgeDirection("asc");
  };

  const handleRankingSortClick = () => {
    setParticipantSortMode((current) =>
      current === "ranking" ? "registration" : "ranking",
    );
  };

  const mainContent =
    activeView === "tournament" ? (
      tournamentPanelMode === "participants" ? (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Participants
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Registered players
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {participantSortMode === "age"
                    ? "Sorted by hidden date of birth for youth events."
                    : participantSortMode === "ranking"
                      ? "Sorted by the current ranking order of the linked series."
                      : "Listed in the same order they were registered for this event."}
                </p>
              </div>
              {(isYouthTournament || isSeriesTournament) ? (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {isYouthTournament ? (
                    <button
                      type="button"
                      onClick={handleAgeSortClick}
                      className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        participantSortMode === "age"
                          ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {ageSortButtonLabel}
                    </button>
                  ) : null}
                  {isSeriesTournament ? (
                    <button
                      type="button"
                      onClick={handleRankingSortClick}
                      className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        participantSortMode === "ranking"
                          ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Ranking order
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {visibleTournamentParticipants.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                No participants have been published yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Player</th>
                        <th className="px-4 py-3 text-left font-semibold">Country</th>
                        {isSeriesTournament ? (
                          <th className="px-4 py-3 text-left font-semibold">Series Pts</th>
                        ) : null}
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTournamentParticipants.map((player) => {
                        const flagSrc = getCountryFlagCdnUrl(player.country, 40);
                        return (
                          <tr
                            key={player.id}
                            className="border-t border-slate-200 bg-white text-slate-700"
                          >
                            <td className="px-5 py-3 align-middle">
                              {player.documentId ? (
                                <Link
                                  href={playerProfileHref(player.documentId, player.name)}
                                  className="font-semibold text-slate-950 transition hover:text-cyan-700"
                                >
                                  {player.name}
                                </Link>
                              ) : (
                                <span className="font-semibold text-slate-950">{player.name}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span className="inline-flex items-center gap-2">
                                {flagSrc ? (
                                  <img
                                    src={flagSrc}
                                    alt={player.country || "flag"}
                                    className="h-3.5 w-5 rounded-[2px] object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : null}
                                <span>{player.country || "-"}</span>
                              </span>
                            </td>
                            {isSeriesTournament ? (
                              <td className="px-4 py-3 align-middle">
                                <span className="font-semibold text-slate-950">
                                  {player.seriesTotalPoints}
                                </span>
                              </td>
                            ) : null}
                            <td className="px-4 py-3 align-middle">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                {player.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : tournamentPanelMode === "info" ? (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Event Info
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Tournament details
              </h2>
            </div>
            {hasInfoDescription ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Description
                </div>
                <div className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {summary.description}
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Tournament", value: summary.title || "-" },
                { label: "Season", value: summary.season ? String(summary.season) : "-" },
                { label: "Game type", value: summary.gameType || "-" },
                { label: "Schedule", value: scheduleLabel || "To be announced" },
                { label: "Venue", value: summary.venueName || summary.clubName || "-" },
                {
                  label: "Location",
                  value:
                    [summary.venueCity || summary.clubCity, summary.venueCountry || summary.clubCountry]
                      .filter(Boolean)
                      .join(", ") || "-",
                },
                { label: "Organizer", value: summary.organizerType || "-" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : tournamentPanelMode === "gallery" ? (
        <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Photo Gallery
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Coming soon
            </h2>
            <p className="mt-4 text-sm text-slate-600 sm:text-base">
              The photo gallery for {summary.title} is being prepared.
            </p>
          </div>
        </section>
      ) : tournamentPanelMode === "timetable" ? (
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Time table
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Tournament schedule
              </h2>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setTimetableViewMode("matches")}
                className={
                  timetableViewMode === "matches"
                    ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                    : "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:text-slate-950"
                }
              >
                Matches
              </button>
              <button
                type="button"
                onClick={() => setTimetableViewMode("training")}
                className={
                  timetableViewMode === "training"
                    ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                    : "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:text-slate-950"
                }
              >
                Training
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
              <input
                type="search"
                value={timetableSearchQuery}
                onChange={(e) => setTimetableSearchQuery(e.target.value)}
                placeholder={
                  timetableViewMode === "training"
                    ? "Search training slots..."
                    : "Search player, group (e.g. g1) or match..."
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <select
                value={selectedTimezoneOffsetMinutes ?? eventTimezoneOffsetMinutes}
                onChange={(e) =>
                  setSelectedTimezoneOffsetMinutes(Number(e.target.value))
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {visibleTimetableSlots.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                {timetableViewMode === "training"
                  ? "No training slots have been published yet."
                  : "No timetable has been published yet."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-4 py-3 text-center font-semibold">Date</th>
                        <th className="px-4 py-3 text-center font-semibold">Time</th>
                        <th className="px-4 py-3 text-center font-semibold">Table</th>
                        <th className="px-6 py-3 text-center font-semibold">Players</th>
                        {timetableViewMode === "matches" ? (
                          <>
                            <th className="px-4 py-3 text-center font-semibold">Group</th>
                            <th className="px-4 py-3 text-center font-semibold">Number</th>
                            <th className="px-4 py-3 text-center font-semibold">Stage</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTimetableSlots.map((slot) => {
                        const shiftedDateTime = formatDateTimeWithOffset(
                          slot.dateTime,
                          selectedTimezoneOffsetMinutes,
                        );
                        const dateLabel = shiftedDateTime?.date || slot.date || "-";
                        const timeLabel = shiftedDateTime?.time || slot.time || "-";
                        const placeholderLabel =
                          typeof slot.metadata?.placeholderLabel === "string"
                            ? slot.metadata.placeholderLabel
                            : null;
                        const trainingPlayerFlag =
                          slot.trainingPlayerCountry
                            ? getCountryFlagCdnUrl(slot.trainingPlayerCountry, 40)
                            : null;
                        const resolved =
                          slot.metadata?.resolved === false ? false : true;
                        const leftPlaceholderLabel = buildPlaceholderSideLabel(
                          slot.metadata ?? null,
                          "left",
                          timetableMatchNodeLabelByNumber,
                        );
                        const rightPlaceholderLabel = buildPlaceholderSideLabel(
                          slot.metadata ?? null,
                          "right",
                          timetableMatchNodeLabelByNumber,
                        );
                        const isFinalPlaceholderRow =
                          slot.matchNumber === 57 &&
                          !slot.matchPlayer1Name &&
                          !slot.matchPlayer2Name;
                        const leftLabel = isFinalPlaceholderRow
                          ? null
                          : slot.matchPlayer1Name ||
                            leftPlaceholderLabel ||
                            null;
                        const rightLabel = isFinalPlaceholderRow
                          ? null
                          : slot.matchPlayer2Name ||
                            rightPlaceholderLabel ||
                            null;
                        const hasResolvedPlayers = Boolean(
                          slot.matchPlayer1Name || slot.matchPlayer2Name,
                        );
                        const hasPlayerGrid =
                          !isFinalPlaceholderRow &&
                          (hasResolvedPlayers ||
                            Boolean(leftLabel || rightLabel));
                        const leftResolved = Boolean(slot.matchPlayer1Name);
                        const rightResolved = Boolean(slot.matchPlayer2Name);
                        const matchPlayer1Flag = leftResolved
                          ? getCountryFlagCdnUrl(slot.matchPlayer1Country ?? null, 40)
                          : null;
                        const matchPlayer2Flag = rightResolved
                          ? getCountryFlagCdnUrl(slot.matchPlayer2Country ?? null, 40)
                          : null;
                        const publicMatchLabel =
                          isFinalPlaceholderRow
                            ? "FINAL"
                            :
                          resolved && slot.matchLabel
                            ? slot.matchLabel
                            : placeholderLabel ||
                              slot.matchLabel ||
                              (slot.slotType !== "match"
                                ? slot.title || slot.subtitle || null
                                : null);
                        return (
                          <tr
                            key={slot.documentId}
                            className="border-t border-slate-200 bg-white text-slate-700"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-center align-middle">{dateLabel}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center align-middle">{timeLabel}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center align-middle">{slot.tableLabel || "-"}</td>
                            <td className="px-6 py-3 align-middle">
                              <div className="flex flex-col items-center gap-1 text-center">
                                {slot.slotType === "training" && slot.trainingPlayerName ? (
                                  <span className="grid grid-cols-[20px_minmax(0,max-content)] items-center justify-center gap-2 font-semibold text-slate-950">
                                    <span className="flex h-4 w-5 items-center justify-center">
                                      {trainingPlayerFlag ? (
                                        <img
                                          src={trainingPlayerFlag}
                                          alt={slot.trainingPlayerCountry || "flag"}
                                          className="h-3.5 w-5 rounded-[2px] object-cover"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : null}
                                    </span>
                                    <span className="text-center">{highlightText(slot.trainingPlayerName, timetableSearchQuery)}</span>
                                  </span>
                                ) : hasPlayerGrid ? (
                                  <div className="grid w-full min-w-[28rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                    <span className={`flex items-center justify-end gap-2 text-right ${leftResolved ? "font-semibold text-slate-950" : "font-medium text-slate-500"}`}>
                                      <span>{highlightText(leftLabel || "", timetableSearchQuery)}</span>
                                      {matchPlayer1Flag ? (
                                        <img
                                          src={matchPlayer1Flag}
                                          alt={slot.matchPlayer1Country || "flag"}
                                          className="h-3.5 w-5 rounded-[2px] object-cover"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : null}
                                    </span>
                                    <span className={`text-center font-semibold uppercase tracking-[0.16em] ${leftResolved && rightResolved ? "text-slate-500" : "text-slate-400"}`}>
                                      VS
                                    </span>
                                    <span className={`flex items-center justify-start gap-2 text-left ${rightResolved ? "font-semibold text-slate-950" : "font-medium text-slate-500"}`}>
                                      {matchPlayer2Flag ? (
                                        <img
                                          src={matchPlayer2Flag}
                                          alt={slot.matchPlayer2Country || "flag"}
                                          className="h-3.5 w-5 rounded-[2px] object-cover"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : null}
                                      <span>{highlightText(rightLabel || "", timetableSearchQuery)}</span>
                                    </span>
                                  </div>
                                ) : publicMatchLabel ? (
                                  <span className="w-full text-center font-medium text-slate-500">
                                    {highlightText(
                                      publicMatchLabel,
                                      timetableSearchQuery,
                                    )}
                                  </span>
                                ) : null}
                                {slot.description && slot.slotType !== "training" ? (
                                  <span className="text-xs text-slate-500">
                                    {highlightText(
                                      slot.description,
                                      timetableSearchQuery,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            {timetableViewMode === "matches" ? (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-center align-middle">
                                  {slot.groupNumber !== null ? `Group ${slot.groupNumber}` : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center align-middle">
                                  {slot.matchNumber !== null ? `Match ${slot.matchNumber}` : "-"}
                                </td>
                                <td className="px-4 py-3 text-center align-middle">{slot.stageTitle || slot.customStageLabel || "-"}</td>
                              </>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <TournamentEventsContent
          key={`${summary.documentId}:${selectedStageDocumentId ?? "default"}`}
          eventIdOverride={summary.documentId}
          initialEventData={initialEventData}
          eventDataOverride={eventData}
          disableAutoRefresh
          preferredStageDocumentId={selectedStageDocumentId}
          timezoneOffsetMinutes={
            selectedTimezoneOffsetMinutes ?? eventTimezoneOffsetMinutes
          }
          timezoneOptions={timezoneOptions}
          onTimezoneChange={setSelectedTimezoneOffsetMinutes}
          onStageSelect={(stageDocumentId) => {
            setTournamentPanelMode("stages");
            setSelectedStageDocumentId(stageDocumentId);
          }}
          showPublishedFinalResults={tournamentPanelMode === "finals"}
          showTimetable={false}
          stageViewMode={overviewMode}
          embeddedOverride={embedded}
          showStandaloneTitle={false}
          showEventHeader={false}
          emptyStateMessage="This tournament page is missing event data."
          liveSessionsOverride={mergedEventLiveSessions}
          onLiveMatchOpen={(sessionId) => {
            setHighlightedLiveSessionId(sessionId);
            switchToLive();
          }}
        />
      )
    ) : (
      <section ref={liveContentRef} className="space-y-6">
        <div
          className={`flex flex-col gap-6 ${
            videoDrawerOpen
              ? "xl:mx-auto xl:grid xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
              : ""
          }`}
          style={videoDrawerShellStyle}
        >
          <div className="min-w-0 flex-1">
        {isLiveLoading && liveCards.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            Loading live scores...
          </div>
        ) : liveError && liveCards.length === 0 ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            {liveError}
          </div>
        ) : liveCards.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            Waiting for live scores...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {liveCards.map((session) => {
              const state = (session.state ?? {}) as any;
              const photoFallback =
                apiPhotoFallbackBySessionId.get(
                  String(
                    session.sessionId ||
                      session.documentId ||
                      session.screenIdentifier ||
                      session.screenId ||
                      session.id ||
                      "",
                  ).trim(),
                ) ?? null;
              const boardInteractionDisabled = Boolean(
                highlightItem || suppressLiveGridClicks,
              );
              return (
                <div
                  key={session.sessionId}
                  id={`tournament-live-session-${session.sessionId}`}
                  className={
                    highlightedLiveSessionId === session.sessionId
                      ? "relative rounded-[30px]"
                      : "relative"
                  }
                >
                  {!highlightItem &&
                  groupPopoverBySessionId.has(session.sessionId) &&
                  openGroupSessionId === session.sessionId ? (
                    <GroupTooltip
                      data={groupPopoverBySessionId.get(session.sessionId)!}
                      embedded={embedded}
                      locale={browserLocale ?? undefined}
                    />
                  ) : null}
                  <div
                    className={
                      boardInteractionDisabled ? "pointer-events-none" : ""
                    }
                  >
                    <LiveScoreBoardCard
                      sessionId={session.sessionId}
                      inlineExpandable
                      expanded={expandedLiveSessionIds.has(session.sessionId)}
                      onExpandedChange={handleInlineCardExpandedChange}
                      clubName={session.clubName}
                      clubCity={session.clubCity}
                      updatedAt={session.updatedAt}
                      timerProgress={state.progress}
                      timerTotal={state.totalBlocks}
                      timerRunning={state.isRunning}
                      timeoutsUsed1={state.timeoutsA}
                      maxTimeouts1={state.maxTimeoutsA}
                      timeoutsUsed2={state.timeoutsB}
                      maxTimeouts2={state.maxTimeoutsB}
                      inningsCount={state.inningsCount}
                      gameDurationSeconds={state.gameDurationSeconds}
                      player1={{
                        name: state.playerAName || "Player A",
                        country: state.playerACountry ?? null,
                        photoUrl: resolveSessionMatchedPhotoValue(
                          state.playerAPhotoUrl,
                          photoFallback?.playerAPhotoUrl,
                          state.playerAName,
                          photoFallback?.playerAName,
                        ),
                        photoMainUrl: resolveSessionMatchedPhotoValue(
                          state.playerAPhotoMainUrl,
                          photoFallback?.playerAPhotoMainUrl,
                          state.playerAName,
                          photoFallback?.playerAName,
                        ),
                        points: state.scoreA ?? 0,
                        run: state.runA ?? 0,
                        liveRun: state.liveRunA ?? 0,
                        innings: state.inningsA ?? 0,
                        hr: state.bestRunA ?? 0,
                        flag: "🇬🇷",
                        avgFormatted: state.avgFormattedA,
                        accPercent: state.accPercentA,
                        secondsPerInning: state.secondsPerInningA,
                        playerTimeSeconds: state.playerATimeSeconds,
                        targetPoints: state.targetPointsA ?? null,
                      }}
                      player2={{
                        name: state.playerBName || "Player B",
                        country: state.playerBCountry ?? null,
                        photoUrl: resolveSessionMatchedPhotoValue(
                          state.playerBPhotoUrl,
                          photoFallback?.playerBPhotoUrl,
                          state.playerBName,
                          photoFallback?.playerBName,
                        ),
                        photoMainUrl: resolveSessionMatchedPhotoValue(
                          state.playerBPhotoMainUrl,
                          photoFallback?.playerBPhotoMainUrl,
                          state.playerBName,
                          photoFallback?.playerBName,
                        ),
                        points: state.scoreB ?? 0,
                        run: state.runB ?? 0,
                        liveRun: state.liveRunB ?? 0,
                        innings: state.inningsB ?? 0,
                        hr: state.bestRunB ?? 0,
                        flag: "🇬🇷",
                        avgFormatted: state.avgFormattedB,
                        accPercent: state.accPercentB,
                        secondsPerInning: state.secondsPerInningB,
                        playerTimeSeconds: state.playerBTimeSeconds,
                        targetPoints: state.targetPointsB ?? null,
                      }}
                      current={state.current}
                      onNavigate={() => handleCardClick(session)}
                      hasLiveVideos={
                        normalizeLiveVideoEntries(
                          session.liveVideos ?? state.liveVideos,
                        ).length > 0
                      }
                      liveVideosSelected={
                        videoDrawerSelectedSessionIds.includes(session.sessionId) ||
                        (!isWideDesktop && mobileVideoDrawerSessionId === session.sessionId)
                      }
                      compactExpandedLayout={isWideDesktop && videoDrawerOpen}
                      onOpenLiveVideos={(_sessionId, origin) =>
                        handleOpenLiveVideos(session, origin)
                      }
                      topLeftControl={
                        expandedLiveSessionIds.has(session.sessionId) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleGroupPopover(session.sessionId);
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold text-white/85 shadow-sm ${
                              groupPopoverBySessionId.has(session.sessionId)
                                ? "border-white/20 bg-slate-900/35"
                                : "border-white/10 bg-slate-900/18 opacity-55"
                            }`}
                          >
                            Groups
                          </button>
                        ) : null
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
          {videoDrawerOpen ? (
            <div className="hidden w-full shrink-0 xl:sticky xl:top-6 xl:block">
              <LiveVideoDrawer
                open={videoDrawerOpen}
                sessions={tournamentVideoSessions}
                initialSessionId={videoDrawerSessionId}
                initialVideoId={videoDrawerVideoId}
                launchOrigin={videoDrawerLaunchOrigin}
                heading={summary.title || "Tournament live videos"}
                onSelectedSessionsChange={setVideoDrawerSelectedSessionIds}
                onClose={() => undefined}
              />
            </div>
          ) : null}
        </div>
        {mobileVideoDrawerSessionId ? (
          <div ref={mobileVideoDrawerRef} className="mt-6 xl:hidden">
            <LiveVideoDrawer
              open
              sessions={tournamentVideoSessions}
              initialSessionId={mobileVideoDrawerSessionId}
              initialVideoId={mobileVideoDrawerVideoId}
              launchOrigin={videoDrawerLaunchOrigin}
              heading={summary.title || "Tournament live videos"}
              onSelectedSessionsChange={setVideoDrawerSelectedSessionIds}
              onClose={() => undefined}
            />
          </div>
        ) : null}
        <LiveStatsHighlightModal
          item={highlightItem}
          onClose={handleHighlightClose}
        />
      </section>
    );

  return (
    <div
      className="mx-auto w-full px-4 py-8 sm:px-6"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#12263f_45%,#1d4ed8_100%)] text-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.62fr)_minmax(290px,0.78fr)] lg:px-10 lg:py-10">
          <div className="min-w-0 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                {summary.season ? <span>Season {summary.season}</span> : null}
                {summary.gameType ? <span>{summary.gameType}</span> : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  {summary.title}
                </h1>
                {venueMetaParts.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                    {venueMetaParts.map((part, index) => (
                      <span
                        key={`${part}-${index}`}
                        className="inline-flex items-center gap-2"
                      >
                        {index > 0 ? <span className="text-white/55">•</span> : null}
                        <span>{part}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                  Follow every stage, match, and final standing in one polished
                  tournament view built for players, organizers, and fans.
                </p>
              </div>
            </div>
            <div className="w-full overflow-hidden pb-1">
              <div className="flex max-w-full flex-nowrap items-center gap-2">
                <HeroMenuButton
                  label="Live"
                  iconSrc="/icons%20webp/live3.webp"
                  active={activeView === "live"}
                  onClick={switchToLive}
                />
                <HeroMenuButton
                  label="Tournament"
                  iconSrc="/icons%20webp/Tournament1.webp"
                  active={activeView === "tournament" && tournamentPanelMode === "stages"}
                  onClick={switchToTournament}
                />
                <HeroMenuButton
                  label="Time Table"
                  iconSrc="/icons%20webp/schedule1.webp"
                  active={activeView === "tournament" && tournamentPanelMode === "timetable"}
                  onClick={() => {
                    setTournamentPanelMode("timetable");
                    setActiveView("tournament");
                  }}
                />
                <HeroMenuButton
                  label="Final standings"
                  iconSrc="/icons%20webp/finalrank1.webp"
                  active={activeView === "tournament" && tournamentPanelMode === "finals"}
                  onClick={openFinalStandings}
                />
                <HeroMenuButton
                  label="Photo gallery"
                  iconSrc="/icons%20webp/photo%20gallery1.webp"
                  active={activeView === "tournament" && tournamentPanelMode === "gallery"}
                  onClick={() => {
                    setTournamentPanelMode("gallery");
                    setActiveView("tournament");
                  }}
                />
                <HeroMenuButton
                  label="Participants"
                  iconSrc="/icons%20webp/participants1.webp"
                  active={activeView === "tournament" && tournamentPanelMode === "participants"}
                  onClick={() => {
                    setTournamentPanelMode("participants");
                    setActiveView("tournament");
                  }}
                />
                {hasInfoDescription ? (
                  <HeroMenuButton
                    label="Info"
                    iconSrc="/icons%20webp/info.webp"
                    active={activeView === "tournament" && tournamentPanelMode === "info"}
                    onClick={() => {
                      setTournamentPanelMode("info");
                      setActiveView("tournament");
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Schedule
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {scheduleLabel || "To be announced"}
                </div>
              </div>
              <div className="flex min-h-[132px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25 p-3 sm:min-h-[148px]">
                {organizerLogoUrl ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image
                      src={organizerLogoUrl}
                      alt={summary.organizerLogoName || summary.tournamentTitle || "Organizer logo"}
                      width={320}
                      height={320}
                      className="block h-full max-h-[124px] w-full max-w-full object-contain sm:max-h-[140px]"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                      Organizer
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white/80">
                      Logo coming soon
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Stage overview
                </div>
                <div className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewMode("results");
                      setTournamentPanelMode("stages");
                      setActiveView("tournament");
                    }}
                    disabled={tournamentPanelMode === "finals"}
                    className={
                      overviewMode === "results"
                        ? tournamentPanelMode === "finals"
                          ? "rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 transition cursor-not-allowed"
                          : "rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                        : tournamentPanelMode === "finals"
                          ? "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 transition cursor-not-allowed"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:text-white"
                    }
                    aria-pressed={overviewMode === "results"}
                  >
                    Matches
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewMode("ranks");
                      setTournamentPanelMode("stages");
                      setActiveView("tournament");
                    }}
                    disabled={tournamentPanelMode === "finals"}
                    className={
                      overviewMode === "ranks"
                        ? tournamentPanelMode === "finals"
                          ? "rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 transition cursor-not-allowed"
                          : "rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                        : tournamentPanelMode === "finals"
                          ? "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 transition cursor-not-allowed"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:text-white"
                    }
                    aria-pressed={overviewMode === "ranks"}
                  >
                    Ranking
                  </button>
                </div>
              </div>
              {tournamentPanelMode === "finals" ? null : stageCount > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary.stages.map((stage, index) => {
                    const isSelected = selectedStageDocumentId === stage.documentId;
                    const label =
                      stage.title?.trim() || `Stage ${index + 1}`;

                    return (
                      <button
                        key={stage.documentId || `${label}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedStageDocumentId(stage.documentId);
                          setTournamentPanelMode("stages");
                          setActiveView("tournament");
                        }}
                        className={
                          isSelected
                            ? "inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-950 transition"
                            : "inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/15 hover:text-white"
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {tournamentPanelMode === "finals" ? null : summary.stages.length === 0 ? (
                <div className="mt-3 text-sm text-white/70">
                  No stages published yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div ref={tournamentContentRef} className="mt-8">
        {mainContent}
      </div>
    </div>
  );
}
