"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Safe translation fallback
const t = (key: string): string => {
  try {
    const dictionary: Record<string, string> = {
      'remote.home.title': 'Remote Scoreboard Control',
      'remote.home.screenIdLabel': 'Screen ID',
      'remote.home.screenIdPlaceholder': 'Enter screen ID (e.g., TABLE-01)',
      'remote.home.connectButton': 'Connect',
      'remote.home.description': 'Connect to a screen and open the remote control directly.',
      'remote.home.connectedScreen': 'Connected Screen',
      'remote.home.noScreenSelected': 'No screen selected',
      'remote.home.openControlButton': 'Open Remote Control',
      'remote.home.controlButton': 'Remote Control',
    };
    return dictionary[key] ?? key;
  } catch {
    return key;
  }
};

const LAST_SCREEN_ID_KEY = "remote.scoreboard.lastScreenId";

export function RemoteScoreboardHome() {
  const searchParams = useSearchParams();
  const initialScreenId = (searchParams?.get("screenId") || "").trim();
  const [screenId, setScreenId] = useState<string>(initialScreenId);
  const [resolvedScreenId, setResolvedScreenId] = useState<string>(initialScreenId);

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

        {resolvedScreenId ? (
          <div className="mt-5">
            <Link
              href={`/live/remote/control?screenId=${encodeURIComponent(resolvedScreenId)}`}
              className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-300"
            >
              {t("remote.home.openControlButton")}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
