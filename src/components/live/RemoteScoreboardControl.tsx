"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n";

type ScoreboardSessionStatus = "pending" | "in_progress" | "finished" | "cancelled";

type RemoteCommandType =
  | "start_match"
  | "swap_players"
  | "reset_game"
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

const isNonEmptyString = (value: string | null): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const actionButtonClassName =
  "flex min-h-[64px] items-center justify-center rounded-3xl px-4 py-4 text-center text-sm font-semibold tracking-[0.02em] transition active:scale-[0.98]";

export function RemoteScoreboardControl() {
  const searchParams = useSearchParams();
  const screenId = (searchParams?.get("screenId") || "").trim();
  const sessionId = (searchParams?.get("sessionId") || "").trim();
  const [state, setState] = useState<ActionState>({
    error: null,
    lastCommand: null,
    loading: false,
  });

  const canSendCommands = isNonEmptyString(screenId) && isNonEmptyString(sessionId);

  const commandGroups = useMemo(
    () => [
      {
        titleKey: "remote.control.sections.setup.title",
        items: [
          { type: "start_match" as const, labelKey: "remote.control.actions.startMatch", tone: "bg-emerald-400 text-slate-950" },
          { type: "swap_players" as const, labelKey: "remote.control.actions.swapPlayers", tone: "bg-white/10 text-white border border-white/10" },
          { type: "warmup_break" as const, labelKey: "remote.control.actions.warmupBreak", tone: "bg-white/10 text-white border border-white/10" },
          { type: "reset_game" as const, labelKey: "remote.control.actions.resetGame", tone: "bg-red-500/20 text-red-100 border border-red-400/30" },
        ],
      },
      {
        titleKey: "remote.control.sections.scoring.title",
        items: [
          { type: "run_dec" as const, labelKey: "remote.control.actions.runDec", tone: "bg-white/10 text-white border border-white/10" },
          { type: "confirm_turn" as const, labelKey: "remote.control.actions.confirmTurn", tone: "bg-cyan-400 text-slate-950" },
          { type: "run_inc" as const, labelKey: "remote.control.actions.runInc", tone: "bg-white/10 text-white border border-white/10" },
        ],
      },
      {
        titleKey: "remote.control.sections.timer.title",
        items: [
          { type: "toggle_timer" as const, labelKey: "remote.control.actions.toggleTimer", tone: "bg-white/10 text-white border border-white/10" },
          { type: "reset_shot_clock" as const, labelKey: "remote.control.actions.resetShotClock", tone: "bg-white/10 text-white border border-white/10" },
        ],
      },
      {
        titleKey: "remote.control.sections.corrections.title",
        items: [
          { type: "undo" as const, labelKey: "remote.control.actions.undo", tone: "bg-white/10 text-white border border-white/10" },
          { type: "undo_timeout" as const, labelKey: "remote.control.actions.undoTimeout", tone: "bg-white/10 text-white border border-white/10" },
        ],
      },
    ],
    [],
  );

  const sendCommand = async (type: RemoteCommandType) => {
    if (!canSendCommands) {
      setState({
        error: t("remote.control.errors.missingParams"),
        lastCommand: null,
        loading: false,
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetch(`/api/scoreboards/${encodeURIComponent(sessionId)}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          payload: {
            screenId,
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
            {t("remote.control.errors.missingParams")}
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-4 rounded-3xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        {state.lastCommand ? (
          <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {t("remote.control.lastCommandPrefix")} {t(`remote.control.actions.${state.lastCommand === "start_match" ? "startMatch" : state.lastCommand === "swap_players" ? "swapPlayers" : state.lastCommand === "reset_game" ? "resetGame" : state.lastCommand === "warmup_break" ? "warmupBreak" : state.lastCommand === "toggle_timer" ? "toggleTimer" : state.lastCommand === "reset_shot_clock" ? "resetShotClock" : state.lastCommand === "run_inc" ? "runInc" : state.lastCommand === "run_dec" ? "runDec" : state.lastCommand === "confirm_turn" ? "confirmTurn" : state.lastCommand === "undo_timeout" ? "undoTimeout" : "undo"}`)}
          </div>
        ) : null}

        <div className="mt-5 flex flex-1 flex-col gap-5 pb-6">
          {commandGroups.map((group) => (
            <section key={group.titleKey}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t(group.titleKey)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((item) => {
                  const spanClassName = group.items.length === 3 && item.type === "confirm_turn" ? "col-span-2" : "col-span-1";
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={state.loading || !canSendCommands}
                      onClick={() => {
                        void sendCommand(item.type);
                      }}
                      className={`${spanClassName} ${actionButtonClassName} ${item.tone} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
