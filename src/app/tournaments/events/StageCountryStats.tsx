import { useEffect, useMemo, useState } from "react";
import {
  getCountryFlagCdnUrl,
  getCountryLabel,
} from "@/lib/countryFlags";
import type {
  NormalizedEventStage,
  NormalizedGroupPlayer,
  StageMatchGroup,
} from "./types";
import {
  buildStageMatchGroups,
  hasPlayedStageMatch,
  isDynamicPlaceholderPlayer,
  resolveCountryBucketId,
} from "./utils";

/**
 * StageCountryStats — compact "who advanced, by country" strip shown above
 * the stage ranking table once a round-robin (group) stage has fully
 * finished and a next stage exists.
 *
 * - Entered:   unique players of this stage grouped by country.
 * - Qualified: of those, how many also appear in the NEXT stage (objective —
 *              no per-event rules to maintain; once this stage is complete
 *              the next stage already holds the real qualifiers).
 * - Qual %:    qualified / entered per country (the general average is shown
 *              in the ranking table below, so it is not repeated here).
 *
 * Countries rotate vertically (slide-up carousel, one every 3s, paused on
 * hover). Each country has a small flag chip on the left; clicking a flag
 * selects that country (carousel jumps to it and the ranking table below is
 * filtered through onSelectCountry), clicking the active flag again clears
 * the filter. Hidden for bracket stages and the final stage (no next one).
 */

const ROW_HEIGHT_PX = 64;
const ROTATE_MS = 3000;

const BRACKET_STAGE_TYPES = new Set([
  "double_elimination",
  "single_elimination",
  "brackets",
  "bracket",
  "knockout",
]);

type CountryStat = {
  id: string;
  label: string;
  flagUrl: string | null;
  entered: number;
  qualified: number;
  average: number | null;
};

type PlayerStageTotals = {
  country: string | null;
  points: number;
  innings: number;
};

const isBracketStageType = (
  stage: NormalizedEventStage | null | undefined,
): boolean => {
  if (!stage) return false;
  if (BRACKET_STAGE_TYPES.has(stage.stageType?.trim().toLowerCase() ?? ""))
    return true;
  const title = stage.title.trim().toLowerCase();
  if (stage.isFinal && title.includes("final tournament")) return true;
  return false;
};

const stagePlayerKey = (player: NormalizedGroupPlayer): string | null => {
  if (!player?.name || isDynamicPlaceholderPlayer(player)) return null;
  if (player.documentId) return `doc:${player.documentId}`;
  if (player.id !== null) return `id:${player.id}`;
  const nameKey = player.name.trim().toLowerCase();
  return nameKey ? `name:${nameKey}` : null;
};

const finiteNumber = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const stageIsComplete = (stage: NormalizedEventStage): boolean => {
  const groups = buildStageMatchGroups(stage.groups);
  if (groups.length === 0) return false;
  return groups.every(
    (group: StageMatchGroup) =>
      group.matches.length > 0 &&
      group.matches.every((match) => hasPlayedStageMatch(match)),
  );
};

const collectStagePlayerTotals = (
  stage: NormalizedEventStage,
): Map<string, PlayerStageTotals> => {
  const byKey = new Map<string, PlayerStageTotals>();
  buildStageMatchGroups(stage.groups).forEach((group) => {
    group.matches.forEach((match) => {
      [match.top, match.bottom].forEach((entry) => {
        const key = stagePlayerKey(entry.player);
        if (!key) return;
        const existing = byKey.get(key);
        const points = finiteNumber(entry.player.points);
        const innings = finiteNumber(entry.player.innings);
        if (existing) {
          existing.points += points;
          existing.innings += innings;
          if (!existing.country && entry.player.country) {
            existing.country = entry.player.country;
          }
          return;
        }
        byKey.set(key, {
          country: entry.player.country ?? null,
          points,
          innings,
        });
      });
    });
  });
  return byKey;
};

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
}: {
  stage: NormalizedEventStage;
  nextStage: NormalizedEventStage | null | undefined;
  selectedCountryId?: string | null;
  onSelectCountry?: (countryId: string | null) => void;
}) {
  const stats = useMemo<CountryStat[]>(() => {
    if (!nextStage || isBracketStageType(stage) || stage.isFinal) return [];
    if (!stageIsComplete(stage)) return [];

    const stagePlayers = collectStagePlayerTotals(stage);
    if (stagePlayers.size === 0) return [];

    const nextStageKeys = new Set(
      collectStagePlayerTotals(nextStage).keys(),
    );

    const byCountry = new Map<
      string,
      {
        label: string;
        flagUrl: string | null;
        entered: number;
        qualified: number;
        points: number;
        innings: number;
      }
    >();
    stagePlayers.forEach((totals) => {
      const bucketId = resolveCountryBucketId(totals.country);
      if (!bucketId) return;
      const existing = byCountry.get(bucketId);
      if (existing) {
        existing.entered += 1;
        existing.points += totals.points;
        existing.innings += totals.innings;
        return;
      }
      byCountry.set(bucketId, {
        label:
          getCountryLabel(totals.country) ??
          totals.country ??
          bucketId,
        flagUrl: getCountryFlagCdnUrl(totals.country, 40),
        entered: 1,
        qualified: 0,
        points: totals.points,
        innings: totals.innings,
      });
    });

    let qualifiedTotal = 0;
    stagePlayers.forEach((_totals, playerKey) => {
      if (!nextStageKeys.has(playerKey)) return;
      const totals = stagePlayers.get(playerKey) ?? null;
      const bucketId = resolveCountryBucketId(totals?.country ?? null);
      if (!bucketId) return;
      const entry = byCountry.get(bucketId);
      if (entry) entry.qualified += 1;
      qualifiedTotal += 1;
    });

    const rows = Array.from(byCountry.entries())
      .map(([id, value]) => ({
        id,
        ...value,
        average:
          value.innings > 0 ? value.points / value.innings : null,
      }))
      .filter((row) => row.entered > 0)
      .sort(
        (a, b) =>
          b.entered - a.entered ||
          b.qualified - a.qualified ||
          (b.average ?? -1) - (a.average ?? -1) ||
          a.label.localeCompare(b.label),
      );

    if (rows.length === 0 || qualifiedTotal === 0) return [];
    return rows;
  }, [stage, nextStage]);

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
                    title={isSelected ? `${stat.label} — click to clear filter` : `Filter by ${stat.label}`}
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
    </div>
  );
}
