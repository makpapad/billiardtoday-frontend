"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const t = (key: string): string => {
  try {
    const dictionary: Record<string, string> = {
      "remote.home.title": "Remote Scoreboard Control",
      "remote.home.description": "Pick a live screen, choose one of its available matches, then open the remote control with the correct session.",
      "remote.home.screensTitle": "Available screens",
      "remote.home.screenPickerPlaceholder": "Search screen by name or ID...",
      "remote.home.screenPickerEmpty": "No screens match your search.",
      "remote.home.screensLoading": "Loading live screens...",
      "remote.home.screensEmpty": "No live screens found right now.",
      "remote.home.matchesTitle": "Available matches",
      "remote.home.matchesLoading": "Loading matches for this screen...",
      "remote.home.matchesEmpty": "No pending or in-progress matches found for this screen.",
      "remote.home.openControlButton": "Open Remote Control",
      "remote.home.openWithoutMatchButton": "Open Without Match",
      "remote.home.selectedScreenLabel": "Selected screen",
      "remote.home.selectedMatchLabel": "Selected match",
      "remote.home.noScreenSelected": "No screen selected",
      "remote.home.noMatchSelected": "No match selected",
      "remote.home.selectScreenHint": "Select a screen first to load its matches.",
      "remote.home.screenIdLabel": "Screen ID",
      "remote.home.sessionIdLabel": "Session ID",
      "remote.home.sessionAutoLabel": "Auto",
      "remote.home.status.pending": "Pending",
      "remote.home.status.in_progress": "In Progress",
      "remote.home.status.finished": "Finished",
      "remote.home.status.cancelled": "Cancelled",
      "remote.home.errorLiveScreens": "Failed to load live screens.",
      "remote.home.errorMatches": "Failed to load matches for this screen.",
      "remote.home.matchFallback": "Match",
    };
    return dictionary[key] ?? key;
  } catch {
    return key;
  }
};

const LAST_SCREEN_ID_KEY = "remote.scoreboard.lastScreenId";
const LAST_SESSION_ID_KEY = "remote.scoreboard.lastSessionId";

type LiveScreen = {
  screenId: string;
  screenName: string;
  isActive?: boolean;
  clubName?: string | null;
};

type LiveScreensResponse = {
  data?: LiveScreen[];
  error?: string;
};

type ScoreboardSessionStatus = "pending" | "in_progress" | "finished" | "cancelled";

type RemoteSessionSummary = {
  id?: string | number | null;
  documentId?: string | null;
  sessionStatus?: ScoreboardSessionStatus | null;
  status?: ScoreboardSessionStatus | null;
  player1Name?: string | null;
  player2Name?: string | null;
  eventTitle?: string | null;
  stageTitle?: string | null;
  groupLabel?: string | null;
  tableNumber?: string | number | null;
  matchNo?: string | number | null;
  matchNumber?: string | number | null;
  screenIdentifier?: string | null;
};

type ScreenSessionsResponse = {
  data?: RemoteSessionSummary[];
  error?: string;
};

const normalizeText = (value: string | null | undefined): string => {
  return typeof value === "string" ? value.trim() : "";
};

const resolveSessionId = (session: RemoteSessionSummary): string => {
  if (typeof session.documentId === "string" && session.documentId.trim()) {
    return session.documentId.trim();
  }
  if (typeof session.id === "string" && session.id.trim()) {
    return session.id.trim();
  }
  if (typeof session.id === "number" && Number.isFinite(session.id)) {
    return String(session.id);
  }
  return "";
};

const getSessionStatus = (session: RemoteSessionSummary): ScoreboardSessionStatus | "" => {
  const statusValue = session.sessionStatus || session.status;
  return typeof statusValue === "string" ? statusValue : "";
};

const formatSessionLabel = (session: RemoteSessionSummary): string => {
  const player1 = normalizeText(session.player1Name);
  const player2 = normalizeText(session.player2Name);
  const matchLine = [player1, player2].filter(Boolean).join(" vs ");
  if (matchLine) return matchLine;
  return t("remote.home.matchFallback");
};

const formatSessionMeta = (session: RemoteSessionSummary): string => {
  const parts = [
    normalizeText(session.eventTitle),
    normalizeText(session.stageTitle),
    normalizeText(session.groupLabel),
    normalizeText(
      typeof session.tableNumber === "number" ? String(session.tableNumber) : session.tableNumber ?? "",
    ),
    normalizeText(
      typeof session.matchNo === "number"
        ? String(session.matchNo)
        : typeof session.matchNumber === "number"
          ? String(session.matchNumber)
          : String(session.matchNo ?? session.matchNumber ?? ""),
    ),
  ].filter(Boolean);

  return parts.join(" • ");
};

const statusToneMap: Record<ScoreboardSessionStatus, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  in_progress: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  finished: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-100",
};

export function RemoteScoreboardHome() {
  const searchParams = useSearchParams();
  const initialScreenId = (searchParams?.get("screenId") || "").trim();
  const initialSessionId = (searchParams?.get("sessionId") || "").trim();

  const [screenId, setScreenId] = useState(initialScreenId);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [screenQuery, setScreenQuery] = useState("");
  const [screenPickerOpen, setScreenPickerOpen] = useState(false);
  const [screens, setScreens] = useState<LiveScreen[]>([]);
  const [screensLoading, setScreensLoading] = useState(true);
  const [screensError, setScreensError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<RemoteSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadScreens = async () => {
      try {
        setScreensLoading(true);
        setScreensError(null);

        const response = await fetch("/api/scoreboard/screens", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as LiveScreensResponse;
        if (!response.ok) {
          throw new Error(payload.error || t("remote.home.errorLiveScreens"));
        }

        const nextScreens = Array.isArray(payload.data) ? payload.data : [];

        if (cancelled) return;

        setScreens(nextScreens);

        let preferredScreenId = initialScreenId;
        let preferredSessionId = initialSessionId;

        if (!preferredScreenId) {
          try {
            preferredScreenId = (window.localStorage.getItem(LAST_SCREEN_ID_KEY) || "").trim();
            preferredSessionId = initialSessionId || (window.localStorage.getItem(LAST_SESSION_ID_KEY) || "").trim();
          } catch {
            preferredScreenId = "";
            preferredSessionId = "";
          }
        }

        const hasPreferred = preferredScreenId
          ? nextScreens.some((entry) => entry.screenId === preferredScreenId)
          : false;
        const fallbackScreenId = nextScreens[0]?.screenId ?? "";
        const resolvedScreenId = hasPreferred ? preferredScreenId : fallbackScreenId;

        setScreenId(resolvedScreenId);
        setSessionId(hasPreferred ? preferredSessionId : "");
      } catch (error: unknown) {
        if (cancelled) return;
        setScreens([]);
        setScreensError(error instanceof Error ? error.message : t("remote.home.errorLiveScreens"));
      } finally {
        if (!cancelled) {
          setScreensLoading(false);
        }
      }
    };

    void loadScreens();

    return () => {
      cancelled = true;
    };
  }, [initialScreenId, initialSessionId]);

  useEffect(() => {
    let cancelled = false;

    const selectedScreenId = screenId.trim();
    if (!selectedScreenId) {
      setSessions([]);
      setSessionsError(null);
      setSessionsLoading(false);
      return;
    }

    const loadSessions = async () => {
      try {
        setSessionsLoading(true);
        setSessionsError(null);

        const response = await fetch(
          `/api/scoreboard/screens/${encodeURIComponent(selectedScreenId)}/sessions?status=pending,in_progress`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => ({}))) as ScreenSessionsResponse;
        if (!response.ok) {
          throw new Error(payload.error || t("remote.home.errorMatches"));
        }

        const nextSessions = Array.isArray(payload.data) ? payload.data : [];
        if (cancelled) return;

        setSessions(nextSessions);

        setSessionId((current) => {
          const hasExisting = current
            ? nextSessions.some((entry) => resolveSessionId(entry) === current)
            : false;

          if (hasExisting) {
            return current;
          }

          const inProgress = nextSessions.find((entry) => getSessionStatus(entry) === "in_progress");
          const pending = nextSessions.find((entry) => getSessionStatus(entry) === "pending");
          return resolveSessionId(inProgress || pending || nextSessions[0] || {});
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setSessions([]);
        setSessionId("");
        setSessionsError(error instanceof Error ? error.message : t("remote.home.errorMatches"));
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [screenId]);

  useEffect(() => {
    try {
      if (screenId) {
        window.localStorage.setItem(LAST_SCREEN_ID_KEY, screenId);
      } else {
        window.localStorage.removeItem(LAST_SCREEN_ID_KEY);
      }
    } catch {
      // noop
    }
  }, [screenId]);

  useEffect(() => {
    try {
      if (sessionId) {
        window.localStorage.setItem(LAST_SESSION_ID_KEY, sessionId);
      } else {
        window.localStorage.removeItem(LAST_SESSION_ID_KEY);
      }
    } catch {
      // noop
    }
  }, [sessionId]);

  const selectedScreen = useMemo(() => {
    return screens.find((entry) => entry.screenId === screenId) ?? null;
  }, [screenId, screens]);

  const filteredScreens = useMemo(() => {
    const needle = screenQuery.trim().toLowerCase();
    if (!needle) return screens;
    return screens.filter((entry) => {
      const haystack = [entry.screenName, entry.screenId, entry.clubName ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [screenQuery, screens]);

  const selectedSession = useMemo(() => {
    return sessions.find((entry) => resolveSessionId(entry) === sessionId) ?? null;
  }, [sessionId, sessions]);

  const controlHref = screenId
    ? `/live/remote/control?screenId=${encodeURIComponent(screenId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""}`
    : "/live/remote/control";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {t("remote.home.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {t("remote.home.description")}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-300"
            htmlFor="remote-screen-search"
          >
            {t("remote.home.screensTitle")}
          </label>
          {screensLoading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              {t("remote.home.screensLoading")}
            </div>
          ) : screensError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
              {screensError}
            </div>
          ) : screens.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              {t("remote.home.screensEmpty")}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setScreenPickerOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-left text-sm text-white transition hover:border-cyan-300/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {selectedScreen?.screenName || selectedScreen?.screenId || t("remote.home.noScreenSelected")}
                  </span>
                  {selectedScreen?.screenId ? (
                    <span className="mt-1 block truncate font-mono text-[11px] text-slate-400">
                      {selectedScreen.screenId}
                    </span>
                  ) : null}
                </span>
                <span className="ml-3 text-slate-400">{screenPickerOpen ? "▲" : "▼"}</span>
              </button>

              {screenPickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-2xl border border-white/10 bg-slate-950/98 p-3 shadow-2xl shadow-black/50 backdrop-blur">
                  <input
                    id="remote-screen-search"
                    value={screenQuery}
                    onChange={(event) => setScreenQuery(event.target.value)}
                    placeholder={t("remote.home.screenPickerPlaceholder")}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                    {filteredScreens.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-300">
                        {t("remote.home.screenPickerEmpty")}
                      </div>
                    ) : (
                      filteredScreens.map((entry) => {
                        const isSelected = entry.screenId === screenId;
                        return (
                          <button
                            key={entry.screenId}
                            type="button"
                            onClick={() => {
                              setScreenId(entry.screenId);
                              setSessionId("");
                              setScreenPickerOpen(false);
                              setScreenQuery("");
                            }}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-cyan-300/50 bg-cyan-400/10"
                                : "border-white/10 bg-slate-900/70 hover:bg-slate-900"
                            }`}
                          >
                            <div className="text-sm font-semibold text-white">{entry.screenName || entry.screenId}</div>
                            <div className="mt-1 text-xs text-slate-400">{entry.clubName || "Screen"}</div>
                            <div className="mt-2 font-mono text-[11px] text-slate-400">{entry.screenId}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="rounded-2xl bg-slate-900/70 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">{t("remote.home.selectedScreenLabel")}</div>
              <div className="mt-1 text-white">{selectedScreen?.screenName || t("remote.home.noScreenSelected")}</div>
              <div className="mt-2 font-mono text-[11px] text-slate-400">
                {screenId || t("remote.home.noScreenSelected")}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/70 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">{t("remote.home.selectedMatchLabel")}</div>
              <div className="mt-1 text-white">{selectedSession ? formatSessionLabel(selectedSession) : t("remote.home.noMatchSelected")}</div>
              <div className="mt-2 font-mono text-[11px] text-slate-400">
                {sessionId || t("remote.home.sessionAutoLabel")}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label
            className="mb-3 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400"
            htmlFor="remote-session-select"
          >
            {t("remote.home.matchesTitle")}
          </label>

          {!screenId ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              {t("remote.home.selectScreenHint")}
            </div>
          ) : sessionsLoading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              {t("remote.home.matchesLoading")}
            </div>
          ) : sessionsError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
              {sessionsError}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              {t("remote.home.matchesEmpty")}
            </div>
          ) : (
            <div className="grid gap-3">
              {sessions.map((entry) => {
                const resolvedId = resolveSessionId(entry);
                const status = getSessionStatus(entry) || "pending";
                const meta = formatSessionMeta(entry);
                const isSelected = resolvedId === sessionId;
                return (
                  <button
                    key={`${resolvedId}-${formatSessionLabel(entry)}`}
                    type="button"
                    onClick={() => setSessionId(resolvedId)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/30"
                        : "border-white/10 bg-slate-900/70 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{formatSessionLabel(entry)}</div>
                        {meta ? (
                          <div className="mt-1 text-xs leading-5 text-slate-400">{meta}</div>
                        ) : null}
                        <div className="mt-2 font-mono text-[11px] text-slate-500">{resolvedId}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusToneMap[status]}`}>
                        {t(`remote.home.status.${status}`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 pb-6">
          <Link
            href={controlHref}
            className={`flex items-center justify-center rounded-2xl px-4 py-4 text-sm font-semibold uppercase tracking-[0.12em] transition ${
              screenId
                ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
          >
            {t("remote.home.openControlButton")}
          </Link>
          {screenId ? (
            <Link
              href={`/live/remote/control?screenId=${encodeURIComponent(screenId)}`}
              className="flex items-center justify-center rounded-2xl border border-white/10 px-4 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
            >
              {t("remote.home.openWithoutMatchButton")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
