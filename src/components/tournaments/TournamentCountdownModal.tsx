"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  targetTimeIso: string;
  title: string;
  subtitle?: string;
};

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function getCountdownParts(targetMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalMs };
}

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center sm:px-4 sm:py-5">
      <div className="text-3xl font-semibold tabular-nums text-slate-950 sm:text-5xl">
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

export function TournamentCountdownModal({
  targetTimeIso,
  title,
  subtitle,
}: Props) {
  const targetMs = useMemo(() => Date.parse(targetTimeIso), [targetTimeIso]);
  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    Number.isFinite(targetMs)
      ? getCountdownParts(targetMs)
      : { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 },
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(targetMs) || targetMs <= Date.now()) return;

    setOpen(true);
    const update = () => {
      const next = getCountdownParts(targetMs);
      setCountdown(next);
      if (next.totalMs <= 0) {
        setOpen(false);
      }
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [targetMs]);

  if (!open || countdown.totalMs <= 0) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-countdown-title"
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="tournament-countdown-title"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xl leading-none text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
            aria-label="Close countdown modal"
          >
            x
          </button>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
          <CountdownCell label="Days" value={countdown.days} />
          <CountdownCell label="Hours" value={countdown.hours} />
          <CountdownCell label="Min" value={countdown.minutes} />
          <CountdownCell label="Sec" value={countdown.seconds} />
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
