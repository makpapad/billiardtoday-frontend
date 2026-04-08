"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveScoreBoardCard } from "@/components/LiveScoreBoardCard";
import {
  LiveStatsHighlightModal,
  type LiveScoreItem,
} from "@/components/live/LiveClubView";
import type { LiveSessionItem } from "@/components/live/types";
import { TournamentEventsContent } from "@/app/tournaments/events/TournamentEventsContent";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";
import type {
  EventApiResponse,
  GroupStanding,
  NormalizedEventStage,
  NormalizedTimetableSlot,
  StageMatchGroup,
} from "@/app/tournaments/events/types";
import {
  buildGroupStandings,
  buildStageMatchGroups,
  formatAverage,
  formatDateForTable,
  formatNumberValue,
  formatRecord,
  normalizeEntity,
  normalizeGroup,
  normalizeResult,
  toNumber,
  toRelationArray,
} from "@/app/tournaments/events/utils";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

type Props = {
  summary: TournamentEventSummary;
  embedded?: boolean;
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
  screenId?: string;
  screenIdentifier?: string | null;
  sessionId?: string | number | null;
  ended?: boolean;
  isRunning?: boolean;
  activePlayer?: number | null;
  current?: "A" | "B" | null;
  progress?: number;
  ts?: number;
  session?: Record<string, any>;
  players?: Array<{
    name?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    liveRun?: number | null;
    innings?: number | null;
    hr?: number | null;
    avgFormatted?: string | null;
    accPercent?: number | null;
  }>;
};

type GroupPopoverData = {
  title: string;
  standings: GroupStanding[];
  matches: StageMatchGroup["matches"];
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
  return (
    <div className="absolute left-0 top-[-12px] z-30 w-[min(760px,calc(100vw-2rem))] -translate-y-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
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
              <th className="px-2 py-1.5 text-left font-semibold">Date</th>
              <th className="px-2 py-1.5 text-center font-semibold">Res</th>
              <th className="px-2 py-1.5 text-center font-semibold">MP</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
              <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
              <th className="px-2 py-1.5 text-center font-semibold">Best AVG</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R2</th>
            </tr>
          </thead>
          <tbody>
            {data.matches.map((match) => (
              <>
                <tr
                  key={`${match.key}-top`}
                  className="border-t border-slate-200 bg-emerald-50/80"
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
                  <td className="px-2 py-1.5 text-xs text-slate-600">
                    {match.dateTime
                      ? new Date(match.dateTime).toLocaleDateString(locale)
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">
                    {match.top.outcome ?? "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.matchPoints)}
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
                  className="border-t border-slate-200 bg-rose-50/80"
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
                  <td className="px-2 py-1.5 text-xs text-slate-600">
                    {match.dateTime
                      ? new Date(match.dateTime).toLocaleDateString(locale)
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">
                    {match.bottom.outcome ?? "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.matchPoints)}
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-[11px]">
          <thead className="bg-emerald-700 text-white">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Player</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pos</th>
              <th className="px-2 py-1.5 text-center font-semibold">Rec</th>
              <th className="px-2 py-1.5 text-center font-semibold">MP</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
              <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
              <th className="px-2 py-1.5 text-center font-semibold">Best AVG</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R2</th>
            </tr>
          </thead>
          <tbody>
            {data.standings.map((player) => (
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
                  {formatRecord(player.record)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalMatchPoints)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalPoints)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalInnings)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatAverage(player.totalPoints, player.totalInnings)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {typeof player.bestAverage === "number"
                    ? player.bestAverage.toFixed(3)
                    : "-"}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.highRun)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.highRun2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

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

const getStableLiveSessionKey = (session: {
  documentId?: string | null;
  sessionId?: string | null;
  screenIdentifier?: string | null;
  screenId?: string | null;
  id?: string | null;
}) =>
  String(
    session.documentId ||
      session.sessionId ||
      session.screenIdentifier ||
      session.screenId ||
      session.id ||
      "",
  ).trim();

const mergeLiveSessions = (
  primary: EventLiveSession[],
  secondary: EventLiveSession[],
) => {
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
    merged.set(key, {
      ...existing,
      ...session,
      sessionStatus: preserveRunningState
        ? existing.sessionStatus
        : session.sessionStatus,
      state: {
        ...existing.state,
        ...session.state,
        isRunning: preserveRunningState
          ? existing.state?.isRunning
          : session.state?.isRunning,
      },
    });
  }
  return Array.from(merged.values());
};

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
const buildDismissedLiveStorageKey = (eventDocumentId: string) =>
  `bt-dismissed-live-sessions:${eventDocumentId}`;

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

export function TournamentDetailPage({ summary, embedded = false }: Props) {
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
    "stages" | "finals" | "gallery" | "timetable"
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
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [highlightedLiveSessionId, setHighlightedLiveSessionId] = useState<
    string | null
  >(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [dismissedLiveSessionKeys, setDismissedLiveSessionKeys] = useState<
    Set<string>
  >(() => {
    if (typeof window === "undefined") return new Set();
    const storageKey = buildDismissedLiveStorageKey(summary.documentId);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed
          .map((value) => String(value || "").trim())
          .filter((value) => value.length > 0),
      );
    } catch {
      return new Set();
    }
  });
  const [highlightItem, setHighlightItem] = useState<LiveScoreItem | null>(
    null,
  );
  const [suppressLiveGridClicks, setSuppressLiveGridClicks] = useState(false);
  const lastModalCloseAtRef = useRef(0);
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
  const derivedClubDocumentId =
    summary.clubDocumentId ||
    eventLiveSessions.find((session) => session.clubId)?.clubId ||
    null;

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

  useEffect(() => {
    let cancelled = false;

    const fetchEventData = async () => {
      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(summary.documentId)}`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("Failed to load event data.");
        const payload = (await response
          .json()
          .catch(() => null)) as EventApiResponse | null;
        if (!cancelled) {
          setEventData(payload);
        }
      } catch {
        if (!cancelled) {
          setEventData(null);
        }
      }
    };

    void fetchEventData();
    return () => {
      cancelled = true;
    };
  }, [summary.documentId]);

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

    const fetchEventLiveSessions = async () => {
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
        if (!cancelled) {
          setEventLiveSessions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setEventLiveSessions([]);
        }
      }
    };

    void fetchEventLiveSessions();
    const interval = window.setInterval(fetchEventLiveSessions, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [summary.documentId]);

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
              playerAName:
                resolveEventSessionPlayerName(sessionObj, "A", "Player A") ?? "Player A",
              playerBName:
                resolveEventSessionPlayerName(sessionObj, "B", "Player B") ?? "Player B",
              playerACountry:
                typeof sessionObj.player1Country === "string"
                  ? sessionObj.player1Country
                  : null,
              playerBCountry:
                typeof sessionObj.player2Country === "string"
                  ? sessionObj.player2Country
                  : null,
              playerAPhotoUrl:
                typeof sessionObj.player1PhotoUrl === "string"
                  ? sessionObj.player1PhotoUrl
                  : null,
              playerBPhotoUrl:
                typeof sessionObj.player2PhotoUrl === "string"
                  ? sessionObj.player2PhotoUrl
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
                        typeof sessionObj.player1Country === "string"
                          ? sessionObj.player1Country
                          : baseSession?.state?.playerACountry ?? null,
                      playerBCountry:
                        typeof sessionObj.player2Country === "string"
                          ? sessionObj.player2Country
                          : baseSession?.state?.playerBCountry ?? null,
                      playerAPhotoUrl:
                        typeof sessionObj.player1PhotoUrl === "string"
                          ? sessionObj.player1PhotoUrl
                          : baseSession?.state?.playerAPhotoUrl ?? null,
                      playerBPhotoUrl:
                        typeof sessionObj.player2PhotoUrl === "string"
                          ? sessionObj.player2PhotoUrl
                          : baseSession?.state?.playerBPhotoUrl ?? null,
                      progress:
                        Number(sessionObj.progress ?? baseSession?.state?.progress ?? 0) || 0,
                      totalBlocks: 40,
                      isRunning: lifecycleIsRunning,
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
                    progress: Number(payload.progress ?? 0) || 0,
                    totalBlocks: 40,
                    isRunning: scoreUpdateIsRunning,
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

  const visibleTimetableSlots = useMemo(() => {
    const trimmedQuery = timetableSearchQuery.trim().toLowerCase();
    if (timetableViewMode === "training") {
      return timetableSlots.filter((slot) => slot.slotType === "training");
    }
    return timetableSlots.filter((slot) => {
      if (slot.slotType === "training") return false;
      if (!trimmedQuery) return true;
      const placeholder =
        typeof slot.metadata?.placeholderLabel === "string"
          ? slot.metadata.placeholderLabel
          : "";
      const haystack = [
        slot.title,
        slot.subtitle,
        slot.description,
        slot.matchLabel,
        slot.stageTitle,
        placeholder,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
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

  useEffect(() => {
    if (activeView !== "live") return;
    if (highlightedLiveSessionId) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;

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
            return {
              title: `Group ${group.number ?? group.key}`,
              standings: buildGroupStandings(group.matches),
              matches: group.matches,
            };
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
          popover = {
            title: `Group ${group.number ?? group.key}`,
            standings: buildGroupStandings(group.matches),
            matches: group.matches,
          };
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
    if (typeof window === "undefined") return;
    const storageKey = buildDismissedLiveStorageKey(summary.documentId);
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(dismissedLiveSessionKeys)),
      );
    } catch {
      // ignore storage failures
    }
  }, [dismissedLiveSessionKeys, summary.documentId]);

  useEffect(() => {
    const valid = new Set(liveCards.map((item) => item.sessionId));
    setExpandedSessions((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [liveCards]);

  useEffect(() => {
    const validKeys = new Set(
      liveCards
        .map((session) => getStableLiveSessionKey(session))
        .filter((value) => value.length > 0),
    );
    setDismissedLiveSessionKeys((prev) => {
      const next = new Set<string>();
      prev.forEach((key) => {
        if (validKeys.has(key)) next.add(key);
      });
      return next;
    });
  }, [liveCards]);

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
    setHighlightItem({
      id: fresh.id,
      sessionId: fresh.sessionId,
      screenId: fresh.screenId ?? undefined,
      updatedAt: fresh.updatedAt ?? undefined,
      clubId: fresh.clubId ?? undefined,
      clubName: fresh.clubName ?? undefined,
      clubCity: fresh.clubCity ?? undefined,
      clubFederationName: fresh.clubFederationName ?? undefined,
      state: fresh.state as any,
    });
  }, [liveCards, highlightItem]);

  const handleExpandedChange = (
    expanded: boolean,
    sessionId: string,
    stableKey?: string,
  ) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
    if (!stableKey) return;
    setDismissedLiveSessionKeys((prev) => {
      const next = new Set(prev);
      if (expanded) next.delete(stableKey);
      else next.add(stableKey);
      return next;
    });
  };

  useEffect(() => {
    const validSessionIds = new Set(liveCards.map((session) => session.sessionId));
    setExpandedSessions((prev) => {
      if (validSessionIds.size === 0) return new Set();

      return new Set(
        Array.from(prev).filter((sessionId) => validSessionIds.has(sessionId)),
      );
    });
  }, [liveCards]);

  const handleCardClick = (session: EventLiveSession) => {
    if (Date.now() - lastModalCloseAtRef.current < 250) return;
    lastClosedHighlightRef.current = null;
    setHoveredGroupSessionId(null);
    setOpenGroupSessionId(null);
    window.setTimeout(() => {
      setHighlightItem({
        id: session.id,
        sessionId: session.sessionId,
        screenId: session.screenId ?? undefined,
        updatedAt: session.updatedAt ?? undefined,
        clubId: session.clubId ?? undefined,
        clubName: session.clubName ?? undefined,
        clubCity: session.clubCity ?? undefined,
        clubFederationName: session.clubFederationName ?? undefined,
        state: session.state as any,
      });
    }, 0);
  };

  const toggleGroupPopover = (sessionId: string) => {
    setOpenGroupSessionId((prev) => (prev === sessionId ? null : sessionId));
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

  const mainContent =
    activeView === "tournament" ? (
      tournamentPanelMode === "gallery" ? (
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
                    : "Search player or placeholder..."
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
              setExpandedSessions(new Set([sessionId]));
              const target = mergedEventLiveSessions.find(
                (session) => session.sessionId === sessionId,
              );
              if (target) {
                const stableKey = getStableLiveSessionKey(target);
                if (stableKey) {
                  setDismissedLiveSessionKeys((prev) => {
                    const next = new Set(prev);
                    next.delete(stableKey);
                    return next;
                  });
                }
              }
              switchToLive();
            }}
        />
      )
    ) : (
      <section ref={liveContentRef} className="space-y-6">
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
              const stableSessionKey = getStableLiveSessionKey(session);
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
                        photoUrl: state.playerAPhotoUrl ?? null,
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
                        photoUrl: state.playerBPhotoUrl ?? null,
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
                      expanded={
                        !dismissedLiveSessionKeys.has(stableSessionKey) &&
                        expandedSessions.has(session.sessionId)
                      }
                      onExpandedChange={(expanded) =>
                        handleExpandedChange(
                          expanded,
                          session.sessionId,
                          stableSessionKey,
                        )
                      }
                      topLeftControl={
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
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_0.85fr] lg:px-10 lg:py-10">
          <div className="flex flex-col justify-between gap-8">
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={switchToLive}
                className={
                  activeView === "live"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Live
              </button>
              <button
                type="button"
                onClick={switchToTournament}
                className={
                  activeView === "tournament" &&
                  tournamentPanelMode === "stages"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Tournament
              </button>
              <button
                type="button"
                onClick={() => {
                  setTournamentPanelMode("timetable");
                  setActiveView("tournament");
                }}
                className={
                  activeView === "tournament" &&
                  tournamentPanelMode === "timetable"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                }
              >
                Time table
              </button>
              <button
                type="button"
                onClick={openFinalStandings}
                className={
                  activeView === "tournament" &&
                  tournamentPanelMode === "finals"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                }
              >
                Final standings
              </button>
              <button
                type="button"
                onClick={() => {
                  setTournamentPanelMode("gallery");
                  setActiveView("tournament");
                }}
                className={
                  activeView === "tournament" &&
                  tournamentPanelMode === "gallery"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                }
              >
                Photo gallery
              </button>
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
