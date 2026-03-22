"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n";

type ScoreboardSessionStatus = "pending" | "in_progress" | "finished" | "cancelled";

interface RemoteScoreboardSession {
  id: string;
  documentId?: string | null;
  screenIdentifier?: string | null;
  sessionStatus?: ScoreboardSessionStatus | null;
  status?: ScoreboardSessionStatus | null;
  player1Name?: string | null;
  player2Name?: string | null;
  eventTitle?: string | null;
  stageTitle?: string | null;
  groupLabel?: string | null;
  tableNumber?: string | null;
  matchNo?: string | null;
  targetPoints?: number | null;
  maxInnings?: number | null;
}

interface ScreenSessionsResponse {
  data?: RemoteScoreboardSession[];
  error?: string;
}

const LAST_SCREEN_ID_KEY = "remote.scoreboard.lastScreenId";

const asDisplayText = (value: string | number | null | undefined, fallbackKey: string) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return t(fallbackKey);
};

export function RemoteScoreboardHome() {
  const searchParams = useSearchParams();
  const initialScreenId = (searchParams?.get("screenId") || "").trim();
  const [screenId, setScreenId] = useState<string>(initialScreenId);
  const [resolvedScreenId, setResolvedScreenId] = useState<string>(initialScreenId);
  const [sessions, setSessions] = useState<RemoteScoreboardSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialScreenId) {
      setScreenId(initialScreenId);
      setResolvedScreenId(initialScreenId);
      return;
    }

    try {
      const stored = window.localStorage.getItem(LAST_SCREEN_ID_KEY) || "";
      if (stored.trim()) {
        setScreenId(stored.trim());
        setResolvedScreenId(stored.trim());
      }
    } catch {
      // noop
    }
  }, [initialScreenId]);

  useEffect(() => {
    const normalizedScreenId = resolvedScreenId.trim();
    if (!normalizedScreenId) {
      setSessions([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/scoreboard/screens/${encodeURIComponent(normalizedScreenId)}/sessions?status=pending,in_progress`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => ({ data: [] }))) as ScreenSessionsResponse;
        if (!response.ok) {
          throw new Error(payload.error || t("remote.home.errors.loadSessions"));
        }
        if (!cancelled) {
          setSessions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setSessions([]);
          setError(loadError instanceof Error ? loadError.message : t("remote.home.errors.loadSessions"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSessions();
    const interval = window.setInterval(() => {
      void loadSessions();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [resolvedScreenId]);

  const activeSessionCount = useMemo(
    () => sessions.filter((session) => (session.sessionStatus || session.status) === "in_progress").length,
    [sessions],
  );

  const handleConnect = () => {
    const normalized = screenId.trim();
    setResolvedScreenId(normalized);
    try {
      if (normalized) {
        window.localStorage.setItem(LAST_SCREEN_ID_KEY, normalized);
      } else {
        window.localStorage.removeItem(LAST_SCREEN_ID_KEY);
      }
    } catch {
      // noop
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {t("remote.home.eyebrow")}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {t("remote.home.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {t("remote.home.description")}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-300" htmlFor="remote-screen-id">
            {t("remote.home.screenIdLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id="remote-screen-id"
              value={screenId}
              onChange={(event) => setScreenId(event.target.value)}
              placeholder={t("remote.home.screenIdPlaceholder")}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {t("remote.home.connectButton")}
            </button>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span>{t("remote.home.connectedScreen")}</span>
              <span className="font-mono text-xs text-white">
                {resolvedScreenId || t("remote.home.noScreenSelected")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t("remote.home.availableMatchesLabel")}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{sessions.length}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t("remote.home.liveMatchesLabel")}</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">{activeSessionCount}</div>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
            {t("remote.home.loading")}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-3xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {!loading && !error && resolvedScreenId && sessions.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
            {t("remote.home.emptyState")}
          </div>
        ) : null}

        <div className="mt-5 flex flex-1 flex-col gap-3">
          {sessions.map((session) => {
            const sessionStatus = session.sessionStatus || session.status || "pending";
            const sessionTitle = asDisplayText(session.eventTitle, "remote.home.matchCard.fallbackTitle");
            const sessionStage = asDisplayText(session.stageTitle, "remote.home.matchCard.fallbackStage");
            const player1Name = asDisplayText(session.player1Name, "remote.home.matchCard.fallbackPlayer1");
            const player2Name = asDisplayText(session.player2Name, "remote.home.matchCard.fallbackPlayer2");
            const tableNumber = asDisplayText(session.tableNumber, "remote.home.matchCard.fallbackTable");
            const matchNo = asDisplayText(session.matchNo, "remote.home.matchCard.fallbackMatchNo");
            const groupLabel = asDisplayText(session.groupLabel, "remote.home.matchCard.fallbackGroup");

            return (
              <Link
                key={session.id}
                href={`/live/remote/control?screenId=${encodeURIComponent(resolvedScreenId)}&sessionId=${encodeURIComponent(session.id)}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/40 hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      {sessionTitle}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {player1Name} <span className="text-slate-500">vs</span> {player2Name}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      sessionStatus === "in_progress"
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "bg-amber-400/20 text-amber-100"
                    }`}
                  >
                    {sessionStatus === "in_progress"
                      ? t("remote.home.status.inProgress")
                      : t("remote.home.status.pending")}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {t("remote.home.matchCard.stageLabel")}
                    </div>
                    <div className="mt-1 font-medium text-white">{sessionStage}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {t("remote.home.matchCard.tableLabel")}
                    </div>
                    <div className="mt-1 font-medium text-white">{tableNumber}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {t("remote.home.matchCard.matchNoLabel")}
                    </div>
                    <div className="mt-1 font-medium text-white">{matchNo}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {t("remote.home.matchCard.groupLabel")}
                    </div>
                    <div className="mt-1 font-medium text-white">{groupLabel}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>
                    {t("remote.home.matchCard.targetPointsLabel")}: {typeof session.targetPoints === "number" ? session.targetPoints : "-"}
                  </span>
                  <span>
                    {t("remote.home.matchCard.maxInningsLabel")}: {typeof session.maxInnings === "number" ? session.maxInnings : "-"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
