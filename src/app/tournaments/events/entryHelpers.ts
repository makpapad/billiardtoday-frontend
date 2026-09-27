import type { NormalizedEventStage, NormalizedGroupPlayer } from "./types";

// ---------------------------------------------------------------------------
// Entry stage ("started from") + entry tier (seeded / wildcard)
//
// Nothing about either value is stored per participant: the entry stage is
// derived from the stages the player actually appears in (the lowest stage
// order wins) and the seeded/wildcard tier is a pure ruleset rule applied to
// the participant seed.
// ---------------------------------------------------------------------------

export type EntryStageInfo = {
  order: number | null;
  title: string | null;
  label: string | null;
};

export type EntryTier = "seeded" | "wildcard";

export type EntryTierRule = {
  /** Highest seed that enters the main tournament as a seeded player. */
  seededThrough: number;
  /** Highest seed that still counts as an entry wildcard. */
  wildcardThrough: number;
};

// UMB World Cup 3-cushion: seeds 1-14 seeded, 15-17 wildcards (15 UMB, 16-17 organiser).
// UMB World Championship 3-cushion: seeds 1-46 seeded, 47-48 wildcards.
export const ENTRY_TIER_RULES: Record<string, EntryTierRule> = {
  umb_world_cup_3c_v1: { seededThrough: 14, wildcardThrough: 17 },
  umb_world_3c_v1: { seededThrough: 46, wildcardThrough: 48 },
};

export function resolveEntryTierRule(
  rulesetKey: string | null | undefined,
): EntryTierRule | null {
  const key =
    typeof rulesetKey === "string"
      ? rulesetKey.trim().toLowerCase()
      : "";
  if (!key) return null;
  return ENTRY_TIER_RULES[key] ?? null;
}

export function entryTierFromSeed(
  seed: number | null | undefined,
  rule: EntryTierRule | null,
): EntryTier | null {
  if (!rule || typeof seed !== "number" || !Number.isFinite(seed) || seed <= 0)
    return null;
  if (seed <= rule.seededThrough) return "seeded";
  if (seed <= rule.wildcardThrough) return "wildcard";
  return null;
}

export const normalizeEntryPlayerName = (
  value: string | null | undefined,
): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function collectStagePlayerKeys(stage: NormalizedEventStage) {
  const keys = new Set<string>();
  const add = (
    documentId: string | null | undefined,
    id: number | null | undefined,
    name: string | null | undefined,
  ) => {
    if (documentId) keys.add(`doc:${documentId}`);
    if (typeof id === "number") keys.add(`id:${id}`);
    const nameKey = normalizeEntryPlayerName(name);
    if (nameKey) keys.add(`name:${nameKey}`);
  };

  stage.groups.forEach((match) => {
    add(
      match.player1.documentId,
      match.player1.id,
      match.player1.name || match.player1.nativeName,
    );
    add(
      match.player2.documentId,
      match.player2.id,
      match.player2.name || match.player2.nativeName,
    );
  });
  stage.results.forEach((result) => {
    add(result.playerDocumentId, result.playerId, result.playerName);
  });

  return keys;
}

// Short, readable form of a stage title: "Q", "PQ", "PPPQ", "PPQ", "1/16", "MAIN".
export function shortEntryStageLabel(title: string | null | undefined) {
  const raw = String(title ?? "").trim();
  if (!raw) return null;

  const condensed = raw.replace(/[^A-Za-z]/g, "");
  if (/^P*Q$/i.test(condensed)) return condensed.toUpperCase();
  // "QUALIFICATION", "PRE QUALIFICATION", "PP QUALIFICATION", "Qualification Round 2" …
  // → Q / PQ / PPQ. The short code is the number of pre-rounds followed by Q.
  if (/qual/i.test(condensed)) {
    const leadingP = (condensed.match(/^(P+)/i)?.[1] ?? "").length;
    const preCount = (condensed.match(/pre/gi) ?? []).length;
    return `${"P".repeat(Math.max(leadingP, preCount))}Q`;
  }

  const fraction = raw.match(/\d+\s*\/\s*\d+/);
  if (fraction) return fraction[0].replace(/\s+/g, "");

  if (/main/i.test(raw)) return "MAIN";

  const firstWord = raw.split(/[\s-]+/)[0] ?? "";
  return firstWord ? firstWord.slice(0, 6).toUpperCase() : null;
}

export function buildEntryStageByPlayerKey(stages: NormalizedEventStage[]) {
  const entryByKey = new Map<string, EntryStageInfo>();
  [...stages]
    .sort(
      (a, b) =>
        (a.order ?? Number.POSITIVE_INFINITY) -
        (b.order ?? Number.POSITIVE_INFINITY),
    )
    .forEach((stage) => {
      const info: EntryStageInfo = {
        order: stage.order,
        title: stage.title,
        label: shortEntryStageLabel(stage.title),
      };
      collectStagePlayerKeys(stage).forEach((key) => {
        if (!entryByKey.has(key)) entryByKey.set(key, info);
      });
    });
  return entryByKey;
}

export function lookupEntryStageForPlayer(
  map: Map<string, EntryStageInfo>,
  player: {
    documentId?: string | null;
    id?: number | null;
    name?: string | null;
  },
): EntryStageInfo | null {
  return (
    (player.documentId ? map.get(`doc:${player.documentId}`) : undefined) ??
    (player.id !== null && player.id !== undefined
      ? map.get(`id:${player.id}`)
      : undefined) ??
    map.get(`name:${normalizeEntryPlayerName(player.name)}`) ??
    null
  );
}

export function lookupEntryStage(
  map: Map<string, EntryStageInfo>,
  result: {
    playerDocumentId?: string | null;
    playerId?: number | null;
    playerName?: string | null;
  },
): EntryStageInfo | null {
  return (
    (result.playerDocumentId
      ? map.get(`doc:${result.playerDocumentId}`)
      : undefined) ??
    (result.playerId !== null && result.playerId !== undefined
      ? map.get(`id:${result.playerId}`)
      : undefined) ??
    map.get(`name:${normalizeEntryPlayerName(result.playerName)}`) ??
    null
  );
}
