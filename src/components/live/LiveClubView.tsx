"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LiveScoreBoardCard } from "@/components/live/LiveScoreBoardCard";
import type { LiveSessionItem } from "@/components/live/types";

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

type LiveSessionsResponse = {
  data?: LiveSessionItem[];
  error?: string;
};

type WsPayload = Record<string, any> & {
  type?: string;
  clubId?: string | number | null;
  screenId?: string | null;
  screenIdentifier?: string | null;
  sessionId?: string | number | null;
  sessionDocumentId?: string | number | null;
  ended?: boolean;
  status?: string | null;
  session?: Record<string, any> | null;
};

const POLL_INTERVAL_MS = 15000;
const WS_URL =
  process.env.NEXT_PUBLIC_WS_ENDPOINT ||
  process.env.NEXT_PUBLIC_WS_URL ||
  "wss://ws.billiardtoday.com";
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

const buildLiveHref = (documentId: string, embedded?: boolean) =>
  embedded ? `/embed/live/${documentId}` : `/live/${documentId}`;

export function LiveClubView({ club, embedded = false }: Props) {
  const [items, setItems] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<LiveSessionItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/clubs/${encodeURIComponent(club.documentId)}/sessions?status=in_progress,pending`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Failed to load live sessions (${response.status})`);
        }

        const payload = (await response.json()) as LiveSessionsResponse;
        if (cancelled) return;

        const nextItems = Array.isArray(payload.data) ? payload.data : [];
        setItems((prev) => (nextItems.length > 0 ? nextItems : prev));
        setError(payload.error || null);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Failed to load live sessions");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [club.documentId]);

  useEffect(() => {
    if (!club.documentId || typeof window === "undefined") return;

    const params = new URLSearchParams();
    params.set("screenId", `club:${club.documentId}`);
    if (WS_TOKEN) params.set("token", WS_TOKEN);

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let closed = false;

    const upsertItem = (nextItem: LiveSessionItem) => {
      setItems((prev) => {
        const nextSessionId = String(nextItem.sessionId || "");
        const nextScreenId = nextItem.screenId || null;
        const index = prev.findIndex((item) => {
          if (nextScreenId && item.screenId === nextScreenId) return true;
          return String(item.sessionId || "") === nextSessionId;
        });

        if (index < 0) return [nextItem, ...prev];

        const existing = prev[index];
        const merged: LiveSessionItem = {
          ...existing,
          ...nextItem,
          state: {
            ...existing.state,
            ...nextItem.state,
          },
        };
        const clone = [...prev];
        clone[index] = merged;
        return clone;
      });
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimer) return;
      const delayMs = Math.min(10000, 1000 * 2 ** reconnectAttempts);
      reconnectAttempts += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(`${WS_URL}?${params.toString()}`);

      socket.onopen = () => {
        reconnectAttempts = 0;
        socket?.send(
          JSON.stringify({
            type: "subscribe:club",
            clubId: club.documentId,
          }),
        );
      };

      socket.onclose = () => {
        socket = null;
        scheduleReconnect();
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {}
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as WsPayload;
          if (String(payload.clubId || "") !== String(club.documentId)) return;

          if (payload.type === "SESSION_ASSIGNED" || payload.type === "SESSION_UPDATED") {
            const sessionObj = payload.session || {};
            const sessionId = String(
              sessionObj.documentId ??
                payload.sessionDocumentId ??
                sessionObj.id ??
                payload.sessionId ??
                "",
            );
            const screenId = String(
              payload.screenIdentifier ?? payload.screenId ?? sessionObj.screenIdentifier ?? "",
            ) || null;
            const status = String(payload.status ?? sessionObj.status ?? "");
            const ended = status === "finished" || status === "cancelled";

            if (!sessionId) return;

            if (ended) {
              setItems((prev) =>
                prev.filter((item) => {
                  if (screenId && item.screenId === screenId) return false;
                  return String(item.sessionId || "") !== sessionId;
                }),
              );
              return;
            }

            upsertItem({
              id: sessionId,
              sessionId,
              screenId,
              updatedAt: new Date().toISOString(),
              clubId: String(sessionObj.clubId ?? payload.clubId ?? club.documentId),
              clubName: sessionObj.clubName ?? club.name,
              clubCity: sessionObj.clubCity ?? club.city ?? null,
              clubFederationName: sessionObj.clubFederationName ?? club.federation?.name ?? null,
              state: {
                scoreA: Number(sessionObj.player1_points ?? 0),
                scoreB: Number(sessionObj.player2_points ?? 0),
                runA: 0,
                runB: 0,
                liveRunA: 0,
                liveRunB: 0,
                inningsA: Number(sessionObj.player1_innings ?? 0),
                inningsB: Number(sessionObj.player2_innings ?? 0),
                inningsCount: Math.max(
                  Number(sessionObj.player1_innings ?? 0),
                  Number(sessionObj.player2_innings ?? 0),
                  0,
                ),
                bestRunA: Number(sessionObj.player1_high_run ?? 0),
                bestRunB: Number(sessionObj.player2_high_run ?? 0),
                playerAName: sessionObj.player1Name ?? "Player A",
                playerBName: sessionObj.player2Name ?? "Player B",
                playerACountry: sessionObj.player1Country ?? null,
                playerBCountry: sessionObj.player2Country ?? null,
                playerAPhotoUrl: sessionObj.player1PhotoUrl ?? null,
                playerBPhotoUrl: sessionObj.player2PhotoUrl ?? null,
                progress: Number(sessionObj.progress ?? 0),
                totalBlocks: 40,
                isRunning: status === "in_progress",
                tournamentName: sessionObj.eventTitle ?? null,
                stageName: sessionObj.stageTitle ?? null,
                groupName: sessionObj.groupLabel ?? null,
                tableName: sessionObj.tableNumber ?? null,
              },
            });
            return;
          }

          if (payload?.type !== "score:update") return;

          const players = Array.isArray(payload.players) ? payload.players : [];
          const hasPlaceholderNames =
            players.length > 0 &&
            players.every((player) => !player?.name || player.name === "Player 1" || player.name === "Player 2");
          if (hasPlaceholderNames && !payload.ended) return;

          const sessionId = String(payload.sessionId || payload.screenId || "");
          const screenId = payload.screenId ? String(payload.screenId) : null;
          if (!sessionId) return;

          if (payload.ended === true) {
            setItems((prev) =>
              prev.filter((item) => {
                if (screenId && item.screenId === screenId) return false;
                return String(item.sessionId || "") !== sessionId;
              }),
            );
            return;
          }

          upsertItem({
            id: sessionId,
            sessionId,
            screenId,
            updatedAt: new Date().toISOString(),
            clubId: payload.clubId ? String(payload.clubId) : club.documentId,
            clubName: payload.clubName ?? club.name,
            clubCity: payload.clubCity ?? club.city ?? null,
            clubFederationName: payload.clubFederationName ?? club.federation?.name ?? null,
            state: {
              scoreA: Number(players[0]?.points ?? 0),
              scoreB: Number(players[1]?.points ?? 0),
              runA: Number(players[0]?.run ?? 0),
              runB: Number(players[1]?.run ?? 0),
              liveRunA: Number(players[0]?.liveRun ?? 0),
              liveRunB: Number(players[1]?.liveRun ?? 0),
              current:
                payload.current === "B"
                  ? "B"
                  : payload.current === "A"
                    ? "A"
                    : payload.activePlayer === 2
                      ? "B"
                      : "A",
              inningsA: Number(players[0]?.innings ?? 0),
              inningsB: Number(players[1]?.innings ?? 0),
              inningsCount: Number(
                payload.innings ?? Math.max(players[0]?.innings ?? 0, players[1]?.innings ?? 0, 0),
              ),
              bestRunA: Number(players[0]?.hr ?? 0),
              bestRunB: Number(players[1]?.hr ?? 0),
              playerAName: players[0]?.name ?? "Player A",
              playerBName: players[1]?.name ?? "Player B",
              playerACountry: payload.player1Country ?? players[0]?.country ?? null,
              playerBCountry: payload.player2Country ?? players[1]?.country ?? null,
              playerAPhotoUrl:
                payload.player1PhotoUrl ??
                players[0]?.photoUrl ??
                players[0]?.photo ??
                players[0]?.avatarUrl ??
                null,
              playerBPhotoUrl:
                payload.player2PhotoUrl ??
                players[1]?.photoUrl ??
                players[1]?.photo ??
                players[1]?.avatarUrl ??
                null,
              progress: Number(payload.progress ?? 0),
              totalBlocks: Number(payload.totalBlocks ?? 0),
              isRunning: Boolean(payload.isRunning),
              timeoutsA: Number(players[0]?.timeoutsUsed ?? 0),
              timeoutsB: Number(players[1]?.timeoutsUsed ?? 0),
              maxTimeoutsA: Number(players[0]?.maxTimeouts ?? 0),
              maxTimeoutsB: Number(players[1]?.maxTimeouts ?? 0),
              avgFormattedA: players[0]?.avgFormatted ?? null,
              avgFormattedB: players[1]?.avgFormatted ?? null,
              accPercentA: typeof players[0]?.accPercent === "number" ? players[0].accPercent : undefined,
              accPercentB: typeof players[1]?.accPercent === "number" ? players[1].accPercent : undefined,
              targetPointsA: typeof players[0]?.targetPoints === "number" ? players[0].targetPoints : null,
              targetPointsB: typeof players[1]?.targetPoints === "number" ? players[1].targetPoints : null,
              gameDurationSeconds:
                typeof payload.gameDurationSeconds === "number" ? payload.gameDurationSeconds : undefined,
              tournamentName: payload.tournamentName ?? payload.eventTitle ?? null,
              stageName: payload.stageName ?? payload.stage ?? null,
              groupName: payload.groupName ?? payload.groupLabel ?? null,
              tableName: payload.tableName ?? payload.table ?? payload.tableNumber ?? null,
            },
          });
        } catch {}
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        socket?.close();
      } catch {}
    };
  }, [club.city, club.documentId, club.federation?.name, club.name]);

  return (
    <section className={embedded ? "px-4 py-8 sm:px-6 sm:py-10" : "px-4 py-12 sm:px-6 sm:py-16"}>
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Live</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {club.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                {club.city ? <span>City: {club.city}</span> : null}
                {club.federation?.name ? <span>Federation: {club.federation.name}</span> : null}
                <span>Refresh: every 15s</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!embedded ? (
                <Link
                  href={buildLiveHref(club.documentId, true)}
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open embed
                </Link>
              ) : null}
              <Link
                href={club.slug ? `/clubs/${club.slug}` : "/clubs"}
                className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Club page
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              Loading live scoreboards...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              No live or pending scoreboard sessions were found for this club.
            </div>
          ) : (
            <div className="grid gap-5">
              {items.map((item) => (
                <LiveScoreBoardCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
