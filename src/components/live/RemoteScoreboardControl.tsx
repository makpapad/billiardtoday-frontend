"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const t = (key: string): string => {
  try {
    const dictionary: Record<string, string> = {
      "remote.control.eyebrow": "Remote Control",
      "remote.control.title": "Remote Control",
      "remote.control.noScreenName": "Unknown Screen",
      "remote.control.noPlayerSelected": "No player selected",
      "remote.control.sections.setup.title": "Setup",
      "remote.control.sections.scoring.title": "Scoring",
      "remote.control.sections.timer.title": "Timer",
      "remote.control.sections.corrections.title": "Corrections",
      "remote.control.actions.startMatch": "Start Match",
      "remote.control.actions.setupStart": "Start",
      "remote.control.actions.swapPlayers": "Swap Players",
      "remote.control.actions.warmupBreak": "Warmup / Break",
      "remote.control.actions.startNewGame": "Start New Game",
      "remote.control.actions.endGame": "End Game",
      "remote.control.actions.runDec": "Live Run -",
      "remote.control.actions.confirmTurn": "Confirm / End Turn",
      "remote.control.actions.runInc": "Live Run +",
      "remote.control.actions.toggleTimer": "Start / Pause Timer",
      "remote.control.actions.resetShotClock": "Reset Time",
      "remote.control.actions.undo": "Undo",
      "remote.control.actions.undoTimeout": "Undo Timeout / Foul",
      "remote.control.errors.missingScreenId": "Missing screen ID",
      "remote.control.errors.startMatchRequiresSession": "Start Match requires a session ID",
      "remote.control.errors.commandFailed": "Command failed to send",
      "remote.control.shortcuts.startMatch": "Session required",
      "remote.control.shortcuts.setupStart": "No shortcut",
      "remote.control.shortcuts.swapPlayers": "R",
      "remote.control.shortcuts.warmupBreak": "C",
      "remote.control.shortcuts.startNewGame": "S",
      "remote.control.shortcuts.endGame": "E",
      "remote.control.shortcuts.runDec": "-",
      "remote.control.shortcuts.confirmTurn": "Enter",
      "remote.control.shortcuts.runInc": "+",
      "remote.control.shortcuts.toggleTimer": "Space",
      "remote.control.shortcuts.resetShotClock": "Left Arrow",
      "remote.control.shortcuts.undo": "U",
      "remote.control.shortcuts.undoTimeout": "D",
      "remote.control.backButton": "Back",
    };
    return dictionary[key] ?? key;
  } catch {
    return key;
  }
};

type ScoreboardSessionStatus = "pending" | "in_progress" | "finished" | "cancelled";

type RemoteCommandType =
  | "start_match"
  | "setup_start"
  | "swap_players"
  | "start_new_game"
  | "end_game"
  | "warmup_break"
  | "toggle_timer"
  | "reset_shot_clock"
  | "run_inc"
  | "run_dec"
  | "confirm_turn"
  | "undo"
  | "undo_timeout";

interface ActionState {
  error: string | null;
  lastCommand: RemoteCommandType | null;
  loading: boolean;
}

type RemoteSessionSummary = {
  id?: string | number | null;
  documentId?: string | null;
  sessionStatus?: ScoreboardSessionStatus | null;
  status?: ScoreboardSessionStatus | null;
};

type ScreenSessionsResponse = {
  data?: RemoteSessionSummary[];
  error?: string;
};

type CommandButtonConfig = {
  type: RemoteCommandType;
  labelKey: string;
  shortcutKey: string;
};

const isNonEmptyString = (value: string | null): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const commandLabelKeyMap: Record<RemoteCommandType, string> = {
  start_match: "remote.control.actions.startMatch",
  setup_start: "remote.control.actions.setupStart",
  swap_players: "remote.control.actions.swapPlayers",
  start_new_game: "remote.control.actions.startNewGame",
  end_game: "remote.control.actions.endGame",
  warmup_break: "remote.control.actions.warmupBreak",
  toggle_timer: "remote.control.actions.toggleTimer",
  reset_shot_clock: "remote.control.actions.resetShotClock",
  run_inc: "remote.control.actions.runInc",
  run_dec: "remote.control.actions.runDec",
  confirm_turn: "remote.control.actions.confirmTurn",
  undo: "remote.control.actions.undo",
  undo_timeout: "remote.control.actions.undoTimeout",
};

type ScreenSummary = {
  screenId?: string;
  screenName?: string;
};

type ScreensResponse = {
  data?: ScreenSummary[];
};

type SessionDetails = {
  player1Name?: string | null;
  player2Name?: string | null;
  playerAName?: string | null;
  playerBName?: string | null;
  state?: {
    playerAName?: string | null;
    playerBName?: string | null;
  } | null;
};

type SessionByIdResponse = {
  data?: SessionDetails[];
};

const actionButtonClassName =
  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-[14px] px-2.5 py-1 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[48px] sm:rounded-[16px] sm:px-3 sm:py-1.5";

const shortcutChipClassName =
  "rounded-full border border-current/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] opacity-80";

export function RemoteScoreboardControl() {
  const searchParams = useSearchParams();
  const screenId = (searchParams?.get("screenId") || "").trim();
  const sessionId = (searchParams?.get("sessionId") || "").trim();
  const [state, setState] = useState<ActionState>({
    error: null,
    lastCommand: null,
    loading: false,
  });
  const [screenName, setScreenName] = useState<string>("");
  const [player1Name, setPlayer1Name] = useState<string>("");
  const [player2Name, setPlayer2Name] = useState<string>("");

  const canSendCommands = isNonEmptyString(screenId);
  const canStartMatch = isNonEmptyString(screenId) && isNonEmptyString(sessionId);

  const resolveTargetId = async (): Promise<string> => {
    if (isNonEmptyString(sessionId)) return sessionId;

    try {
      const response = await fetch(
        `/api/scoreboard/screens/${encodeURIComponent(screenId)}/sessions?status=pending,in_progress`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as ScreenSessionsResponse;
      if (!response.ok) {
        return screenId;
      }

      const sessions = Array.isArray(payload.data) ? payload.data : [];
      const inProgress = sessions.find((entry) => {
        const statusValue = entry.sessionStatus || entry.status;
        return statusValue === "in_progress";
      });
      const pending = sessions.find((entry) => {
        const statusValue = entry.sessionStatus || entry.status;
        return statusValue === "pending";
      });
      const selected = inProgress || pending || sessions[0];

      const resolvedIdRaw = selected?.documentId || selected?.id;
      if (typeof resolvedIdRaw === "string" && resolvedIdRaw.trim().length > 0) {
        return resolvedIdRaw.trim();
      }
      if (typeof resolvedIdRaw === "number" && Number.isFinite(resolvedIdRaw)) {
        return String(resolvedIdRaw);
      }
    } catch {
      return screenId;
    }

    return screenId;
  };

  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      if (!isNonEmptyString(screenId)) {
        setScreenName("");
        setPlayer1Name("");
        setPlayer2Name("");
        return;
      }

      try {
        const screensResponse = await fetch("/api/scoreboard/screens", { cache: "no-store" });
        const screensPayload = (await screensResponse.json().catch(() => ({}))) as ScreensResponse;
        if (!cancelled) {
          const matchingScreen = Array.isArray(screensPayload.data)
            ? screensPayload.data.find((entry) => entry.screenId === screenId)
            : null;
          setScreenName(
            (typeof matchingScreen?.screenName === "string" && matchingScreen.screenName.trim()) || screenId,
          );
        }
      } catch {
        if (!cancelled) {
          setScreenName(screenId);
        }
      }

      if (!isNonEmptyString(sessionId)) {
        if (!cancelled) {
          setPlayer1Name("");
          setPlayer2Name("");
        }
        return;
      }

      try {
        const sessionResponse = await fetch(`/api/scoreboard/session-by-id/${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as SessionByIdResponse;
        if (cancelled) return;

        const session = Array.isArray(sessionPayload.data) ? sessionPayload.data[0] : null;
        const resolvedPlayer1Name =
          (typeof session?.state?.playerAName === "string" && session.state.playerAName.trim()) ||
          (typeof session?.playerAName === "string" && session.playerAName.trim()) ||
          (typeof session?.player1Name === "string" && session.player1Name.trim()) ||
          "";
        const resolvedPlayer2Name =
          (typeof session?.state?.playerBName === "string" && session.state.playerBName.trim()) ||
          (typeof session?.playerBName === "string" && session.playerBName.trim()) ||
          (typeof session?.player2Name === "string" && session.player2Name.trim()) ||
          "";

        setPlayer1Name(resolvedPlayer1Name);
        setPlayer2Name(resolvedPlayer2Name);
      } catch {
        if (!cancelled) {
          setPlayer1Name("");
          setPlayer2Name("");
        }
      }
    };

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, [screenId, sessionId]);

  const sendCommand = async (type: RemoteCommandType) => {
    if (!canSendCommands) {
      setState({
        error: t("remote.control.errors.missingScreenId"),
        lastCommand: null,
        loading: false,
      });
      return;
    }

    if (type === "start_match" && !isNonEmptyString(sessionId)) {
      setState({
        error: t("remote.control.errors.startMatchRequiresSession"),
        lastCommand: null,
        loading: false,
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const targetId = await resolveTargetId();
      const response = await fetch(`/api/scoreboards/${encodeURIComponent(targetId)}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          payload: {
            screenIdentifier: screenId,
            ...(isNonEmptyString(sessionId) ? { sessionId } : {}),
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("remote.control.errors.commandFailed"));
      }

      setState({
        error: null,
        lastCommand: type,
        loading: false,
      });
    } catch (error: unknown) {
      setState({
        error: error instanceof Error ? error.message : t("remote.control.errors.commandFailed"),
        lastCommand: null,
        loading: false,
      });
    }
  };

  const renderActionButton = (
    config: CommandButtonConfig,
    className: string,
    options?: { disabled?: boolean; fullWidth?: boolean },
  ) => (
    <button
      type="button"
      disabled={state.loading || !canSendCommands || options?.disabled}
      onClick={() => {
        void sendCommand(config.type);
      }}
      className={`${options?.fullWidth ? "w-full" : ""} ${actionButtonClassName} ${className}`}
    >
      <span className="text-sm font-semibold leading-tight">{t(config.labelKey)}</span>
      <span className={shortcutChipClassName}>{t(config.shortcutKey)}</span>
    </button>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-4 py-2.5 sm:px-5">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.7rem] font-semibold leading-none tracking-tight text-white sm:text-[1.85rem]">
              {t("remote.control.title")}
            </h1>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90 sm:text-[11px] sm:tracking-[0.18em]">
              {screenName || t("remote.control.noScreenName")}
            </div>
          </div>
          <Link
            href={`/live/remote${isNonEmptyString(screenId) ? `?screenId=${encodeURIComponent(screenId)}` : ""}`}
            className="rounded-full border border-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/10 sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]"
          >
            {t("remote.control.backButton")}
          </Link>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/5 p-2 sm:rounded-[22px] sm:p-2.5">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <div className="rounded-[14px] bg-slate-900/80 px-2.5 py-2 sm:rounded-[16px] sm:px-3 sm:py-2.5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Player 1</div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-white sm:text-[12px]">
                {player1Name || t("remote.control.noPlayerSelected")}
              </div>
            </div>
            <div className="rounded-[14px] bg-slate-900/80 px-2.5 py-2 sm:rounded-[16px] sm:px-3 sm:py-2.5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Player 2</div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-white sm:text-[12px]">
                {player2Name || t("remote.control.noPlayerSelected")}
              </div>
            </div>
          </div>
        </div>

        {!canSendCommands ? (
          <div className="mt-1.5 rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            {t("remote.control.errors.missingScreenId")}
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-1.5 rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        <div className="mt-1.5 flex flex-1 flex-col gap-1.5 overflow-hidden">
          <section>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
              {t("remote.control.sections.scoring.title")}
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <div className="basis-[65%]">
                {renderActionButton(
                  {
                    type: "run_inc",
                    labelKey: "remote.control.actions.runInc",
                    shortcutKey: "remote.control.shortcuts.runInc",
                  },
                  "w-full bg-emerald-400 text-slate-950",
                )}
              </div>
              <div className="basis-[35%]">
                {renderActionButton(
                  {
                    type: "run_dec",
                    labelKey: "remote.control.actions.runDec",
                    shortcutKey: "remote.control.shortcuts.runDec",
                  },
                  "w-full bg-white/10 text-white border border-white/10",
                )}
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              {renderActionButton(
                {
                  type: "confirm_turn",
                  labelKey: "remote.control.actions.confirmTurn",
                  shortcutKey: "remote.control.shortcuts.confirmTurn",
                },
                "w-full bg-cyan-400 text-slate-950",
                { fullWidth: true },
              )}
            </div>
          </section>

          <section>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
              {t("remote.control.sections.timer.title")}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {renderActionButton(
                {
                  type: "toggle_timer",
                  labelKey: "remote.control.actions.toggleTimer",
                  shortcutKey: "remote.control.shortcuts.toggleTimer",
                },
                "bg-white/10 text-white border border-white/10",
              )}
              {renderActionButton(
                {
                  type: "reset_shot_clock",
                  labelKey: "remote.control.actions.resetShotClock",
                  shortcutKey: "remote.control.shortcuts.resetShotClock",
                },
                "bg-white/10 text-white border border-white/10",
              )}
            </div>
          </section>

          <section>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
              {t("remote.control.sections.corrections.title")}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {renderActionButton(
                {
                  type: "undo",
                  labelKey: "remote.control.actions.undo",
                  shortcutKey: "remote.control.shortcuts.undo",
                },
                "min-h-[40px] rounded-[12px] bg-red-500/90 text-white sm:min-h-[44px] sm:rounded-[14px]",
              )}
              {renderActionButton(
                {
                  type: "undo_timeout",
                  labelKey: "remote.control.actions.undoTimeout",
                  shortcutKey: "remote.control.shortcuts.undoTimeout",
                },
                "min-h-[40px] rounded-[12px] bg-white/10 text-white border border-white/10 sm:min-h-[44px] sm:rounded-[14px]",
              )}
            </div>
          </section>

          <section>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
              {t("remote.control.sections.setup.title")}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {renderActionButton(
                {
                  type: "warmup_break",
                  labelKey: "remote.control.actions.warmupBreak",
                  shortcutKey: "remote.control.shortcuts.warmupBreak",
                },
                "bg-white/10 text-white border border-white/10",
              )}
              {renderActionButton(
                {
                  type: "swap_players",
                  labelKey: "remote.control.actions.swapPlayers",
                  shortcutKey: "remote.control.shortcuts.swapPlayers",
                },
                "bg-white text-slate-950",
              )}
              {renderActionButton(
                {
                  type: "start_match",
                  labelKey: "remote.control.actions.startMatch",
                  shortcutKey: "remote.control.shortcuts.startMatch",
                },
                "bg-emerald-400 text-slate-950",
                { disabled: !canStartMatch },
              )}
              {renderActionButton(
                {
                  type: "setup_start",
                  labelKey: "remote.control.actions.setupStart",
                  shortcutKey: "remote.control.shortcuts.setupStart",
                },
                "bg-blue-500 text-white",
              )}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2 sm:gap-2">
              {renderActionButton(
                {
                  type: "end_game",
                  labelKey: "remote.control.actions.endGame",
                  shortcutKey: "remote.control.shortcuts.endGame",
                },
                "bg-amber-400 text-slate-950",
              )}
              {renderActionButton(
                {
                  type: "start_new_game",
                  labelKey: "remote.control.actions.startNewGame",
                  shortcutKey: "remote.control.shortcuts.startNewGame",
                },
                "bg-emerald-400 text-slate-950",
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
