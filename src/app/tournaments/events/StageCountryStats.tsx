import { useEffect, useMemo, useState } from "react";
import {
  getCountryCode,
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
 *
 * Countries rotate vertically (slide-up carousel, one every 3s, paused on
 * hover). Hidden for bracket stages and for the final stage (no next one).
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

const stageIsComplete = (stage: NormalizedEventStage): boolean => {
  const groups = buildStageMatchGroups(stage.groups);
  if (groups.length === 0) return false;
  return groups.every(
    (group: StageMatchGroup) =>
      group.matches.length > 0 &&
      group.matches.every((match) => hasPlayedStageMatch(match)),
  );
};

const collectStagePlayerKeys = (
  stage: NormalizedEventStage,
): Map<string, string | null> => {
  const byKey = new Map<string, string | null>();
  buildStageMatchGroups(stage.groups).forEach((group) => {
    group.matches.forEach((match) => {
      [match.top, match.bottom].forEach((entry) => {
        const key = stagePlayerKey(entry.player);
        if (!key || byKey.has(key)) return;
        byKey.set(key, entry.player.country ?? null);
      });
    });
  });
  return byKey;
};

const countryBucketId = (countryRaw: string | null): string | null => {
  if (!countryRaw) return null;
  const code = getCountryCode(countryRaw);
  if (code) return `code:${code}`;
  const normalized = countryRaw.trim().toLowerCase();
  return normalized ? `raw:${normalized}` : null;
};

export default function StageCountryStats({
  stage,
  nextStage,
}: {
  stage: NormalizedEventStage;
  nextStage: NormalizedEventStage | null | undefined;
}) {
  const stats = useMemo<CountryStat[]>(() => {
    if (!nextStage || isBracketStageType(stage) || stage.isFinal) return [];
    if (!stageIsComplete(stage)) return [];

    const stagePlayers = collectStagePlayerKeys(stage);
    if (stagePlayers.size === 0) return [];

    const nextStageKeys = new Set(collectStagePlayerKeys(nextStage).keys());

    const byCountry = new Map<
      string,
      { label: string; flagUrl: string | null; entered: number; qualified: number }
    >();
    stagePlayers.forEach((countryRaw) => {
      const bucketId = countryBucketId(countryRaw);
      if (!bucketId) return;
      const existing = byCountry.get(bucketId);
      if (existing) {
        existing.entered += 1;
        return;
      }
      byCountry.set(bucketId, {
        label: getCountryLabel(countryRaw) ?? countryRaw ?? bucketId,
        flagUrl: getCountryFlagCdnUrl(countryRaw, 40),
        entered: 1,
        qualified: 0,
      });
    });

    let qualifiedTotal = 0;
    stagePlayers.forEach((_countryRaw, playerKey) => {
      if (!nextStageKeys.has(playerKey)) return;
      const countryRaw = stagePlayers.get(playerKey) ?? null;
      const bucketId = countryBucketId(countryRaw);
      if (!bucketId) return;
      const entry = byCountry.get(bucketId);
      if (entry) entry.qualified += 1;
      qualifiedTotal += 1;
    });

    const rows = Array.from(byCountry.entries())
      .map(([id, value]) => ({ id, ...value }))
      .filter((row) => row.entered > 0)
      .sort(
        (a, b) =>
          b.entered - a.entered ||
          b.qualified - a.qualified ||
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 shadow-lg ring-1 ring-white/20 transition-shadow hover:shadow-xl dark:ring-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header row: label + dots on the left, column titles above the numbers */}
      <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem] items-center gap-x-3 px-4 pb-1 pt-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-8 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
            By country
          </span>
          {stats.length > 1 ? (
            <span className="flex shrink-0 items-center gap-1.5">
              {stats.map((stat, index) => (
                <button
                  key={stat.id}
                  type="button"
                  aria-label={`Show ${stat.label}`}
                  title={stat.label}
                  onClick={() => setActive(index)}
                  className={
                    index === safeActive
                      ? "h-1.5 w-5 rounded-full bg-white transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-white/40 transition-all hover:bg-white/80"
                  }
                />
              ))}
            </span>
          ) : null}
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Entered
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Qualified
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
              className="grid h-16 grid-cols-[minmax(0,1fr)_4.25rem_4.25rem] items-center gap-x-3 px-4 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-8 sm:px-6"
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
              <div className="text-center text-2xl font-black tabular-nums text-white">
                {stat.entered}
              </div>
              <div className="text-center text-2xl font-black tabular-nums text-emerald-200">
                {stat.qualified}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
