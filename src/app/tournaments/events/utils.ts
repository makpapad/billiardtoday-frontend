import type {
  StrapiEventStage,
  StrapiGroup,
  StrapiResult,
  StrapiFinalResult,
  NormalizedEventStage,
  NormalizedGroupMatch,
  NormalizedGroupPlayer,
  NormalizedStageResult,
  NormalizedFinalResult,
  StageMatchGroup,
  PlayerRecord,
  GroupStanding,
} from "./types";

export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const looksLikeUtf8Mojibake = (value: string): boolean =>
  /[ÃÂ][\u0080-\u00FF]/.test(value) ||
  value.includes("Ã") ||
  value.includes("Â");

const repairUtf8Mojibake = (value: string): string => {
  if (!looksLikeUtf8Mojibake(value)) return value;
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8").trim();
    return repaired && repaired.includes("�") === false ? repaired : value;
  } catch {
    return value;
  }
};

export const toRelationArray = (value: unknown): unknown[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { data?: unknown[] }).data)
  ) {
    return (value as { data?: unknown[] }).data ?? [];
  }
  return [];
};

export const normalizeEntity = <T extends Record<string, unknown>>(
  entity: unknown,
  fallbackId: string,
): T & { id: string; documentId: string } => {
  if (!entity || typeof entity !== "object") {
    return { id: fallbackId, documentId: fallbackId } as T & {
      id: string;
      documentId: string;
    };
  }

  const candidate = entity as Record<string, unknown>;
  const attributes =
    typeof candidate.attributes === "object" && candidate.attributes !== null
      ? (candidate.attributes as Record<string, unknown>)
      : candidate;

  const idValue =
    candidate.documentId ??
    attributes.documentId ??
    candidate.id ??
    attributes.id ??
    fallbackId;
  const documentId = attributes.documentId ?? candidate.documentId ?? idValue;

  return {
    ...attributes,
    id: `${idValue}`,
    documentId: `${documentId}`,
  } as T & { id: string; documentId: string };
};

export const normalizePlayer = (
  player: unknown,
  fallbackId: string,
): {
  id: number | null;
  name: string;
  nativeName: string | null;
  country: string | null;
  documentId: string | null;
} => {
  const source =
    player && typeof player === "object" && (player as { data?: unknown }).data
      ? (player as { data?: unknown }).data
      : player;
  const normalized = normalizeEntity<{
    id?: unknown;
    full_name?: unknown;
    full_name_en?: unknown;
  }>(source, fallbackId);

  const nameEn =
    typeof normalized.full_name_en === "string"
      ? repairUtf8Mojibake(normalized.full_name_en.trim())
      : "";
  const nativeName =
    typeof normalized.full_name === "string"
      ? repairUtf8Mojibake(normalized.full_name.trim())
      : "";
  const name = nameEn || nativeName;
  const country =
    typeof (normalized as { country?: unknown }).country === "string"
      ? (normalized as { country?: string }).country?.trim() || null
      : null;

  // Extract numeric id from the source
  const rawId =
    source && typeof source === "object" && "id" in source
      ? (source as { id?: unknown }).id
      : null;
  const numericId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? parseInt(rawId, 10)
        : null;

  return {
    id: numericId && !Number.isNaN(numericId) ? numericId : null,
    name,
    nativeName: nativeName || null,
    country,
    documentId: normalized.documentId ?? null,
  };
};

export const normalizeGroup = (
  group: unknown,
  fallbackId: string,
): NormalizedGroupMatch => {
  const normalized = normalizeEntity<StrapiGroup>(group, fallbackId);

  const player1 = normalizePlayer(normalized.player1, `${normalized.id}-p1`);
  const player2 = normalizePlayer(normalized.player2, `${normalized.id}-p2`);

  return {
    id: normalized.id,
    documentId: normalized.documentId,
    number: toNumber(normalized.number),
    matchNumber: toNumber(normalized.match_number),
    dateTime:
      typeof normalized.date_time === "string" ? normalized.date_time : null,
    player1: {
      id: player1.id,
      name: player1.name,
      nativeName: player1.nativeName,
      country: player1.country,
      documentId: player1.documentId,
      points: toNumber(normalized.player1_points),
      matchPoints: toNumber(normalized.player1_match_points),
      innings: toNumber(normalized.player1_innings),
      highRun: toNumber(normalized.player1_high_run),
      highRun2: toNumber(normalized.player1_high_run_2),
    },
    player2: {
      id: player2.id,
      name: player2.name,
      nativeName: player2.nativeName,
      country: player2.country,
      documentId: player2.documentId,
      points: toNumber(normalized.player2_points),
      matchPoints: toNumber(normalized.player2_match_points),
      innings: toNumber(normalized.player2_innings),
      highRun: toNumber(normalized.player2_high_run),
      highRun2: toNumber(normalized.player2_high_run_2),
    },
    inningsDetail: normalized.inningsDetail,
    matchSheetJson: normalized.matchSheetJson,
  };
};

export const normalizeResult = (
  result: unknown,
  fallbackId: string,
): NormalizedStageResult => {
  const normalized = normalizeEntity<StrapiResult>(result, fallbackId);
  const player = normalizePlayer(normalized.player, `${normalized.id}-player`);

  return {
    id: normalized.id,
    documentId: normalized.documentId,
    playerId: player.id,
    playerDocumentId: player.documentId,
    playerName: player.name,
    playerNativeName: player.nativeName ?? null,
    playerCountry: player.country ?? null,
    matchPoints: toNumber(normalized.match_points),
    points: toNumber(normalized.points),
    innings: toNumber(normalized.innings),
    bestAverage: toNumber((normalized as typeof normalized & { best_average?: unknown }).best_average),
    highRun: toNumber(normalized.high_run),
    groupNumber: toNumber(normalized.group_number),
    groupPosition: toNumber(normalized.group_position),
    finalPosition: toNumber(normalized.final_position),
  };
};

export const normalizeFinalResult = (
  result: unknown,
  fallbackId: string,
): NormalizedFinalResult => {
  const normalized = normalizeEntity<StrapiFinalResult>(result, fallbackId);
  const player = normalizePlayer(normalized.player, `${normalized.id}-player`);

  return {
    id: normalized.id,
    documentId: normalized.documentId,
    position: toNumber(normalized.position),
    playerId: player.id,
    playerDocumentId: player.documentId ?? null,
    playerName: player.name,
    playerCountry: player.country ?? null,
    matchPoints: toNumber((normalized as typeof normalized & { match_points?: unknown }).match_points) ?? toNumber(normalized.points),
    bestAverage: toNumber(normalized.best_average),
    bestGame: toNumber((normalized as typeof normalized & { best_game?: unknown }).best_game),
    caroms: toNumber(normalized.caroms),
    points: toNumber(normalized.points),
    innings: toNumber(normalized.innings),
    highRun: toNumber(normalized.high_run),
    highRun2: toNumber(normalized.high_run_2),
    rankingPoints: toNumber(normalized.ranking_points),
    penalty: toNumber(normalized.penalty),
    finalPoints: toNumber(normalized.final_points),
  };
};

export const formatDateValue = (value: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export const formatDateRange = (
  start: string | null,
  end: string | null,
): string | null => {
  const startText = formatDateValue(start);
  const endText = formatDateValue(end);
  if (startText && endText) {
    if (startText === endText) return startText;
    return `${startText} – ${endText}`;
  }
  return startText ?? endText ?? null;
};

export const formatDateForTable = (value: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export const formatNumberValue = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value}`;
};

export const getMatchOutcome = (
  player: NormalizedGroupPlayer,
  opponent: NormalizedGroupPlayer,
): "W" | "L" | "D" | null => {
  const isUnplayed =
    (player.matchPoints ?? 0) === 0 &&
    (opponent.matchPoints ?? 0) === 0 &&
    (player.points ?? 0) === 0 &&
    (opponent.points ?? 0) === 0 &&
    (player.innings ?? 0) === 0 &&
    (opponent.innings ?? 0) === 0 &&
    (player.highRun ?? 0) === 0 &&
    (opponent.highRun ?? 0) === 0 &&
    (player.highRun2 ?? 0) === 0 &&
    (opponent.highRun2 ?? 0) === 0;
  if (isUnplayed) return null;
  if (player.matchPoints === null || opponent.matchPoints === null) return null;
  if (player.matchPoints > opponent.matchPoints) return "W";
  if (player.matchPoints < opponent.matchPoints) return "L";
  return "D";
};

export const getMatchRowClass = (outcome: "W" | "L" | "D" | null): string => {
  if (outcome === "W") return "bg-emerald-100/80 dark:bg-emerald-900/30";
  if (outcome === "L") return "bg-rose-100/80 dark:bg-rose-900/30";
  return "bg-gray-50 dark:bg-gray-800/50";
};

export const getDateCellClass = (): string => {
  return "bg-amber-50 dark:bg-amber-900/20";
};

export const compareDateTime = (a: string | null, b: string | null): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (!Number.isNaN(dateA.getTime()) && !Number.isNaN(dateB.getTime())) {
    return dateA.getTime() - dateB.getTime();
  }
  return a.localeCompare(b);
};

export const buildStageMatchGroups = (
  groups: NormalizedGroupMatch[],
): StageMatchGroup[] => {
  const grouped: Record<string, StageMatchGroup> = {};

  groups.forEach((match, index) => {
    const key = match.number !== null ? `${match.number}` : match.id;
    if (!grouped[key]) {
      grouped[key] = {
        key,
        number: match.number ?? null,
        matches: [],
      };
    }

    grouped[key].matches.push({
      key: match.id ?? `${key}-match-${index}`,
      matchDocumentId: match.documentId ?? null,
      matchNumber: match.matchNumber,
      dateTime: match.dateTime,
      inningsDetail: match.inningsDetail,
      matchSheetJson: match.matchSheetJson,
      top: {
        player: match.player1,
        outcome: getMatchOutcome(match.player1, match.player2),
      },
      bottom: {
        player: match.player2,
        outcome: getMatchOutcome(match.player2, match.player1),
      },
    });
  });

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      matches: group.matches.sort((a, b) => {
        if (
          a.matchNumber !== null &&
          b.matchNumber !== null &&
          a.matchNumber !== b.matchNumber
        ) {
          return a.matchNumber - b.matchNumber;
        }
        if (a.matchNumber !== null) return -1;
        if (b.matchNumber !== null) return 1;
        return compareDateTime(a.dateTime, b.dateTime);
      }),
    }))
    .sort((a, b) => {
      if (a.number !== null && b.number !== null) return a.number - b.number;
      if (a.number !== null) return -1;
      if (b.number !== null) return 1;
      return a.key.localeCompare(b.key);
    });
};

export const formatAverage = (
  points: number | null,
  innings: number | null,
): string => {
  if (points === null || innings === null || innings === 0) return "-";
  const result = points / innings;
  if (!Number.isFinite(result)) return "-";
  
  return formatTruncatedNumber(result, 3);
};

export const formatTruncatedNumber = (
  value: number | null,
  digits = 3,
): string => {
  if (value === null || Number.isNaN(value)) return "-";
  const factor = Math.pow(10, digits);
  const truncated = Math.trunc(value * factor) / factor;
  return truncated.toFixed(digits);
};

export const formatOutcomeLabel = (outcome: "W" | "L" | "D" | null): string => {
  if (!outcome) return "-";
  if (outcome === "W") return "W";
  if (outcome === "L") return "L";
  return "D";
};

export const aggregateRecord = (
  record: PlayerRecord,
  outcome: "W" | "L" | "D" | null,
): PlayerRecord => {
  if (outcome === "W") return { ...record, wins: record.wins + 1 };
  if (outcome === "L") return { ...record, losses: record.losses + 1 };
  if (outcome === "D") return { ...record, draws: record.draws + 1 };
  return record;
};

export const hasPlayedStageMatch = (
  match: StageMatchGroup["matches"][number],
): boolean =>
  [match.top, match.bottom].some(
    (entry) =>
      entry.outcome !== null ||
      (entry.player.points ?? 0) > 0 ||
      (entry.player.innings ?? 0) > 0 ||
      (entry.player.highRun ?? 0) > 0 ||
      (entry.player.highRun2 ?? 0) > 0 ||
      (entry.player.matchPoints ?? 0) > 0,
  );

export const buildGroupStandings = (
  matches: StageMatchGroup["matches"],
  options?: { artistic?: boolean; suppressBestAverage?: boolean },
): GroupStanding[] => {
  const artistic = options?.artistic === true;
  const suppressBestAverage = options?.suppressBestAverage === true;
  const truncateTo3Decimals = (value: number): number =>
    Math.trunc(value * 1000) / 1000;
  const computeArtisticPercentage = (
    points: number | null | undefined,
    possiblePoints: number | null | undefined,
  ): number => {
    const succeededPoints =
      typeof points === "number" && Number.isFinite(points) ? points : 0;
    const totalPossiblePoints =
      typeof possiblePoints === "number" && Number.isFinite(possiblePoints)
        ? possiblePoints
        : 0;

    if (succeededPoints <= 0 || totalPossiblePoints <= 0) return 0;

    const pct = (succeededPoints * 100) / totalPossiblePoints;
    return Number.isFinite(pct) ? truncateTo3Decimals(pct) : 0;
  };
  const compareArtisticMetrics = (
    a: GroupStanding,
    b: GroupStanding,
    compareOptions?: { includeHighRun?: boolean; includeMatchPoints?: boolean },
  ): number => {
    const includeMatchPoints = compareOptions?.includeMatchPoints !== false;
    const includeHighRun = compareOptions?.includeHighRun !== false;

    if (includeMatchPoints && a.totalMatchPoints !== b.totalMatchPoints) {
      return b.totalMatchPoints - a.totalMatchPoints;
    }

    const pctA = computeArtisticPercentage(a.totalPoints, a.totalInnings);
    const pctB = computeArtisticPercentage(b.totalPoints, b.totalInnings);
    if (pctA !== pctB) return pctB - pctA;

    if (includeHighRun) {
      const highRunA = a.highRun ?? -1;
      const highRunB = b.highRun ?? -1;
      if (highRunA !== highRunB) return highRunB - highRunA;
    }

    return a.playerName.localeCompare(b.playerName);
  };
  const resolveArtisticDirectComparison = (
    standings: GroupStanding[],
  ): GroupStanding[] => {
    const resolved: GroupStanding[] = [];
    let index = 0;

    while (index < standings.length) {
      const current = standings[index];
      const tiedBlock = [current];
      let nextIndex = index + 1;

      while (
        nextIndex < standings.length &&
        compareArtisticMetrics(current, standings[nextIndex], {
          includeHighRun: false,
        }) === 0
      ) {
        tiedBlock.push(standings[nextIndex]);
        nextIndex += 1;
      }

      if (tiedBlock.length === 1) {
        resolved.push(current);
        index = nextIndex;
        continue;
      }

      const tiedKeys = new Set(tiedBlock.map((standing) => standing.key));
      const directStats = new Map<
        string,
        { totalMatchPoints: number; totalPoints: number; totalInnings: number }
      >(
        tiedBlock.map((standing) => [
          standing.key,
          { totalMatchPoints: 0, totalPoints: 0, totalInnings: 0 },
        ]),
      );

      matches.forEach((match) => {
        const topKey = match.top.player.documentId ?? `${match.top.player.name}-top`;
        const bottomKey =
          match.bottom.player.documentId ?? `${match.bottom.player.name}-bottom`;
        if (!tiedKeys.has(topKey) || !tiedKeys.has(bottomKey)) return;

        const topStats = directStats.get(topKey);
        const bottomStats = directStats.get(bottomKey);
        if (!topStats || !bottomStats) return;

        topStats.totalMatchPoints += match.top.player.matchPoints ?? 0;
        topStats.totalPoints += match.top.player.points ?? 0;
        topStats.totalInnings += match.top.player.innings ?? 0;

        bottomStats.totalMatchPoints += match.bottom.player.matchPoints ?? 0;
        bottomStats.totalPoints += match.bottom.player.points ?? 0;
        bottomStats.totalInnings += match.bottom.player.innings ?? 0;
      });

      const sortedBlock = [...tiedBlock].sort((left, right) => {
        const leftDirect = directStats.get(left.key);
        const rightDirect = directStats.get(right.key);

        if (leftDirect && rightDirect) {
          if (leftDirect.totalMatchPoints !== rightDirect.totalMatchPoints) {
            return rightDirect.totalMatchPoints - leftDirect.totalMatchPoints;
          }

          const directPctLeft = computeArtisticPercentage(
            leftDirect.totalPoints,
            leftDirect.totalInnings,
          );
          const directPctRight = computeArtisticPercentage(
            rightDirect.totalPoints,
            rightDirect.totalInnings,
          );
          if (directPctLeft !== directPctRight) {
            return directPctRight - directPctLeft;
          }
        }

        return compareArtisticMetrics(left, right);
      });

      resolved.push(...sortedBlock);
      index = nextIndex;
    }

    return resolved;
  };
  if (!matches.some(hasPlayedStageMatch)) {
    return [];
  }

  const players = matches.reduce<Record<string, GroupStanding>>(
    (acc, match) => {
      const applyEntry = (
        entry: typeof match.top,
        position: "top" | "bottom",
      ) => {
        const key =
          entry.player.documentId ?? `${entry.player.name}-${position}`;
        if (!acc[key]) {
          acc[key] = {
            key,
            playerId: entry.player.id,
            playerName: entry.player.name,
            playerNativeName: entry.player.nativeName ?? null,
            playerCountry: entry.player.country ?? null,
            record: { wins: 0, draws: 0, losses: 0 },
            totalMatchPoints: 0,
            totalPoints: 0,
            totalInnings: 0,
            average: null,
            bestAverage: null,
            highRun: null,
            highRun2: null,
            place: 0,
          };
        }

        const current = acc[key];
        const hasPlayedEntry =
          entry.outcome !== null ||
          (entry.player.points ?? 0) > 0 ||
          (entry.player.innings ?? 0) > 0 ||
          (entry.player.highRun ?? 0) > 0 ||
          (entry.player.highRun2 ?? 0) > 0 ||
          (entry.player.matchPoints ?? 0) > 0;
        const entryAverage =
          typeof entry.player.points === "number" &&
          typeof entry.player.innings === "number" &&
          entry.player.innings > 0
            ? truncateTo3Decimals(entry.player.points / entry.player.innings)
            : null;
        const bestAverageCandidate =
          artistic
            ? entryAverage
            : suppressBestAverage
            ? null
            : (entry.outcome === "W" || entry.outcome === "D") &&
          typeof entry.player.points === "number" &&
          typeof entry.player.innings === "number" &&
          entry.player.innings > 0
            ? truncateTo3Decimals(entry.player.points / entry.player.innings)
            : null;
        acc[key] = {
          ...current,
          record: aggregateRecord(current.record, entry.outcome),
          totalMatchPoints:
            current.totalMatchPoints +
            (hasPlayedEntry ? (entry.player.matchPoints ?? 0) : 0),
          totalPoints: current.totalPoints + (entry.player.points ?? 0),
          totalInnings: current.totalInnings + (entry.player.innings ?? 0),
          bestAverage:
            bestAverageCandidate === null
              ? current.bestAverage
              : Math.max(current.bestAverage ?? 0, bestAverageCandidate),
          highRun: Math.max(current.highRun ?? 0, entry.player.highRun ?? 0),
          highRun2: Math.max(current.highRun2 ?? 0, entry.player.highRun2 ?? 0),
        };
      };

      applyEntry(match.top, "top");
      applyEntry(match.bottom, "bottom");

      return acc;
    },
    {},
  );

  const standings = Object.values(players).map((standing) => {
    const averageValue =
      standing.totalInnings > 0
        ? truncateTo3Decimals(standing.totalPoints / standing.totalInnings)
        : null;
    const bestAverageValue = standing.bestAverage;
    const bestHighRun = standing.highRun;
    const bestHighRun2 = standing.highRun2;
    return {
      ...standing,
      average: averageValue,
      bestAverage: bestAverageValue,
      highRun: bestHighRun,
      highRun2: bestHighRun2,
    };
  });

  const sortedStandings = artistic
    ? resolveArtisticDirectComparison(
        [...standings].sort((a, b) => compareArtisticMetrics(a, b)),
      )
    : [...standings].sort((a, b) => {
        if (a.totalMatchPoints !== b.totalMatchPoints)
          return b.totalMatchPoints - a.totalMatchPoints;
        const avgA = a.average ?? -1;
        const avgB = b.average ?? -1;
        if (avgA !== avgB) return avgB - avgA;
        const highRunA = a.highRun ?? -1;
        const highRunB = b.highRun ?? -1;
        if (highRunA !== highRunB) return highRunB - highRunA;
        const bestAvgA = a.bestAverage ?? -1;
        const bestAvgB = b.bestAverage ?? -1;
        if (bestAvgA !== bestAvgB) return bestAvgB - bestAvgA;
        const highRun2A = a.highRun2 ?? -1;
        const highRun2B = b.highRun2 ?? -1;
        if (highRun2A !== highRun2B) return highRun2B - highRun2A;
        return a.playerName.localeCompare(b.playerName);
      });

  return sortedStandings.map((standing, index) => ({
    ...standing,
    place: index + 1,
  }));
};

export const formatRecord = (record: PlayerRecord): string =>
  `${record.wins}-${record.draws}-${record.losses}`;
