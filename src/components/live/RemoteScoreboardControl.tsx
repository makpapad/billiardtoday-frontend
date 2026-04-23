"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const t = (key: string): string => {
  try {
    const dictionary: Record<string, string> = {
      "remote.control.eyebrow": "Remote Control",
      "remote.control.title": "Remote Control",
      "remote.control.screenIdLabel": "Screen ID",
      "remote.control.sessionIdLabel": "Session ID",
      "remote.control.noScreenId": "No screen ID",
      "remote.control.noSessionId": "Auto",
      "remote.control.lastCommandPrefix": "Last command:",
      "remote.control.sections.setup.title": "Setup",
      "remote.control.sections.scoring.title": "Scoring",
      "remote.control.sections.timer.title": "Timer",
      "remote.control.sections.corrections.title": "Corrections",
      "remote.control.actions.startMatch": "Start Match",
      "remote.control.actions.swapPlayers": "Swap Players",
      "remote.control.actions.warmupBreak": "Warmup / Break",
      "remote.control.actions.resetGame": "Reset Game",
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
      "remote.control.shortcuts.swapPlayers": "R",
      "remote.control.shortcuts.warmupBreak": "C",
      "remote.control.shortcuts.resetGame": "No shortcut",
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
  | "swap_players"
  | "reset_game"
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
  tone: string;
  fullWidth?: boolean;
};

const isNonEmptyString = (value: string | null): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const actionButtonClassName =
  "flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-3xl px-4 py-4 text-center transition active:scale-[0.98]";

const commandLabelKeyMap: Record<RemoteCommandType, string> = {
  start_match: "remote.control.actions.startMatch",
  swap_players: "remote.control.actions.swapPlayers",
  reset_game: "remote.control.actions.resetGame",
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

export function RemoteScoreboardControl() {
  const searchParams = useSearchParams();
  const screenId = (searchParams?.get("screenId") || "").trim();
  const sessionId = (searchParams?.get("sessionId") || "").trim();
  const [state, setState] = useState<ActionState>({
    error: null,
    lastCommand: null,
    loading: false,
  });

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

  const commandGroups = useMemo(
    () => [
      {
        titleKey: "remote.control.sections.setup.title",
        items: [
          {
            type: "start_match",
            labelKey: "remote.control.actions.startMatch",
            shortcutKey: "remote.control.shortcuts.startMatch",
            tone: "bg-emerald-400 text-slate-950",
          },
          {
            type: "swap_players",
            labelKey: "remote.control.actions.swapPlayers",
            shortcutKey: "remote.control.shortcuts.swapPlayers",
            tone: "bg-white/10 text-white border border-white/10",
          },
          {
            type: "warmup_break",
            labelKey: "remote.control.actions.warmupBreak",
            shortcutKey: "remote.control.shortcuts.warmupBreak",
            tone: "bg-white/10 text-white border border-white/10",
          },
          {
            type: "reset_game",
            labelKey: "remote.control.actions.resetGame",
            shortcutKey: "remote.control.shortcuts.resetGame",
            tone: "bg-red-500/20 text-red-100 border border-red-400/30",
          },
          {
            type: "end_game",
            labelKey: "remote.control.actions.endGame",
            shortcutKey: "remote.control.shortcuts.endGame",
            tone: "bg-amber-400 text-slate-950",
            fullWidth: true,
          },
        ] satisfies CommandButtonConfig[],
      },
      {
        titleKey: "remote.control.sections.scoring.title",
        items: [
          {
            type: "run_dec",
            labelKey: "remote.control.actions.runDec",
            shortcutKey: "remote.control.shortcuts.runDec",
            tone: "bg-white/10 text-white border border-white/10",
          },
          {
            type: "confirm_turn",
            labelKey: "remote.control.actions.confirmTurn",
            shortcutKey: "remote.control.shortcuts.confirmTurn",
            tone: "bg-cyan-400 text-slate-950",
            fullWidth: true,
          },
          {
            type: "run_inc",
            labelKey: "remote.control.actions.runInc",
            shortcutKey: "remote.control.shortcuts.runInc",
            tone: "bg-white/10 text-white border border-white/10",
          },
        ] satisfies CommandButtonConfig[],
      },
      {
        titleKey: "remote.control.sections.timer.title",
        items: [
          {
            type: "toggle_timer",
            labelKey: "remote.control.actions.toggleTimer",
            shortcutKey: "remote.control.shortcuts.toggleTimer",
            tone: "bg-white/10 text-white border border-white/10",
          },
          {
            type: "reset_shot_clock",
            labelKey: "remote.control.actions.resetShotClock",
            shortcutKey: "remote.control.shortcuts.resetShotClock",
            tone: "bg-white/10 text-white border border-white/10",
          },
        ] satisfies CommandButtonConfig[],
      },
      {
        titleKey: "remote.control.sections.corrections.title",
        items: [
          {
            type: "undo",
            labelKey: "remote.control.actions.undo",
            shortcutKey: "remote.control.shortcuts.undo",
            tone: "bg-white/10 text-white border border-white/10",
          },
          {
            type: "undo_timeout",
            labelKey: "remote.control.actions.undoTimeout",
            shortcutKey: "remote.control.shortcuts.undoTimeout",
            tone: "bg-white/10 text-white border border-white/10",
          },
        ] satisfies CommandButtonConfig[],
      },
    ],
    [],
  );

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              {t("remote.control.eyebrow")}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {t("remote.control.title")}
            </h1>
          </div>
          <Link
            href={`/live/remote${isNonEmptyString(screenId) ? `?screenId=${encodeURIComponent(screenId)}` : ""}`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
          >
            {t("remote.control.backButton")}
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="rounded-2xl bg-slate-900/70 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">{t("remote.control.screenIdLabel")}</div>
              <div className="mt-1 font-mono text-white">{screenId || t("remote.control.noScreenId")}</div>
            </div>
            <div className="rounded-2xl bg-slate-900/70 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">{t("remote.control.sessionIdLabel")}</div>
              <div className="mt-1 font-mono text-white">{sessionId || t("remote.control.noSessionId")}</div>
            </div>
          </div>
        </div>

        {!canSendCommands ? (
          <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            {t("remote.control.errors.missingScreenId")}
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-4 rounded-3xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        {state.lastCommand ? (
          <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {t("remote.control.lastCommandPrefix")} {t(commandLabelKeyMap[state.lastCommand])}
          </div>
        ) : null}

        <div className="mt-5 flex flex-1 flex-col gap-5 pb-6">
          {commandGroups.map((group) => (
            <section key={group.titleKey}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t(group.titleKey)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    disabled={state.loading || !canSendCommands || (item.type === "start_match" && !canStartMatch)}
                    onClick={() => {
                      void sendCommand(item.type);
                    }}
                    className={`${("fullWidth" in item && item.fullWidth) ? "col-span-2" : "col-span-1"} ${actionButtonClassName} ${item.tone} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="text-sm font-semibold leading-tight">{t(item.labelKey)}</span>
                    <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
                      {t(item.shortcutKey)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
