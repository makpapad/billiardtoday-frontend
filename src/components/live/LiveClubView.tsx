"use client";

import React, { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
const STALE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const LiveScoreBoardCard = dynamic(() => import('@/components/LiveScoreBoardCard').then(mod => mod.LiveScoreBoardCard), { ssr: false });

type ClubSummary = {
  name: string;
  documentId: string;
  slug?: string;
  city?: string | null;
  federation?: {
    name: string;
  } | null;
};

type Props = {
  club: ClubSummary;
  embedded?: boolean;
};

type InningDetailEntry = {
  inning: number;
  player1?: { pt: number; tot: number };
  player2?: { pt: number; tot: number };
};

type PlayerChartPoint = {
  inning: number;
  run: number;
  total: number;
};

type SessionSnapshot = {
  innings: number;
  player1Points: number;
  player2Points: number;
};

type LiveScoreState = {
  scoreA?: number;
  scoreB?: number;
  runA?: number;
  runB?: number;
  liveRunA?: number;
  liveRunB?: number;
  current?: "A" | "B";
  inningsA?: number;
  inningsB?: number;
  inningsCount?: number;
  bestRunA?: number;
  bestRunB?: number;
  ended?: boolean;
  playerAName?: string;
  playerBName?: string;
  playerACountry?: string | null;
  playerBCountry?: string | null;
  playerAPhotoUrl?: string | null;
  playerBPhotoUrl?: string | null;
  playerAPhotoMainUrl?: string | null;
  playerBPhotoMainUrl?: string | null;
  progress?: number;
  totalBlocks?: number;
  isRunning?: boolean;
  timeoutsA?: number;
  timeoutsB?: number;
  maxTimeoutsA?: number;
  maxTimeoutsB?: number;
  avgFormattedA?: string;
  avgFormattedB?: string;
  accPercentA?: number;
  accPercentB?: number;
  playerATimeSeconds?: number;
  playerBTimeSeconds?: number;
  secondsPerInningA?: number;
  secondsPerInningB?: number;
  targetPointsA?: number | null;
  targetPointsB?: number | null;
  gameDurationSeconds?: number;
  inningsDetail?: InningDetailEntry[];
  tournamentName?: string | null;
  stageName?: string | null;
  groupName?: string | null;
  tableName?: string | null;
  matchSheet?: unknown;
  matchSheetJson?: unknown;
  sheet?: unknown;
};

type SessionMeta = {
  tournamentName?: string | null;
  stageName?: string | null;
  groupName?: string | null;
  tableName?: string | null;
};

const SHEET_TOURNAMENT_KEY = "scoreboard.sheet.tournamentName";
const SHEET_STAGE_KEY = "scoreboard.sheet.stage";
const SHEET_GROUP_KEY = "scoreboard.sheet.group";
const SHEET_TABLE_KEY = "scoreboard.sheet.table";

function normalizeMetaValue(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return `${value}`.trim();
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function collectSessionMeta(source: any): SessionMeta {
  const meta: SessionMeta = {};

  const assignCandidate = (candidate?: SessionMeta) => {
    if (!candidate) return;
    if (candidate.tournamentName && !meta.tournamentName) meta.tournamentName = candidate.tournamentName;
    if (candidate.stageName && !meta.stageName) meta.stageName = candidate.stageName;
    if (candidate.groupName && !meta.groupName) meta.groupName = candidate.groupName;
    if (candidate.tableName && !meta.tableName) meta.tableName = candidate.tableName;
  };

  const process = (value: any) => {
    if (!value) return;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        process(parsed);
      } catch {
        // treat plain string as tournament name fallback
        assignCandidate({ tournamentName: normalizeMetaValue(value) });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(process);
      return;
    }
    if (typeof value === "object") {
      if (value.data) process(value.data);
      if (value.attributes) process(value.attributes);
      const readField = (obj: any, keys: string[]): string | null => {
        for (const key of keys) {
          const val = normalizeMetaValue(obj?.[key]);
          if (val) return val;
        }
        return null;
      };
      assignCandidate({
        tournamentName: readField(value, ["tournamentName", "eventTitle", "tournament", "tournament_label", "tournamentTitle"]),
        stageName: readField(value, ["stageName", "stageTitle", "stage", "stage_label"]),
        groupName: readField(value, ["groupName", "groupLabel", "group", "group_label"]),
        tableName:
          readField(value, ["tableName", "table", "tableLabel", "table_label"]) ??
          (normalizeMetaValue(value?.tableNumber) ?? normalizeMetaValue(value?.tableNo)),
      });
      return;
    }
  };

  process(source);
  return meta;
}

function mergeSessionMeta(...sources: any[]): SessionMeta {
  const meta: SessionMeta = {};
  for (const source of sources) {
    const candidate = collectSessionMeta(source);
    if (candidate.tournamentName && !meta.tournamentName) meta.tournamentName = candidate.tournamentName;
    if (candidate.stageName && !meta.stageName) meta.stageName = candidate.stageName;
    if (candidate.groupName && !meta.groupName) meta.groupName = candidate.groupName;
    if (candidate.tableName && !meta.tableName) meta.tableName = candidate.tableName;
  }
  return meta;
}

function extractTargetPointsFromSource(source: any): number | null {
  const readNum = (value: any): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const walk = (value: any): number | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return walk(JSON.parse(value));
      } catch {
        return null;
      }
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found !== null) return found;
      }
      return null;
    }
    if (typeof value === "object") {
      if (value.data) {
        const foundData = walk(value.data);
        if (foundData !== null) return foundData;
      }
      if (value.attributes) {
        const foundAttrs = walk(value.attributes);
        if (foundAttrs !== null) return foundAttrs;
      }

      const direct =
        readNum(value.targetPoints) ??
        readNum(value.target_points) ??
        readNum(value.targetPoint) ??
        readNum(value.target) ??
        readNum(value.pointsToWin) ??
        readNum(value.goalPoints) ??
        readNum(value.equalInningPoints) ??
        readNum(value.equal_inning_points) ??
        readNum(value.targetP1) ??
        readNum(value.targetP2) ??
        readNum(value.targetPointsP1) ??
        readNum(value.targetPointsP2);
      if (direct !== null) return direct;
    }
    return null;
  };

  return walk(source);
}

function normalizeTargetPoints(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildInningsDetailFromSnapshots(snapshots: SessionSnapshot[]): InningDetailEntry[] {
  if (!Array.isArray(snapshots) || snapshots.length < 2) return [];
  const map = new Map<number, InningDetailEntry>();
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const inning = Math.max(1, Number.isFinite(prev.innings) ? prev.innings : i);
    if (!map.has(inning)) map.set(inning, { inning });
    const entry = map.get(inning)!;
    const prevP1 = Number(entry.player1?.pt ?? 0);
    const prevP2 = Number(entry.player2?.pt ?? 0);
    const deltaP1 = Math.max(0, (curr.player1Points ?? 0) - (prev.player1Points ?? 0));
    const deltaP2 = Math.max(0, (curr.player2Points ?? 0) - (prev.player2Points ?? 0));
    entry.player1 = {
      pt: prevP1 + deltaP1,
      tot: Math.max(0, curr.player1Points ?? 0),
    };
    entry.player2 = {
      pt: prevP2 + deltaP2,
      tot: Math.max(0, curr.player2Points ?? 0),
    };
  }
  return Array.from(map.values()).filter((entry) => {
    const totalP1 = entry.player1?.tot ?? 0;
    const totalP2 = entry.player2?.tot ?? 0;
    return totalP1 > 0 || totalP2 > 0;
  }).sort((a, b) => a.inning - b.inning);
}

function extractInningsDetail(source: any): InningDetailEntry[] | undefined {
  if (!source) return undefined;
  const resolve = (val: any): InningDetailEntry[] | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val as InningDetailEntry[];
    if (Array.isArray(val?.inningsDetail)) return val.inningsDetail as InningDetailEntry[];
    if (Array.isArray(val?.data?.attributes?.inningsDetail)) return val.data.attributes.inningsDetail as InningDetailEntry[];
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return resolve(parsed);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  return (
    resolve(source) ??
    resolve(source.matchSheet) ??
    resolve(source.attributes) ??
    resolve(source.data?.attributes) ??
    undefined
  );
}

function buildPlayerChartSeries(
  entries: InningDetailEntry[],
  playerKey: "player1" | "player2",
  fallbackScore: number,
  fallbackInnings: number,
): PlayerChartPoint[] {
  const sorted = Array.isArray(entries) ? [...entries].sort((a, b) => a.inning - b.inning) : [];
  const series: PlayerChartPoint[] = [];
  let lastTotal = 0;

  for (const entry of sorted) {
    if (!Number.isFinite(entry.inning)) continue;
    const playerEntry = entry[playerKey];
    const run = Math.max(0, Number(playerEntry?.pt) || 0);
    const nextTotalFromEntry = Number(playerEntry?.tot);
    lastTotal = Number.isFinite(nextTotalFromEntry)
      ? Math.max(0, nextTotalFromEntry)
      : Math.max(0, lastTotal + run);

    series.push({
      inning: Math.max(1, entry.inning),
      run,
      total: lastTotal,
    });
  }

  const fallbackTotal = Math.max(lastTotal, Math.max(0, Number(fallbackScore) || 0));
  const lastSeriesInning = series.length > 0 ? series[series.length - 1].inning : 1;
  const fallbackInningsSafe =
    Math.max(1, Number.isFinite(fallbackInnings) && fallbackInnings ? fallbackInnings : lastSeriesInning || 1) || 1;

  if (series.length === 0) {
    if (fallbackTotal <= 0) return [];
    series.push({
      inning: fallbackInningsSafe,
      run: fallbackTotal,
      total: fallbackTotal,
    });
  } else {
    const lastPoint = series[series.length - 1];
    if (fallbackTotal > lastPoint.total || fallbackInningsSafe > lastPoint.inning) {
      series.push({
        inning: Math.max(fallbackInningsSafe, lastPoint.inning + 1),
        run: Math.max(0, fallbackTotal - lastPoint.total),
        total: fallbackTotal,
      });
    }
  }

  return series;
}

type LiveScoreItem = {
  id: string | number;
  sessionId: string;
  screenId?: string;
  state: LiveScoreState;
  updatedAt?: string;
  clubId?: string | number | null;
  clubName?: string | null;
  clubCity?: string | null;
  clubFederationName?: string | null;
};

type LiveScorePayload = {
  screenId: string;
  sessionId?: string | null;
  clubId?: string | number | null;
  clubName?: string | null;
  clubCity?: string | null;
  clubFederationName?: string | null;
  player1PhotoUrl?: string | null;
  player2PhotoUrl?: string | null;
  current?: "A" | "B";
  activePlayer?: 1 | 2;
  ended?: boolean;
  ts?: number; // Add timestamp property
  innings?: number;
  progress?: number;
  totalBlocks?: number;
  isRunning?: boolean;
  gameDurationSeconds?: number;
  targetPoints?: number;
  targetPointsP1?: number;
  targetPointsP2?: number;
  liveRun?: {
    player1?: number;
    player2?: number;
  };
  players?: Array<{
    points?: number;
    innings?: number;
    hr?: number;
    run?: number;
    liveRun?: number;
    name?: string;
    country?: string | null;
    photoUrl?: string | null;
    photoMainUrl?: string | null;
    photo_main?: string | null;
    photo?: string | null;
    avatarUrl?: string | null;
    imageUrl?: string | null;
    timeoutsUsed?: number;
    maxTimeouts?: number;
    avgFormatted?: string;
    accPercent?: number;
    playerTimeSeconds?: number;
    secondsPerInning?: number;
    targetPoints?: number;
  }>;
  inningsDetail?: InningDetailEntry[];
  matchSheet?: unknown;
  matchSheetJson?: unknown;
  sheet?: unknown;
};

export function LiveClubView({ club }: Props) {
  const clubId = club.documentId;
  const [items, setItems] = useState<LiveScoreItem[]>([]);
  const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(new Set());
  const [highlightItem, setHighlightItem] = useState<LiveScoreItem | null>(null);
  const itemsRef = React.useRef<LiveScoreItem[]>([]);
  const sessionSnapshotsRef = React.useRef<Map<string, SessionSnapshot[]>>(new Map());
  const sessionDetailsRef = React.useRef<Map<string, InningDetailEntry[]>>(new Map());
  const sessionTargetsRef = React.useRef<Map<string, { a: number | null; b: number | null }>>(new Map());
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  React.useEffect(() => {
    if (!highlightItem) return;
    const fresh =
      items.find((x) => x.sessionId === highlightItem.sessionId) ??
      items.find((x) => x.screenId && x.screenId === highlightItem.screenId);
    if (fresh && fresh !== highlightItem) {
      setHighlightItem(fresh);
    }
  }, [items, highlightItem]);
  const [endedScreens, setEndedScreens] = useState<Set<string>>(new Set()); // Track ended games
  const endedScreensRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    endedScreensRef.current = endedScreens;
  }, [endedScreens]);
  const [err, setErr] = React.useState<string | null>(null);

  const recordSnapshot = React.useCallback((sessionKey: string | undefined | null, snapshot: SessionSnapshot) => {
    if (!sessionKey) return;
    const map = sessionSnapshotsRef.current;
    const prev = map.get(sessionKey) ?? [];
    const next = [...prev, snapshot];
    if (next.length > 300) next.splice(0, next.length - 300);
    map.set(sessionKey, next);
  }, []);

  const resolveFallbackInningsDetail = React.useCallback((sessionKey: string | undefined | null) => {
    if (!sessionKey) return undefined;
    const snapshots = sessionSnapshotsRef.current.get(sessionKey);
    if (!snapshots) return undefined;
    const detail = buildInningsDetailFromSnapshots(snapshots);
    return detail.length > 0 ? detail : undefined;
  }, []);

  const fetchSessionTargetsOnce = React.useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    if (sessionTargetsRef.current.has(sessionId)) return;
    sessionTargetsRef.current.set(sessionId, { a: null, b: null });
    try {
      const res = await fetch(`/api/scoreboard/session-by-id/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const row = Array.isArray(json?.data) ? json.data[0] : null;
      if (!row) return;

      const a =
        normalizeTargetPoints((row as any).targetPointsP1) ??
        normalizeTargetPoints((row as any).targetP1) ??
        normalizeTargetPoints((row as any).targetPoints) ??
        extractTargetPointsFromSource((row as any).matchSheet) ??
        extractTargetPointsFromSource((row as any).matchSheetJson) ??
        extractTargetPointsFromSource((row as any).sheet) ??
        null;
      const b =
        normalizeTargetPoints((row as any).targetPointsP2) ??
        normalizeTargetPoints((row as any).targetP2) ??
        normalizeTargetPoints((row as any).targetPoints) ??
        extractTargetPointsFromSource((row as any).matchSheet) ??
        extractTargetPointsFromSource((row as any).matchSheetJson) ??
        extractTargetPointsFromSource((row as any).sheet) ??
        null;
      const photoMainA =
        (row as any).player1PhotoMainUrl ??
        (row as any).player1PhotoMain ??
        null;
      const photoMainB =
        (row as any).player2PhotoMainUrl ??
        (row as any).player2PhotoMain ??
        null;

      sessionTargetsRef.current.set(sessionId, { a, b });
      if (a === null && b === null && !photoMainA && !photoMainB) return;

      setItems((prev) =>
        prev.map((it) =>
          it.sessionId === sessionId
            ? {
                ...it,
                state: {
                  ...it.state,
                  targetPointsA: it.state?.targetPointsA ?? a,
                  targetPointsB: it.state?.targetPointsB ?? b,
                  playerAPhotoMainUrl: it.state?.playerAPhotoMainUrl ?? photoMainA,
                  playerBPhotoMainUrl: it.state?.playerBPhotoMainUrl ?? photoMainB,
                },
              }
            : it,
        ),
      );
    } catch {}
  }, []);

  const pruneItems = React.useCallback(() => {
    const now = Date.now();
    setItems((prev) => {
      const filtered = prev.filter((item) => {
        if (item.state?.ended) return false;
        if (!item.updatedAt) return true;
        const updatedAtMs = Date.parse(item.updatedAt);
        if (Number.isNaN(updatedAtMs)) return true;
        return now - updatedAtMs <= STALE_TTL_MS;
      });

      const byScreen = new Map<string, LiveScoreItem>();
      const out: LiveScoreItem[] = [];

      for (const it of filtered) {
        const sid = it.screenId;
        if (!sid) {
          out.push(it);
          continue;
        }
        const existing = byScreen.get(sid);
        if (!existing) {
          byScreen.set(sid, it);
          continue;
        }
        const a = Date.parse(existing.updatedAt || "");
        const b = Date.parse(it.updatedAt || "");
        if ((Number.isNaN(a) ? 0 : a) <= (Number.isNaN(b) ? 0 : b)) {
          byScreen.set(sid, it);
        }
      }

      for (const v of byScreen.values()) out.push(v);
      return out;
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      // Load current sessions for this club
      if (!clubId) return;
      const statusFilter = "in_progress,pending";
      const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}/sessions?status=${statusFilter}&fallback=true`);
      if (!res.ok) {
        setErr(`Failed to load sessions: ${res.statusText}`);
        setItems([]);
        return;
      }
      const data = await res.json();
      const sessions: any[] = Array.isArray(data?.data) ? [...data.data] : [];
      if (sessions.length === 0 && Array.isArray(data?.fallback?.data) && data.fallback.data.length > 0) {
        console.log('[live view] Using fallback sessions from Strapi due to empty primary response');
        sessions.push(...data.fallback.data);
      }
      
      // Convert sessions to live score items
      const nextItems = sessions.map((session: any) => {
        const players = Array.isArray(session.players) ? session.players : [];
        const sessionKey = String(session.id || session.documentId || session.screenId || "");
        const directDetail =
          extractInningsDetail(session.inningsDetail) ??
          extractInningsDetail(session.matchSheet) ??
          extractInningsDetail(session.matchSheetJson) ??
          extractInningsDetail(session.match_sheet);
        const meta = mergeSessionMeta(
          session,
          session.matchSheet,
          session.matchSheetJson,
          session.match_sheet,
          session.metadata,
          session.meta,
        );
        const state: LiveScoreState = {
          scoreA: players[0]?.points ?? 0,
          scoreB: players[1]?.points ?? 0,
          runA: players[0]?.run ?? 0,
          runB: players[1]?.run ?? 0,
          liveRunA: players[0]?.liveRun ?? 0,
          liveRunB: players[1]?.liveRun ?? 0,
          current: session.current ?? undefined,
          inningsA: players[0]?.innings ?? 0,
          inningsB: players[1]?.innings ?? 0,
          inningsCount: session.innings ?? session.totalInnings ?? session.currentInning ?? 0,
          bestRunA: players[0]?.hr ?? 0,
          bestRunB: players[1]?.hr ?? 0,
          ended: false,
          playerAName: players[0]?.name,
          playerBName: players[1]?.name,
          playerACountry: session.player1Country ?? players[0]?.country ?? null,
          playerBCountry: session.player2Country ?? players[1]?.country ?? null,
          playerAPhotoUrl:
            session.player1PhotoUrl ??
            players[0]?.photoUrl ??
            players[0]?.photo ??
            players[0]?.avatarUrl ??
            players[0]?.imageUrl ??
            null,
          playerAPhotoMainUrl:
            session.player1PhotoMainUrl ??
            players[0]?.photoMainUrl ??
            players[0]?.photo_main ??
            null,
          playerBPhotoUrl:
            session.player2PhotoUrl ??
            players[1]?.photoUrl ??
            players[1]?.photo ??
            players[1]?.avatarUrl ??
            players[1]?.imageUrl ??
            null,
          playerBPhotoMainUrl:
            session.player2PhotoMainUrl ??
            players[1]?.photoMainUrl ??
            players[1]?.photo_main ??
            null,
          progress: session.progress ?? 0,
          totalBlocks: session.totalBlocks ?? 40,
          isRunning: Boolean(session.isRunning),
          timeoutsA: players[0]?.timeoutsUsed ?? players[0]?.timeouts ?? 0,
          timeoutsB: players[1]?.timeoutsUsed ?? players[1]?.timeouts ?? 0,
          maxTimeoutsA: players[0]?.maxTimeouts ?? 3,
          maxTimeoutsB: players[1]?.maxTimeouts ?? 3,
          avgFormattedA: players[0]?.avgFormatted,
          avgFormattedB: players[1]?.avgFormatted,
          accPercentA: players[0]?.accPercent,
          accPercentB: players[1]?.accPercent,
          playerATimeSeconds: players[0]?.playerTimeSeconds,
          playerBTimeSeconds: players[1]?.playerTimeSeconds,
          secondsPerInningA: players[0]?.secondsPerInning,
          secondsPerInningB: players[1]?.secondsPerInning,
          targetPointsA:
            normalizeTargetPoints(players[0]?.targetPoints) ??
            normalizeTargetPoints((players as any)?.[0]?.target_points) ??
            normalizeTargetPoints(session.targetPointsP1) ??
            normalizeTargetPoints((session as any).target_points_p1) ??
            normalizeTargetPoints(session.targetPoints) ??
            normalizeTargetPoints((session as any).target_points) ??
            normalizeTargetPoints((session as any).targetP1) ??
            extractTargetPointsFromSource(session.matchSheet) ??
            extractTargetPointsFromSource(session.matchSheetJson) ??
            extractTargetPointsFromSource(session.sheet) ??
            null,
          targetPointsB:
            normalizeTargetPoints(players[1]?.targetPoints) ??
            normalizeTargetPoints((players as any)?.[1]?.target_points) ??
            normalizeTargetPoints(session.targetPointsP2) ??
            normalizeTargetPoints((session as any).target_points_p2) ??
            normalizeTargetPoints(session.targetPoints) ??
            normalizeTargetPoints((session as any).target_points) ??
            normalizeTargetPoints((session as any).targetP2) ??
            extractTargetPointsFromSource(session.matchSheet) ??
            extractTargetPointsFromSource(session.matchSheetJson) ??
            extractTargetPointsFromSource(session.sheet) ??
            null,
          gameDurationSeconds: session.gameDurationSeconds ?? null,
          inningsDetail: directDetail,
          tournamentName: meta.tournamentName ?? null,
          stageName: meta.stageName ?? null,
          groupName: meta.groupName ?? null,
          tableName: meta.tableName ?? null,
        };
        recordSnapshot(sessionKey, {
          innings: (state.inningsCount ?? state.inningsA ?? state.inningsB ?? Number(session.innings)) || 1,
          player1Points: state.scoreA ?? 0,
          player2Points: state.scoreB ?? 0,
        });
        if (!state.inningsDetail || state.inningsDetail.length === 0) {
          state.inningsDetail = resolveFallbackInningsDetail(sessionKey);
        }
        if (state.inningsDetail && state.inningsDetail.length > 0) {
          sessionDetailsRef.current.set(sessionKey, state.inningsDetail);
        } else {
          const cachedDetail = sessionDetailsRef.current.get(sessionKey);
          if (cachedDetail?.length) {
            state.inningsDetail = cachedDetail;
          }
        }
        
        // Handle both direct fields and nested club object
        const clubId = session.club?.documentId ?? session.clubId ?? session.club?.id ?? null;
        const clubName = session.clubName ?? session.club?.name ?? null;
        const clubCity = session.clubCity ?? session.club?.city ?? null;
        const clubFederationName = session.clubFederationName ?? session.club?.federation?.name ?? null;
        
        return {
          id: session.id || session.documentId,
          sessionId: session.id || session.documentId,
          state,
          updatedAt: new Date().toISOString(),
          clubId,
          clubName,
          clubCity,
          clubFederationName,
        } as LiveScoreItem;
      });
      
      if (nextItems.length > 0) {
        setItems(nextItems);
        nextItems.forEach((it) => {
          if (!it.sessionId) return;
          if (it.state?.targetPointsA == null || it.state?.targetPointsB == null) {
            void fetchSessionTargetsOnce(it.sessionId);
          }
        });
      } else {
        console.log('[live view] Strapi returned no sessions; keeping current state and pruning old items');
        pruneItems();
      }
      setErr(null);
    } catch (e: any) {
      console.warn('[live view] Failed to load sessions, keeping previous items', e);
      setErr(e?.message || "Network/API error");
      pruneItems();
    }
  }, [clubId, pruneItems, fetchSessionTargetsOnce]);

  React.useEffect(() => {
    load();
    console.log('[live view] Initial load completed, items:', items.map(x => ({ id: x.id, sessionId: x.sessionId })));
  }, [load]);

  // Keep refreshing sessions periodically so live view never stays empty when a session exists
  React.useEffect(() => {
    if (!clubId) return;
    const interval = setInterval(() => {
      load();
    }, 20000);
    return () => clearInterval(interval);
  }, [clubId, load]);

  // Periodically prune stale items so old sessions disappear automatically
  React.useEffect(() => {
    const interval = setInterval(pruneItems, 30000);
    return () => clearInterval(interval);
  }, [pruneItems]);

  // Hydrate from localStorage to avoid blank screen on refresh while waiting for WS/Strapi
  React.useEffect(() => {
    if (!clubId || typeof window === "undefined") return;
    const storageKey = `scoreboard.live.club.${clubId}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return;
      const ageMs = typeof parsed.ts === "number" ? Date.now() - parsed.ts : 0;
      // Reject snapshots older than 5 minutes to avoid stale data
      if (ageMs > 5 * 60 * 1000) return;
      setItems(parsed.items);
      console.log('[live view] Hydrated items from storage snapshot');
    } catch (e) {
      console.warn('[live view] Failed to hydrate from storage', e);
    }
  }, [clubId]);

  // Persist latest snapshot so refresh keeps showing current game
  React.useEffect(() => {
    if (!clubId || typeof window === "undefined") return;
    const storageKey = `scoreboard.live.club.${clubId}`;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          ts: Date.now(),
          items,
        })
      );
    } catch (e) {
      console.warn('[live view] Failed to persist snapshot', e);
    }
  }, [clubId, items]);

  React.useEffect(() => {
    if (!clubId) return;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://ws.billiardtoday.com";
    if (!wsUrl) return;

    const params = new URLSearchParams();
    params.set('token', process.env.NEXT_PUBLIC_WS_TOKEN || '');
    const url = `${wsUrl}?${params.toString()}`;
    
    const socket = new WebSocket(url);
    socket.onopen = () => {
      console.log('[live view] WebSocket connected to:', url);
      // Send a message indicating we want to subscribe to this club's games
      const subscribeMessage = {
        type: 'subscribe:club',
        clubId: clubId,
      };
      console.log('[live view] Subscribing to club:', subscribeMessage);
      socket.send(JSON.stringify(subscribeMessage));
    };
    socket.onclose = () => {
      console.log('[live view] WebSocket disconnected');
    };
    socket.onerror = (error) => {
      console.log('[live view] WebSocket error:', error);
    };
    socket.onmessage = (event) => {
      console.log('[live view] Raw WebSocket message received:', event.data);
      try {
        const payload = JSON.parse(event.data as string) as { type?: string } & LiveScorePayload;
        console.log('[live view] Received payload:', {
          type: payload.type,
          clubId: payload.clubId,
          sessionId: payload.sessionId,
          screenId: payload.screenId,
          ended: payload.ended
        });
        
        const itemsSnapshot = itemsRef.current;
        const endedScreensSnapshot = endedScreensRef.current;

        // Match any score update where the clubId matches
        if (payload.type === "score:update" && String(payload.clubId) === String(clubId)) {
          // Ignore placeholder games (Player 1/Player 2) - these are stale cached payloads
          const hasPlaceholderNames = payload.players?.every(p => 
            !p.name || p.name === "Player 1" || p.name === "Player 2"
          );
          
          if (hasPlaceholderNames && !payload.ended) {
            console.log('[live view] Ignoring placeholder game (stale cache)');
            return;
          }
          
          // Ignore stale cached payloads
          const now = Date.now();
          const payloadAge = payload.ts ? now - payload.ts : Infinity;
          const isInitialLoad = itemsSnapshot.length === 0;
          const maxAge = isInitialLoad ? STALE_TTL_MS : 5 * 60 * 1000; // 60 minutes for initial load, 5 minutes for updates
          
          if (payloadAge > maxAge) {
            console.log('[live view] Ignoring stale cached payload (age:', Math.round(payloadAge/1000), 'seconds, maxAge:', Math.round(maxAge/1000), 'seconds)');
            return;
          }
          
          if (payload.ended === true) {
            const endedSessionId = payload.sessionId?.toString() || null;
            console.log('[live view] Game ended, removing session:', {
              removingSessionId: endedSessionId,
              screenId: payload.screenId,
              currentItems: itemsSnapshot.map(x => ({ id: x.id, sessionId: x.sessionId }))
            });
            setItems((prev) => prev.filter((x) => {
              if (endedSessionId) {
                return x.sessionId !== endedSessionId && x.id !== endedSessionId;
              }
              return x.id !== payload.screenId && x.sessionId !== payload.screenId;
            }));
            // Mark this screen as ended to ignore subsequent "new game" payloads
            setEndedScreens(prev => {
              const next = new Set(prev);
              next.add(payload.screenId);
              endedScreensRef.current = next;
              return next;
            });
            return;
          }
          
          // Ignore "new game" payloads after end game for the same screenId
          if (endedScreensSnapshot.has(payload.screenId)) {
            // Only allow real NEW games with a valid sessionId (not orphaned payloads)
            const hasRealPlayers = payload.players?.some(p => 
              p.name && p.name !== "Player 1" && p.name !== "Player 2"
            );
            const hasSessionId = payload.sessionId != null && payload.sessionId !== undefined;
            
            if (hasRealPlayers && hasSessionId) {
              console.log('[live view] Real game starting with sessionId, clearing ended screen:', payload.screenId);
              setEndedScreens(prev => {
                const newSet = new Set(prev);
                newSet.delete(payload.screenId);
                endedScreensRef.current = newSet;
                return newSet;
              });
            } else {
              console.log('[live view] Ignoring payload for ended screen (no sessionId or placeholder):', {
                screenId: payload.screenId,
                hasRealPlayers,
                hasSessionId,
                sessionId: payload.sessionId
              });
              return;
            }
          }

          const current: "A" | "B" | undefined =
            payload.current ??
            (payload.activePlayer === 1 ? "A" : payload.activePlayer === 2 ? "B" : undefined);

          const sessionKey = payload.sessionId?.toString() || payload.screenId || "";
          const detailFromPayload =
            extractInningsDetail(payload.inningsDetail) ??
            extractInningsDetail(payload.matchSheet) ??
            extractInningsDetail(payload.sheet);
          const metaFromPayload = mergeSessionMeta(
            payload,
            payload.matchSheet,
            payload.matchSheetJson,
            payload.sheet,
            (payload as any)?.metadata,
            (payload as any)?.meta,
          );
          const state: LiveScoreState = {
            scoreA: payload.players?.[0]?.points,
            scoreB: payload.players?.[1]?.points,
            runA: payload.players?.[0]?.run,
            runB: payload.players?.[1]?.run,
            liveRunA: payload.players?.[0]?.liveRun,
            liveRunB: payload.players?.[1]?.liveRun,
            current,
            inningsA: payload.players?.[0]?.innings,
            inningsB: payload.players?.[1]?.innings,
            inningsCount: payload.innings,
            bestRunA: payload.players?.[0]?.hr,
            bestRunB: payload.players?.[1]?.hr,
            ended: !!payload.ended,
            playerAName: payload.players?.[0]?.name,
            playerBName: payload.players?.[1]?.name,
            playerACountry:
              (payload as any)?.player1Country ??
              payload.players?.[0]?.country ??
              null,
            playerBCountry:
              (payload as any)?.player2Country ??
              payload.players?.[1]?.country ??
              null,
            playerAPhotoUrl:
              payload.player1PhotoUrl ??
              payload.players?.[0]?.photoUrl ??
              payload.players?.[0]?.photo ??
              payload.players?.[0]?.avatarUrl ??
              payload.players?.[0]?.imageUrl ??
              null,
            playerAPhotoMainUrl:
              (payload as any).player1PhotoMainUrl ??
              (payload.players as any)?.[0]?.photoMainUrl ??
              (payload.players as any)?.[0]?.photo_main ??
              null,
            playerBPhotoUrl:
              payload.player2PhotoUrl ??
              payload.players?.[1]?.photoUrl ??
              payload.players?.[1]?.photo ??
              payload.players?.[1]?.avatarUrl ??
              payload.players?.[1]?.imageUrl ??
              null,
            playerBPhotoMainUrl:
              (payload as any).player2PhotoMainUrl ??
              (payload.players as any)?.[1]?.photoMainUrl ??
              (payload.players as any)?.[1]?.photo_main ??
              null,
            progress: payload.progress,
            totalBlocks: payload.totalBlocks,
            isRunning: payload.isRunning,
            timeoutsA: payload.players?.[0]?.timeoutsUsed,
            timeoutsB: payload.players?.[1]?.timeoutsUsed,
            maxTimeoutsA: payload.players?.[0]?.maxTimeouts,
            maxTimeoutsB: payload.players?.[1]?.maxTimeouts,
            avgFormattedA: payload.players?.[0]?.avgFormatted,
            avgFormattedB: payload.players?.[1]?.avgFormatted,
            accPercentA: payload.players?.[0]?.accPercent,
            accPercentB: payload.players?.[1]?.accPercent,
            playerATimeSeconds: payload.players?.[0]?.playerTimeSeconds,
            playerBTimeSeconds: payload.players?.[1]?.playerTimeSeconds,
            secondsPerInningA: payload.players?.[0]?.secondsPerInning,
            secondsPerInningB: payload.players?.[1]?.secondsPerInning,
            targetPointsA:
              normalizeTargetPoints(payload.players?.[0]?.targetPoints) ??
              normalizeTargetPoints((payload.players as any)?.[0]?.target_points) ??
              normalizeTargetPoints(payload.targetPointsP1) ??
              normalizeTargetPoints((payload as any).target_points_p1) ??
              normalizeTargetPoints(payload.targetPoints) ??
              normalizeTargetPoints((payload as any).target_points) ??
              normalizeTargetPoints((payload as any).targetP1) ??
              extractTargetPointsFromSource(payload.matchSheet) ??
              extractTargetPointsFromSource(payload.matchSheetJson) ??
              extractTargetPointsFromSource(payload.sheet) ??
              null,
            targetPointsB:
              normalizeTargetPoints(payload.players?.[1]?.targetPoints) ??
              normalizeTargetPoints((payload.players as any)?.[1]?.target_points) ??
              normalizeTargetPoints(payload.targetPointsP2) ??
              normalizeTargetPoints((payload as any).target_points_p2) ??
              normalizeTargetPoints(payload.targetPoints) ??
              normalizeTargetPoints((payload as any).target_points) ??
              normalizeTargetPoints((payload as any).targetP2) ??
              extractTargetPointsFromSource(payload.matchSheet) ??
              extractTargetPointsFromSource(payload.matchSheetJson) ??
              extractTargetPointsFromSource(payload.sheet) ??
              null,
            gameDurationSeconds: payload.gameDurationSeconds,
            inningsDetail: detailFromPayload,
            tournamentName: metaFromPayload.tournamentName ?? null,
            stageName: metaFromPayload.stageName ?? null,
            groupName: metaFromPayload.groupName ?? null,
            tableName: metaFromPayload.tableName ?? null,
          };
          recordSnapshot(sessionKey, {
            innings:
              (
                payload.innings ??
                payload.players?.[0]?.innings ??
                payload.players?.[1]?.innings ??
                state.inningsCount ??
                state.inningsA ??
                state.inningsB
              ) || 1,
            player1Points: state.scoreA ?? 0,
            player2Points: state.scoreB ?? 0,
          });
          if (!state.inningsDetail || state.inningsDetail.length === 0) {
            state.inningsDetail = resolveFallbackInningsDetail(sessionKey);
          }
          if (state.inningsDetail && state.inningsDetail.length > 0) {
            sessionDetailsRef.current.set(sessionKey, state.inningsDetail);
          } else {
            const cachedDetail = sessionDetailsRef.current.get(sessionKey);
            if (cachedDetail?.length) {
              state.inningsDetail = cachedDetail;
            }
          }

          const item: LiveScoreItem = {
            id: payload.sessionId?.toString() || payload.screenId,
            sessionId: payload.sessionId?.toString() || payload.screenId,
            screenId: payload.screenId,
            state,
            updatedAt: new Date().toISOString(),
            clubId: payload.clubId,
            clubName: payload.clubName,
            clubCity: payload.clubCity,
            clubFederationName: payload.clubFederationName,
          };

          setItems((prev) => {
            console.log('[live view] Adding/updating item:', {
              sessionId: payload.sessionId,
              currentItems: prev.map(x => ({ id: x.id, sessionId: x.sessionId })),
              payloadScreenId: payload.screenId
            });
            const itemSessionId = payload.sessionId?.toString() || payload.screenId;
            const existing = prev.find((x) => x.screenId === payload.screenId) ?? prev.find((x) => x.sessionId === itemSessionId);
            if (existing) {
              const mergedState: LiveScoreState = {
                ...existing.state,
                ...state,
                playerAPhotoUrl: state.playerAPhotoUrl ?? existing.state?.playerAPhotoUrl ?? null,
                playerBPhotoUrl: state.playerBPhotoUrl ?? existing.state?.playerBPhotoUrl ?? null,
                playerAPhotoMainUrl: state.playerAPhotoMainUrl ?? existing.state?.playerAPhotoMainUrl ?? null,
                playerBPhotoMainUrl: state.playerBPhotoMainUrl ?? existing.state?.playerBPhotoMainUrl ?? null,
                targetPointsA: state.targetPointsA ?? existing.state?.targetPointsA ?? null,
                targetPointsB: state.targetPointsB ?? existing.state?.targetPointsB ?? null,
              };
              const mergedItem: LiveScoreItem = { ...item, state: mergedState };
              console.log('[live view] Updating existing item with new scores:', {
                oldScoreA: existing.state?.scoreA,
                newScoreA: state.scoreA,
                oldScoreB: existing.state?.scoreB,
                newScoreB: state.scoreB
              });
              return prev.map((x) => {
                if (x.screenId && x.screenId === payload.screenId) return { ...mergedItem, id: x.id };
                if (x.sessionId === itemSessionId) return { ...mergedItem, id: x.id };
                return x;
              });
            }
            console.log('[live view] Adding new item');
            return [item, ...prev];
          });
          if (item.sessionId && (state.targetPointsA == null || state.targetPointsB == null)) {
            void fetchSessionTargetsOnce(item.sessionId);
          }
        }
      } catch {}
    };
    socket.onerror = () => setErr("WebSocket error");
    socket.onclose = () => {};
    return () => socket.close();
  }, [clubId, fetchSessionTargetsOnce]);

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-blue-950 to-gray-900 flex items-center justify-center">
        <p className="text-sm text-red-400 bg-red-950/50 border border-red-900/60 px-4 py-3 rounded-xl shadow-lg">
          {err}
        </p>
      </div>
    );
  }

  const handleCardClick = (item: LiveScoreItem) => {
    setHighlightItem(item);
  };

  const tournamentOptions = React.useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of items) {
      const raw = item.state?.tournamentName;
      const label = typeof raw === "string" && raw.trim() ? raw.trim() : "Unknown Tournament";
      const key = label.toLowerCase();
      if (!unique.has(key)) unique.set(key, label);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "el"));
  }, [items]);

  const [selectedTournament, setSelectedTournament] = React.useState<string>("all");

  React.useEffect(() => {
    if (selectedTournament === "all") return;
    const exists = tournamentOptions.some((opt) => opt === selectedTournament);
    if (!exists) setSelectedTournament("all");
  }, [selectedTournament, tournamentOptions]);

  const filteredItems =
    selectedTournament === "all"
      ? items
      : items.filter((item) => {
          const raw = item.state?.tournamentName;
          const label = typeof raw === "string" && raw.trim() ? raw.trim() : "Unknown Tournament";
          return label === selectedTournament;
        });

  React.useEffect(() => {
    setExpandedSessions((prev) => {
      const valid = new Set(filteredItems.map((x) => x.sessionId));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredItems]);

  const handleExpandedChange = React.useCallback((expanded: boolean, sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">Live Feed</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{club.name}</h1>
            <p className="text-sm text-white/60 mt-1">
              Παρακολούθησε ενεργά scoreboards με real-time ενημέρωση.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="text-[10px] uppercase tracking-[0.25em] text-white/60">Tournament</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="h-10 min-w-[240px] max-w-[320px] rounded-xl border border-cyan-200/30 bg-slate-900/70 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300/50"
            >
              <option value="all">All tournaments</option>
              {tournamentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Live updates connected
            </div>
          </div>
        </header>

        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 text-white/70 p-6 text-center">
            Waiting for live scores...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((s) => {
              const st = s.state || {};
              return (
                <LiveScoreBoardCard
                  key={s.screenId || s.sessionId}
                  sessionId={s.sessionId}
                  clubName={s.clubName}
                  clubCity={s.clubCity}
                  updatedAt={s.updatedAt}
                  timerProgress={st.progress}
                  timerTotal={st.totalBlocks}
                  timerRunning={st.isRunning}
                  timeoutsUsed1={st.timeoutsA}
                  maxTimeouts1={st.maxTimeoutsA}
                  timeoutsUsed2={st.timeoutsB}
                  maxTimeouts2={st.maxTimeoutsB}
                  inningsCount={st.inningsCount}
                  gameDurationSeconds={st.gameDurationSeconds}
                  player1={{
                    name: st.playerAName || "Player A",
                    country: st.playerACountry ?? null,
                    photoUrl: st.playerAPhotoUrl ?? null,
                    points: st.scoreA ?? 0,
                    run: st.runA ?? 0,
                    liveRun: st.liveRunA ?? 0,
                    innings: st.inningsA ?? 0,
                    hr: st.bestRunA ?? 0,
                    flag: "🇬🇷",
                    avgFormatted: st.avgFormattedA,
                    accPercent: st.accPercentA,
                    secondsPerInning: st.secondsPerInningA,
                    targetPoints: st.targetPointsA ?? null,
                  }}
                  player2={{
                    name: st.playerBName || "Player B",
                    country: st.playerBCountry ?? null,
                    photoUrl: st.playerBPhotoUrl ?? null,
                    points: st.scoreB ?? 0,
                    run: st.runB ?? 0,
                    liveRun: st.liveRunB ?? 0,
                    innings: st.inningsB ?? 0,
                    hr: st.bestRunB ?? 0,
                    flag: "🇬🇷",
                    avgFormatted: st.avgFormattedB,
                    accPercent: st.accPercentB,
                    secondsPerInning: st.secondsPerInningB,
                    targetPoints: st.targetPointsB ?? null,
                  }}
                  current={st.current}
                  onNavigate={() => handleCardClick(s)}
                  expanded={expandedSessions.has(s.sessionId)}
                  onExpandedChange={handleExpandedChange}
                />
              );
            })}
          </div>
        )}
      </div>
      <LiveStatsHighlightModal item={highlightItem} onClose={() => setHighlightItem(null)} />
    </main>
  );
}

type HighlightModalProps = {
  item: LiveScoreItem | null;
  onClose: () => void;
};

function LiveStatsHighlightModal({ item, onClose }: HighlightModalProps) {
  const [modalScale, setModalScale] = React.useState(1);
  const modalCardRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const computeScale = () => {
      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;
      if (vw < 768) {
        setModalScale(1);
        return;
      }
      const node = modalCardRef.current;
      const naturalWidth = node?.offsetWidth || 1600;
      const naturalHeight = node?.offsetHeight || 980;
      const widthScale = (vw - 32) / naturalWidth;
      const heightScale = (vh - 32) / naturalHeight;
      const next = Math.min(1, widthScale, heightScale);
      const clamped = Math.max(0.74, next);
      setModalScale(clamped >= 0.99 ? 1 : Number(clamped.toFixed(3)));
    };

    const raf = window.requestAnimationFrame(computeScale);
    window.addEventListener("resize", computeScale, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", computeScale);
    };
  }, [item]);

  const formatAvg = (formatted?: string, fall?: number) => {
    if (formatted) return formatted;
    if (fall === undefined || fall === null || Number.isNaN(fall)) return "--";
    return Number(fall).toLocaleString("el-GR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const formatAcc = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return `${value.toFixed(1)}%`;
  };

  const formatSeconds = (value?: number | null, fallbackLabel = "s") => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return `${Math.max(0, value).toFixed(1)}${fallbackLabel}`;
  };

  const formatHHMM = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    const totalSeconds = Math.max(0, Math.floor(value));
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatMMSS = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const computeFallbackAcc = (score?: number, innings?: number) => {
    const s = Math.max(0, Number(score) || 0);
    const inn = Math.max(0, Number(innings) || 0);
    const denom = s + inn;
    if (denom <= 0) return null;
    return (s / denom) * 100;
  };

  const computeFallbackSecPer = (playerSeconds?: number, score?: number, innings?: number) => {
    if (playerSeconds === undefined || playerSeconds === null || playerSeconds <= 0) return null;
    const s = Math.max(0, Number(score) || 0);
    const inn = Math.max(0, Number(innings) || 0);
    const denom = Math.max(1, s + inn);
    if (denom <= 0) return null;
    return playerSeconds / denom;
  };

  const storedMeta = React.useMemo<SessionMeta>(() => {
    if (typeof window === "undefined") return {};
    const readKey = (key: string): string | null => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const trimmed = raw.trim();
        return trimmed.length > 0 ? trimmed : null;
      } catch {
        return null;
      }
    };
    return {
      tournamentName: readKey(SHEET_TOURNAMENT_KEY),
      stageName: readKey(SHEET_STAGE_KEY),
      groupName: readKey(SHEET_GROUP_KEY),
      tableName: readKey(SHEET_TABLE_KEY),
    };
  }, []);

  if (!item) return null;
  const state = item.state;
  const totalTime = state.gameDurationSeconds ?? state.playerATimeSeconds ?? state.playerBTimeSeconds ?? null;

  const normalizeDisplayValue = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const stripLeadingLabel = (value: string | null | undefined, label: string) => {
    const normalized = normalizeDisplayValue(value);
    if (!normalized) return null;
    const lower = normalized.toLowerCase();
    const labelLower = label.toLowerCase();
    if (lower.startsWith(labelLower)) {
      const stripped = normalized.slice(label.length).replace(/^[\s:\-]+/, "").trim();
      return stripped.length > 0 ? stripped : normalized;
    }
    return normalized;
  };

  const resolvedTournament = normalizeDisplayValue(state.tournamentName ?? storedMeta.tournamentName ?? null);
  const resolvedStage = normalizeDisplayValue(state.stageName ?? storedMeta.stageName ?? null);
  const resolvedGroup = stripLeadingLabel(state.groupName ?? storedMeta.groupName ?? null, "group");
  const resolvedTable = stripLeadingLabel(state.tableName ?? storedMeta.tableName ?? null, "table");

  const metaItems = [
    {
      label: "Tournament",
      value: resolvedTournament,
    },
    {
      label: "Stage",
      value: resolvedStage,
    },
    {
      label: "Group",
      value: resolvedGroup,
    },
    {
      label: "Table",
      value: resolvedTable,
    },
  ];

  const players = [
    {
      name: state.playerAName || "Player A",
      score: state.scoreA ?? 0,
      hr: state.bestRunA ?? 0,
      run: state.runA ?? 0,
      avg: formatAvg(state.avgFormattedA, state.scoreA && state.inningsA ? state.scoreA / Math.max(1, state.inningsA) : undefined),
      acc: formatAcc(state.accPercentA ?? computeFallbackAcc(state.scoreA, state.inningsA)),
      secPer: formatSeconds(state.secondsPerInningA ?? computeFallbackSecPer(state.playerATimeSeconds, state.scoreA, state.inningsA)),
      playerTime: formatMMSS(state.playerATimeSeconds),
      targetPct:
        typeof state.targetPointsA === "number" && state.targetPointsA > 0
          ? `${Math.min(100, Math.max(0, ((state.scoreA ?? 0) / state.targetPointsA) * 100)).toFixed(0)}%`
          : "--",
    },
    {
      name: state.playerBName || "Player B",
      score: state.scoreB ?? 0,
      hr: state.bestRunB ?? 0,
      run: state.runB ?? 0,
      avg: formatAvg(state.avgFormattedB, state.scoreB && state.inningsB ? state.scoreB / Math.max(1, state.inningsB) : undefined),
      acc: formatAcc(state.accPercentB ?? computeFallbackAcc(state.scoreB, state.inningsB)),
      secPer: formatSeconds(state.secondsPerInningB ?? computeFallbackSecPer(state.playerBTimeSeconds, state.scoreB, state.inningsB)),
      playerTime: formatMMSS(state.playerBTimeSeconds),
      targetPct:
        typeof state.targetPointsB === "number" && state.targetPointsB > 0
          ? `${Math.min(100, Math.max(0, ((state.scoreB ?? 0) / state.targetPointsB) * 100)).toFixed(0)}%`
          : "--",
    },
  ];
  const isDraw = (state.scoreA ?? 0) === (state.scoreB ?? 0);
  const maxPoints = Math.max(players[0].score ?? 0, players[1].score ?? 0, 1);
  const inferredInnings =
    state.inningsCount ?? state.inningsA ?? state.inningsB ?? Math.max(players[0].score ?? 0, players[1].score ?? 0, 1);
  const maxInnings = Math.max(
    inferredInnings,
    state.inningsA ?? 0,
    state.inningsB ?? 0,
    players[0].score ?? 0,
    players[1].score ?? 0,
    1,
  );
  const detailEntries = Array.isArray(state.inningsDetail) ? state.inningsDetail : [];
  const chartSeries = [
    buildPlayerChartSeries(detailEntries, "player1", players[0].score ?? 0, state.inningsA ?? inferredInnings),
    buildPlayerChartSeries(detailEntries, "player2", players[1].score ?? 0, state.inningsB ?? inferredInnings),
  ];
  const chartMaxInnings = Math.max(
    maxInnings,
    ...chartSeries.map((series) => (series.length ? series[series.length - 1]?.inning ?? 1 : 1)),
    1,
  );
  const chartMaxPoints = Math.max(
    maxPoints,
    ...chartSeries.map((series) => series.reduce((acc, pt) => Math.max(acc, pt.total), 0)),
    1,
  );

  const normalizePhotoUrl = (value?: string | null): string | null => {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
      if (apiBase && trimmed.startsWith("/uploads/")) return `${apiBase}${trimmed}`;
      return trimmed;
    }
    if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
    return null;
  };

  const countryToIso = (raw?: string | null) => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toLowerCase();
    const key = trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const map: Record<string, string> = {
      greece: "gr",
      greek: "gr",
      cyprus: "cy",
      turkey: "tr",
      france: "fr",
      germany: "de",
      italy: "it",
      spain: "es",
      portugal: "pt",
      england: "gb",
      "united kingdom": "gb",
      "great britain": "gb",
      usa: "us",
      "united states": "us",
      "united states of america": "us",
      canada: "ca",
      mexico: "mx",
      netherlands: "nl",
      belgium: "be",
      poland: "pl",
      romania: "ro",
      bulgaria: "bg",
      serbia: "rs",
      croatia: "hr",
      slovenia: "si",
      hungary: "hu",
      ukraine: "ua",
      russia: "ru",
      egypt: "eg",
      qatar: "qa",
      japan: "jp",
      korea: "kr",
      "south korea": "kr",
      china: "cn",
    };
    return map[key] ?? null;
  };

  const modalPhotoFallback = "/shooterspool-3-cushion-billiards.webp";
  const leftPhoto = normalizePhotoUrl(state.playerAPhotoMainUrl ?? state.playerAPhotoUrl ?? null) ?? modalPhotoFallback;
  const rightPhoto = normalizePhotoUrl(state.playerBPhotoMainUrl ?? state.playerBPhotoUrl ?? null) ?? modalPhotoFallback;
  const leftFlag = countryToIso(state.playerACountry ?? null);
  const rightFlag = countryToIso(state.playerBCountry ?? null);
  const leftFlagUrl = leftFlag ? `https://flagcdn.com/w1600/${leftFlag}.png` : null;
  const rightFlagUrl = rightFlag ? `https://flagcdn.com/w1600/${rightFlag}.png` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          {leftPhoto ? (
            <div
              className="absolute inset-0 opacity-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${leftPhoto})` }}
            />
          ) : null}
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          {rightPhoto ? (
            <div
              className="absolute inset-0 opacity-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${rightPhoto})` }}
            />
          ) : null}
        </div>
        <style jsx>{`
          @keyframes flagPanA {
            0% { transform: scale(1.05) translateX(0); }
            50% { transform: scale(1.12) translateX(2%); }
            100% { transform: scale(1.05) translateX(0); }
          }
          @keyframes flagPanB {
            0% { transform: scale(1.05) translateX(0); }
            50% { transform: scale(1.12) translateX(-2%); }
            100% { transform: scale(1.05) translateX(0); }
          }

        `}</style>
      </div>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      {leftFlagUrl ? (
        <div
          className="absolute bottom-0 left-0 z-[5] h-52 w-80 md:h-64 md:w-[28rem] opacity-30 pointer-events-none"
          style={{
            backgroundImage: `url(${leftFlagUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            clipPath: "polygon(0 0, 68% 0, 100% 100%, 0 100%)",
          }}
        />
      ) : null}
      {rightFlagUrl ? (
        <div
          className="absolute bottom-0 right-0 z-[5] h-52 w-80 md:h-64 md:w-[28rem] opacity-30 pointer-events-none"
          style={{
            backgroundImage: `url(${rightFlagUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 32% 100%)",
          }}
        />
      ) : null}
      <div
        ref={modalCardRef}
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-white/15 text-white bg-white/5 live-recap-zoom"
        style={
          modalScale < 1
            ? {
                transform: `scale(${modalScale})`,
                transformOrigin: "center center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-950/70 to-purple-900/75" />
        <div className="relative p-4 md:p-5 space-y-3">
          <div className="relative flex items-center py-1">
            <p className="text-sm uppercase tracking-[0.6em] text-white/70 flex-1 text-left">Live Recap</p>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-16">
                <Image
                  src="/billiard-Today_Logo.png"
                  alt="BilliardToday logo"
                  fill
                  className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
                  sizes="256px"
                  priority
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-auto text-white/70 hover:text-white transition text-xl border border-white/30 rounded-full w-10 h-10 flex items-center justify-center bg-black/10 backdrop-blur-sm"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] md:text-sm uppercase tracking-[0.3em] text-white/70 text-center">
            {metaItems.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2 min-w-[110px] justify-center">
                <span className="text-white/40">{entry.label}</span>
                <span className="text-white tracking-normal normal-case text-sm md:text-base font-semibold">
                  {entry.value?.trim?.() ? entry.value : "--"}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-3 items-center bg-white/5 rounded-2xl p-3 md:p-4 border border-white/10">
            <PlayerHighlightCard player={players[0]} isLeading={(state.scoreA ?? 0) >= (state.scoreB ?? 0)} isDraw={isDraw} tone="light" />
            <div className="text-center px-2">
              <div className="text-4xl font-black text-white/70 mb-2">VS</div>
              <div className="text-sm text-white/60">Innings: {state.inningsCount ?? state.inningsA ?? state.inningsB ?? "--"}</div>
              <div className="mt-1 text-[11px] text-white/45 uppercase tracking-[0.2em]">Total time</div>
              <div className="text-sm text-white/70 font-semibold leading-tight">{formatHHMM(totalTime)}</div>
            </div>
            <PlayerHighlightCard player={players[1]} isLeading={(state.scoreB ?? 0) > (state.scoreA ?? 0)} isDraw={isDraw} tone="yellow" />
          </div>

          <div className="md:hidden space-y-2.5">
            {players.map((player, idx) => (
              <div key={`mobile-${player.name}-${idx}`} className="bg-white/10 rounded-xl p-2.5 border border-white/10 flex flex-col gap-2">
                <PlayerHighlightCard
                  player={player}
                  isLeading={idx === 0 ? (state.scoreA ?? 0) >= (state.scoreB ?? 0) : (state.scoreB ?? 0) > (state.scoreA ?? 0)}
                  isDraw={isDraw}
                  tone={idx === 0 ? "light" : "yellow"}
                />
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <StatPill label="AVG" value={player.avg} />
                  <StatPill label="HR" value={player.hr?.toString() ?? "--"} />
                  <StatPill label="ACC" value={player.acc} />
                  <StatPill label="Sec/p" value={player.secPer} />
                  <StatPill label="P Time" value={player.playerTime} />
                  <StatPill label="Target" value={player.targetPct} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-2 gap-2.5">
            {players.map((player, idx) => (
              <div key={player.name + idx} className="bg-white/10 rounded-xl p-2.5 border border-white/10 flex flex-col gap-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] sm:text-xs">
                  <StatPill label="AVG" value={player.avg} />
                  <StatPill label="HR" value={player.hr?.toString() ?? "--"} />
                  <StatPill label="ACC" value={player.acc} />
                  <StatPill label="Sec/p" value={player.secPer} />
                  <StatPill label="P Time" value={player.playerTime} />
                  <StatPill label="Target" value={player.targetPct} />
                </div>
                
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <CombinedProgressChart
            seriesA={chartSeries[0]}
            seriesB={chartSeries[1]}
            maxPoints={chartMaxPoints}
            maxInnings={chartMaxInnings}
            playerAName={players[0].name}
            playerBName={players[1].name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerHighlightCard({
  player,
  isLeading,
  isDraw,
  tone,
}: {
  player: { name: string; score: number; hr: number; run: number };
  isLeading: boolean;
  isDraw: boolean;
  tone: "light" | "yellow";
}) {
  return (
    <div
      className={`text-center rounded-xl p-3 md:p-4 border ${
        tone === "yellow" ? "bg-yellow-400/30 border-yellow-300/50" : "bg-white/85 border-white/90 text-slate-950"
      }`}
    >
      <p className={`text-sm uppercase tracking-[0.4em] ${tone === "yellow" ? "text-white/70" : "text-slate-700"}`}>
        {isDraw ? "Draw" : isLeading ? "Leading" : "Chasing"}
      </p>
      <h3 className="text-xl font-semibold mt-1">{player.name}</h3>
      <p className="text-6xl md:text-7xl font-black mt-2 leading-none">{player.score}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-2 py-2 border border-white/10 text-center">
      <p className="text-[9px] uppercase tracking-[0.35em] text-white/50">{label}</p>
      <p className="text-2xl md:text-3xl font-semibold leading-tight">{value ?? "--"}</p>
    </div>
  );
}

function CombinedProgressChart({
  seriesA,
  seriesB,
  maxPoints,
  maxInnings,
  playerAName,
  playerBName,
}: {
  seriesA: PlayerChartPoint[];
  seriesB: PlayerChartPoint[];
  maxPoints: number;
  maxInnings: number;
  playerAName: string;
  playerBName: string;
}) {
  const width = 900;
  const height = 220;
  const padding = 12;
  const xStart = padding;
  const xEnd = width - padding;
  const yStart = height - padding;
  const yEnd = padding;
  const chartWidth = xEnd - xStart;
  const chartHeight = yStart - yEnd;

  const safeSeriesA = seriesA.filter((point) => Number.isFinite(point.total) && Number.isFinite(point.inning));
  const safeSeriesB = seriesB.filter((point) => Number.isFinite(point.total) && Number.isFinite(point.inning));
  const inningsDomain = [...safeSeriesA, ...safeSeriesB].map((p) => p.inning);
  const minInning = inningsDomain.length ? Math.min(...inningsDomain) : 1;
  const maxInningInData = inningsDomain.length ? Math.max(...inningsDomain) : maxInnings;
  const inningSpan = Math.max(1, maxInningInData - minInning);
  const viewBox = `0 0 ${width} ${height}`;
  const [hoveredPoint, setHoveredPoint] = React.useState<
    | {
        x: number;
        y: number;
        inning: number;
        run: number;
        total: number;
        player: "A" | "B";
      }
    | null
  >(null);

  if ((safeSeriesA.length === 0 && safeSeriesB.length === 0) || maxPoints <= 0 || maxInnings <= 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 text-sm h-56">
        No progression yet
      </div>
    );
  }

  const mapPoint = (point: PlayerChartPoint) => {
    const xRatio = Math.min(Math.max((point.inning - minInning) / inningSpan, 0), 1);
    const yRatio = Math.min(Math.max(point.total / maxPoints, 0), 1);
    const x = xStart + xRatio * chartWidth;
    const y = yStart - yRatio * chartHeight;
    return { x, y };
  };
  const yTicks = Array.from(
    { length: Math.max(0, Math.floor((maxPoints - 1) / 10)) },
    (_, idx) => (idx + 1) * 10,
  ).filter((val) => val < maxPoints);
  const yMinorTicks = Array.from(
    { length: Math.max(0, Math.floor((maxPoints - 1) / 5)) },
    (_, idx) => (idx + 1) * 5,
  ).filter((val) => val < maxPoints && val % 10 !== 0);
  const firstXTick = Math.ceil(minInning / 10) * 10;
  const xTicks: number[] = [];
  for (let tick = firstXTick; tick < maxInningInData; tick += 10) {
    xTicks.push(tick);
  }
  const firstXMinorTick = Math.ceil(minInning / 5) * 5;
  const xMinorTicks: number[] = [];
  for (let tick = firstXMinorTick; tick < maxInningInData; tick += 5) {
    if (tick % 10 !== 0) xMinorTicks.push(tick);
  }

  const buildPlot = (source: PlayerChartPoint[], player: "A" | "B") => {
    const points = source.map((point) => {
      const coords = mapPoint(point);
      return {
        ...coords,
        total: point.total ?? 0,
        inning: point.inning ?? 0,
        run: point.run ?? 0,
        projected: false,
        player,
      };
    });

    const lastActualPoint = source[source.length - 1];
    if (lastActualPoint && lastActualPoint.inning < maxInningInData) {
      const projectedPoint = {
        inning: maxInningInData,
        total: lastActualPoint.total ?? 0,
        run: 0,
        projected: true,
      };
      const coords = mapPoint(projectedPoint);
      points.push({
        ...coords,
        total: projectedPoint.total,
        inning: projectedPoint.inning,
        run: projectedPoint.run,
        projected: true,
        player,
      });
    }

    const path = points.map((point, idx) => `${idx === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    return { points, path };
  };

  const plottedA = buildPlot(safeSeriesA, "A");
  const plottedB = buildPlot(safeSeriesB, "B");

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-white/5 via-white/0 to-white/5 border border-white/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/50">Points vs Innings</div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/70">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white" />{playerAName}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-300" />{playerBName}</span>
        </div>
      </div>
      <div className="relative h-56">
        <svg viewBox={viewBox} className="absolute inset-0 w-full h-full">
          {/* Axes */}
          <line
            x1={xStart}
            y1={yStart}
            x2={xEnd}
            y2={yStart}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <line
            x1={xStart}
            y1={yEnd}
            x2={xStart}
            y2={yStart}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          {/* Grid */}
          {yMinorTicks.map((tick) => {
            const y = yStart - (tick / maxPoints) * chartHeight;
            return (
              <g key={`h-minor-${tick}`}>
                <line
                  x1={xStart}
                  x2={xEnd}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth={1}
                  strokeDasharray="2 6"
                />
                <text
                  x={xStart - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.45)"
                  fontSize="8"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          {yTicks.map((tick) => {
            const y = yStart - (tick / maxPoints) * chartHeight;
            return (
              <g key={`h-${tick}`}>
                <line
                  x1={xStart}
                  x2={xEnd}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                <text
                  x={xStart - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.65)"
                  fontSize="9"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          {xMinorTicks.map((tick) => {
            const x = xStart + ((tick - minInning) / inningSpan) * chartWidth;
            return (
              <g key={`v-minor-${tick}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={yEnd}
                  y2={yStart}
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth={1}
                  strokeDasharray="2 6"
                />
                <text
                  x={x}
                  y={yStart + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.45)"
                  fontSize="8"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          {xTicks.map((tick) => {
            const x = xStart + ((tick - minInning) / inningSpan) * chartWidth;
            return (
              <g key={`v-${tick}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={yEnd}
                  y2={yStart}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                <text
                  x={x}
                  y={yStart + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.65)"
                  fontSize="9"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Player A line */}
          {plottedA.path ? <path d={plottedA.path} fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" /> : null}
          {/* Player B line */}
          {plottedB.path ? <path d={plottedB.path} fill="none" stroke="#facc15" strokeWidth={3} strokeLinecap="round" /> : null}
          {/* Points */}
          {[...plottedA.points, ...plottedB.points].map((point, idx) => (
            <g key={`pt-${idx}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.projected ? 4 : 3}
                fill={
                  point.projected
                    ? point.player === "A"
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(250,204,21,0.12)"
                    : point.player === "A"
                      ? "#ffffff"
                      : "#facc15"
                }
                stroke={point.projected ? (point.player === "A" ? "#ffffff" : "#facc15") : "#0f172a"}
                strokeWidth={point.projected ? 2 : 1.5}
                strokeDasharray={point.projected ? "3 2" : undefined}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-white/60 pointer-events-none">
          <div className="flex justify-between px-2">
            <span>Points</span>
            <span>{maxPoints}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>Innings</span>
            <span>{maxInningInData}</span>
          </div>
        </div>
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none bg-slate-900/90 text-[11px] text-white px-3 py-2 rounded-lg border border-white/15 shadow-lg"
            style={{
              left: `calc(${(hoveredPoint.x / width) * 100}% + 6px)`,
              top: `calc(${(hoveredPoint.y / height) * 100}% - 6px)`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className={`font-semibold tracking-wide ${hoveredPoint.player === "A" ? "text-amber-200" : "text-white"}`}>
              {hoveredPoint.player === "A" ? playerAName : playerBName} β€Ά Inning {hoveredPoint.inning}
            </div>
            <div>+{Math.max(0, hoveredPoint.run)} pts</div>
            <div className="text-white/70 text-[10px]">Total {hoveredPoint.total}</div>
          </div>
        )}
      </div>
    </div>
  );
}
