"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import type { EntryStageInfo, EntryTier } from "./entryHelpers";

// ---------------------------------------------------------------------------
// Entry badges (start stage + seeded/wildcard tier) with hover explanation.
//
// The tooltip is rendered with `position: fixed` so it escapes the standings
// table's `overflow-x-auto` wrapper instead of being clipped by it, and its
// x position is clamped to the viewport so badges near an edge stay readable.
// ---------------------------------------------------------------------------

const TOOLTIP_HALF_WIDTH = 120;

type TooltipPosition = { x: number; y: number };

function HoverBadge({
  label,
  help,
  className,
}: {
  label: string;
  help: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);

  const showTooltip = useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const maxX = Math.max(viewportWidth - TOOLTIP_HALF_WIDTH, TOOLTIP_HALF_WIDTH);
    setTooltip({
      x: Math.min(Math.max(rect.left + rect.width / 2, TOOLTIP_HALF_WIDTH), maxX),
      y: rect.top,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={clsx(
          "inline-flex h-5 min-w-[1.4rem] cursor-help select-none items-center justify-center rounded px-1 text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm",
          className,
        )}
      >
        {label}
      </span>
      {tooltip ? (
        <span
          role="tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
          className="pointer-events-none fixed z-[80] w-max max-w-[16rem] -translate-x-1/2 -translate-y-full whitespace-normal rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-2xl"
        >
          {help}
        </span>
      ) : null}
    </>
  );
}

/**
 * The start-stage badge is only informative when the player entered an earlier
 * stage than the one being listed; otherwise every row of a stage would just
 * repeat that stage's own title.
 */
export function shouldShowEntryStage(
  stage: EntryStageInfo | null,
  currentStageOrder: number | null,
): boolean {
  if (!stage || !stage.label) return false;
  if (stage.order === null || currentStageOrder === null) return true;
  return stage.order < currentStageOrder;
}

/**
 * Badge for the stage the player actually entered the event from
 * (PQ, Q, PPQ, PPPQ, 1/16, MAIN). Hidden when it would repeat the stage
 * the viewer is already looking at.
 */
export function EntryStageBadge({
  stage,
  currentStageOrder = null,
}: {
  stage: EntryStageInfo;
  currentStageOrder?: number | null;
}) {
  if (!shouldShowEntryStage(stage, currentStageOrder)) return null;
  const label = stage.label;
  if (!label) return null;
  const stageName = stage.title?.trim() || label;
  return (
    <HoverBadge
      label={label}
      help={`Started from ${stageName}`}
      className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-400"
    />
  );
}

/** Badge for the seeded / wildcard entry tier. */
export function EntryTierBadge({ tier }: { tier: EntryTier }) {
  if (tier === "seeded") {
    return (
      <HoverBadge
        label="S"
        help="Seeded player — qualified directly by ranking"
        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
      />
    );
  }
  return (
    <HoverBadge
      label="WC"
      help="Wildcard — invited entry, not seeded"
      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-400"
    />
  );
}

// ---------------------------------------------------------------------------
// PlayerEntryBadges — inline stage + tier badges for the stage ranking table.
// The start-stage badge is only informative when the player entered an earlier
// stage than the one being listed; otherwise every row of a stage ranking
// would just repeat that stage's own title.
// ---------------------------------------------------------------------------

export function PlayerEntryBadges({
  entryStage,
  entryTier,
  currentStageOrder,
}: {
  entryStage: EntryStageInfo | null;
  entryTier: EntryTier | null;
  currentStageOrder: number | null;
}) {
  const showStage = shouldShowEntryStage(entryStage, currentStageOrder);

  if (!showStage && entryTier === null) return null;

  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 align-middle">
      {showStage && entryStage ? <EntryStageBadge stage={entryStage} /> : null}
      {entryTier !== null ? <EntryTierBadge tier={entryTier} /> : null}
    </span>
  );
}
