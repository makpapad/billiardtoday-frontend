import type { StrapiEventStage, StrapiGroup } from "../types";
import { normalizeEntity, toNumber, toRelationArray } from "../utils";

export type DrawMatch = {
  id: string;
  documentId: string;
  bracketType: "winners" | "losers" | "final";
  roundLabel: string;
  roundIndex: number;
  matchIndex: number;
  globalMatchNumber: number | null;
  winnerToGlobalMatchNumber: number | null;
  winnerToSlot: number | null;
  loserToGlobalMatchNumber: number | null;
  loserToSlot: number | null;
};

export type DrawEdge = {
  from: number;
  to: number;
  type: "winner" | "loser";
  slot: number | null;
};

export type DrawColumn = {
  key: string;
  label: string;
  order: number;
  matches: DrawMatch[];
};

export function getRoundIndex(label: string): number {
  const upper = label.toUpperCase().trim();
  if (upper.startsWith("WINNERS R")) {
    return Number(upper.replace("WINNERS R", "")) || 999;
  }
  if (upper === "WINNERS FINAL") return 999;
  if (upper.startsWith("LOSERS R")) {
    return Number(upper.replace("LOSERS R", "")) || 999;
  }
  if (upper === "LOSERS FINAL") return 999;
  if (upper === "GRAND FINAL") return 1000;
  if (upper === "GRAND FINAL RESET") return 1001;
  return 9999;
}

export function getBracketType(
  rawBracketType: unknown,
  roundLabel: string,
): "winners" | "losers" | "final" {
  const bracket =
    typeof rawBracketType === "string" ? rawBracketType.toLowerCase().trim() : "";
  if (bracket === "winners" || bracket === "losers") return bracket;
  const upper = roundLabel.toUpperCase();
  if (upper.includes("GRAND FINAL")) return "final";
  if (upper.includes("WINNERS")) return "winners";
  if (upper.includes("LOSERS")) return "losers";
  return "final";
}

export function buildDrawMatches(activeStage: StrapiEventStage | null): DrawMatch[] {
  if (!activeStage) return [];
  const groups = toRelationArray(activeStage.groups);
  return groups
    .map((group, index) => {
      const normalized = normalizeEntity<StrapiGroup>(group, `match-${index}`);
      const normalizedRecord = normalized as Record<string, unknown>;
      const roundLabel =
        typeof normalizedRecord.round === "string" && normalizedRecord.round.trim()
          ? normalizedRecord.round.trim()
          : "Round";
      return {
        id: normalized.id,
        documentId: normalized.documentId,
        bracketType: getBracketType(normalizedRecord.bracket_type, roundLabel),
        roundLabel,
        roundIndex: getRoundIndex(roundLabel),
        matchIndex:
          toNumber((normalized as { match_number?: unknown }).match_number) ?? index + 1,
        globalMatchNumber: toNumber(normalized.global_match_number),
        winnerToGlobalMatchNumber: toNumber(normalized.winner_to_global_match_number),
        winnerToSlot: toNumber(normalized.winner_to_slot),
        loserToGlobalMatchNumber: toNumber(normalized.loser_to_global_match_number),
        loserToSlot: toNumber(normalized.loser_to_slot),
      } satisfies DrawMatch;
    })
    .filter((match) => match.globalMatchNumber)
    .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));
}

export function buildDrawEdges(matches: DrawMatch[]): DrawEdge[] {
  const edges: DrawEdge[] = [];
  matches.forEach((match) => {
    if (!match.globalMatchNumber) return;
    if (match.winnerToGlobalMatchNumber) {
      edges.push({
        from: match.globalMatchNumber,
        to: match.winnerToGlobalMatchNumber,
        type: "winner",
        slot: match.winnerToSlot,
      });
    }
    if (match.loserToGlobalMatchNumber) {
      edges.push({
        from: match.globalMatchNumber,
        to: match.loserToGlobalMatchNumber,
        type: "loser",
        slot: match.loserToSlot,
      });
    }
  });
  return edges;
}

function getColumnOrder(match: DrawMatch): number {
  const label = match.roundLabel.trim().toUpperCase();
  const losers = label.match(/^LOSER(?:S)? ROUND\s+(\d+)$/);
  if (losers) {
    return 100 - Number(losers[1]);
  }

  if (label === "ROUND 1") return 200;
  const winnerRound = label.match(/^WINNER(?:S)? ROUND\s+(\d+)$/);
  if (winnerRound) {
    return 200 + Number(winnerRound[1]);
  }
  if (label === "WINNERS QUALIFICATION") return 203;
  if (label === "LAST SIXTEEN") return 204;
  if (label === "QUARTER FINAL") return 205;
  if (label === "SEMI FINAL") return 206;
  if (label === "WINNERS FINAL") return 207;
  if (label === "LOSERS FINAL") return 208;
  if (label === "FINAL") return 209;
  if (label === "GRAND FINAL") return 210;
  if (label === "GRAND FINAL RESET") return 211;
  return 999;
}

export function buildFullPyramidColumns(matches: DrawMatch[]): DrawColumn[] {
  const groups = new Map<string, DrawColumn>();
  matches.forEach((match) => {
    const key = `${getColumnOrder(match)}:${match.roundLabel}`;
    const current = groups.get(key);
    if (current) {
      current.matches.push(match);
      return;
    }
    groups.set(key, {
      key,
      label: match.roundLabel,
      order: getColumnOrder(match),
      matches: [match],
    });
  });

  return Array.from(groups.values())
    .map((column) => ({
      ...column,
      matches: column.matches
        .slice()
        .sort(
          (a, b) =>
            (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999),
        ),
    }))
    .sort((a, b) => a.order - b.order);
}
