import { useEffect, useMemo, useState } from "react";
import type { NormalizedEventStage } from "./types";
import { computeStageCountryStats } from "./utils";
import ShareMenuButton from "./ShareMenuButton";

/**
 * StageCountryStats — compact "who advanced, by country" strip shown above
 * the stage ranking table once a round-robin (group) stage has fully
 * finished and a next stage exists.
 *
 * Columns: Entered | Qualified | Qual % (qualified / entered per country).
 * The general average per country is not repeated here — the ranking table
 * below shows the stage General AVG (filtered to the selected country).
 *
 * Countries rotate vertically (slide-up carousel, 3s per country, paused on
 * hover). Each country has a small flag chip on the left; clicking a flag
 * selects that country (carousel jumps to it and the ranking table below is
 * filtered through onSelectCountry), clicking the active flag again clears
 * the filter.
 *
 * A Share button sits on its own bottom row (out of the column grid so it
 * never affects number alignment) and shares the social/OG image rendered
 * for this stage via eventDocumentId.
 */

const ROW_HEIGHT_PX = 64;
const ROTATE_MS = 3000;

const formatQualificationPercent = (
  qualified: number,
  entered: number,
): string => {
  if (entered <= 0) return "–";
  return `${Math.round((qualified / entered) * 100)}%`;
};

export default function StageCountryStats({
  stage,
  nextStage,
  selectedCountryId = null,
  onSelectCountry,
  eventDocumentId = null,
}: {
  stage: NormalizedEventStage;
  nextStage: NormalizedEventStage | null | undefined;
  selectedCountryId?: string | null;
  onSelectCountry?: (countryId: string | null) => void;
  eventDocumentId?: string | null;
}) {
  const stats = useMemo(
    () => computeStageCountryStats(stage, nextStage),
    [stage, nextStage],
  );

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActive(0);
    setPaused(false);
  }, [stage.documentId]);

  useEffect(() => {
    if (paused || stats.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActive((current) => (current + 1) % stats.length);
    }, ROTATE_MS);
    return () => window.clearInterval(intervalId);
  }, [paused, stats.length]);

  if (stats.length === 0) return null;

  const safeActive = active >= stats.length ? 0 : active;

  const handleFlagClick = (countryId: string, index: number) => {
    if (!onSelectCountry) {
      setActive(index);
      return;
    }
    if (selectedCountryId === countryId) {
      onSelectCountry(null);
      return;
    }
    setActive(index);
    onSelectCountry(countryId);
  };

  const shareHref =
    eventDocumentId && stage.documentId
      ? `/api/og/tournament/${encodeURIComponent(eventDocumentId)}?stage=${encodeURIComponent(
          stage.documentId,
        )}`
      : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 shadow-lg ring-1 ring-white/20 transition-shadow hover:shadow-xl dark:ring-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header row: label + flag chips on the left, column titles above the numbers */}
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem] items-center gap-x-2 px-3 pb-1 pt-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem] sm:gap-x-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
            By country
          </span>
          {stats.length > 1 ? (
            <span className="flex min-w-0 items-center gap-1.5 overflow-x-auto pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.map((stat, index) => {
                const isSelected = selectedCountryId === stat.id;
                const isCurrent = index === safeActive;
                return (
                  <button
                    key={stat.id}
                    type="button"
                    aria-label={`Show only ${stat.label}`}
                    aria-pressed={isSelected}
                    title={
                      isSelected
                        ? `${stat.label} — click to clear filter`
                        : `Filter by ${stat.label}`
                    }
                    onClick={() => handleFlagClick(stat.id, index)}
                    className={[
                      "flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] transition-all",
                      isCurrent && !isSelected
                        ? "ring-2 ring-white/90"
                        : "ring-1 ring-white/40",
                      isSelected
                        ? "scale-110 ring-2 ring-white shadow-md"
                        : "opacity-70 hover:opacity-100 hover:ring-white/80",
                    ].join(" ")}
                  >
                    {stat.flagUrl ? (
                      <img
                        src={stat.flagUrl}
                        alt={stat.label}
                        className="h-5 w-7 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="h-5 w-7 bg-white/30" />
                    )}
                  </button>
                );
              })}
            </span>
          ) : null}
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Entered
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Qual.
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Qual %
        </div>
      </div>

      {/* Rotating country rows (slide-up carousel) */}
      <div className="overflow-hidden" style={{ height: ROW_HEIGHT_PX }}>
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${safeActive * ROW_HEIGHT_PX}px)` }}
        >
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem] items-center gap-x-2 px-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem] sm:gap-x-6 sm:px-6"
              style={{ height: ROW_HEIGHT_PX }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {stat.flagUrl ? (
                  <img
                    src={stat.flagUrl}
                    alt={stat.label}
                    className="h-6 w-8 shrink-0 rounded-[3px] object-cover shadow ring-1 ring-white/40"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="h-6 w-8 shrink-0 rounded-[3px] bg-white/20 ring-1 ring-white/30" />
                )}
                <span className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {stat.label}
                </span>
              </div>
              <div className="text-center text-xl font-black tabular-nums text-white sm:text-2xl">
                {stat.entered}
              </div>
              <div className="text-center text-xl font-black tabular-nums text-emerald-200 sm:text-2xl">
                {stat.qualified}
              </div>
              <div className="text-center text-xl font-extrabold tabular-nums text-white sm:text-2xl">
                {formatQualificationPercent(stat.qualified, stat.entered)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: share this stage (kept out of the column grid so it
          cannot affect number alignment) */}
      <div className="flex items-center justify-end gap-3 border-t border-white/15 px-3 py-1.5 sm:px-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:text-[11px]">
          Share this stage
        </span>
        <ShareMenuButton
          shareHref={shareHref}
          downloadName="billiardtoday-country-stats.png"
        />
      </div>
    </div>
  );
}
