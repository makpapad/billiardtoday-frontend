export type HandicapConfidence = "none" | "low" | "medium" | "high";
export type HandicapMode = "starting-points" | "race-to";
export type HandicapCalibrationSource = "baseline-calibration-v1" | "match-history";

export type HandicapPlayerInput = {
  id?: number | null;
  documentId?: string | null;
  name?: string | null;
  careerStats?: Record<string, any> | null;
};

export type HandicapPlayerRating = {
  id: number | null;
  documentId: string | null;
  name: string | null;
  effectiveScore: number;
  overallAvg: number;
  recentAvg: number;
  totalMatches: number;
  highestRun: number;
  bestAverage: number;
  internalHandy: number;
  calibrationBand: string;
};

export type HandicapAdjustment = {
  label: string;
  points: number;
  reason: string;
};

export type HandicapCalibration = {
  source: HandicapCalibrationSource;
  baseHandicap: number;
  adjustment: number;
  finalHandicap: number;
  adjustments: HandicapAdjustment[];
};

const DEFAULT_SCORE = 500;
const MIN_MATCHES = 5;
const DEFAULT_MODE: HandicapMode = "starting-points";

const CALIBRATION_SOURCE: HandicapCalibrationSource = "baseline-calibration-v1";

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeGameType = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const isThreeCushionKey = (value: unknown) => {
  const normalized = normalizeGameType(value);
  return normalized === "threecushion" || normalized === "3cushion";
};

const pickAggregate = (
  careerStats: Record<string, any> | null | undefined,
  gameType: string,
): Record<string, any> | null => {
  if (!careerStats || typeof careerStats !== "object") return null;

  const byGameType =
    careerStats.byGameType && typeof careerStats.byGameType === "object"
      ? careerStats.byGameType
      : null;

  if (byGameType) {
    const requestedKey = normalizeGameType(gameType);
    const entry = Object.entries(byGameType).find(([key]) => {
      if (requestedKey && normalizeGameType(key) === requestedKey) return true;
      return isThreeCushionKey(key);
    });
    if (entry && entry[1] && typeof entry[1] === "object") {
      return entry[1] as Record<string, any>;
    }
  }

  return careerStats.overall && typeof careerStats.overall === "object"
    ? careerStats.overall
    : null;
};

const scoreAggregate = (aggregate: Record<string, any> | null) => {
  if (!aggregate) return DEFAULT_SCORE;

  const avgPerInning = finiteNumber(aggregate.avgPerInning);
  const winPercentage = finiteNumber(aggregate.winPercentage);
  const highestRun = finiteNumber(aggregate.highestRun);
  const bestAverage = finiteNumber(
    aggregate.bestAverage ?? aggregate.bestAverageFromWins,
  );

  return (
    avgPerInning * 420 +
    winPercentage * 2 +
    Math.min(highestRun, 30) * 5 +
    Math.min(bestAverage, 4) * 45
  );
};

const recentAggregateScore = (
  careerStats: Record<string, any> | null | undefined,
  gameType: string,
  now: Date,
) => {
  const byYear =
    careerStats?.byYear && typeof careerStats.byYear === "object"
      ? careerStats.byYear
      : null;
  if (!byYear) return { score: DEFAULT_SCORE, avg: 0 };

  const currentYear = now.getFullYear();
  let weightedScore = 0;
  let weightedAvg = 0;
  let totalWeight = 0;

  for (let offset = 0; offset < 3; offset += 1) {
    const bucket = byYear[String(currentYear - offset)];
    if (!bucket || typeof bucket !== "object") continue;

    const aggregate = pickAggregate(
      {
        overall: (bucket as any).overall,
        byGameType: (bucket as any).byGameType,
      },
      gameType,
    );
    if (!aggregate) continue;

    const matches = finiteNumber(aggregate.totalMatches);
    if (matches <= 0) continue;

    const weight = (3 - offset) * matches;
    weightedScore += scoreAggregate(aggregate) * weight;
    weightedAvg += finiteNumber(aggregate.avgPerInning) * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return { score: DEFAULT_SCORE, avg: 0 };
  return {
    score: weightedScore / totalWeight,
    avg: weightedAvg / totalWeight,
  };
};

const momentumScore = (
  careerStats: Record<string, any> | null | undefined,
  gameType: string,
  now: Date,
) => {
  const byYear =
    careerStats?.byYear && typeof careerStats.byYear === "object"
      ? careerStats.byYear
      : null;
  if (!byYear) return 0;

  const currentBucket = byYear[String(now.getFullYear())];
  const currentAgg = currentBucket
    ? pickAggregate(
        {
          overall: currentBucket.overall,
          byGameType: currentBucket.byGameType,
        },
        gameType,
      )
    : null;

  if (!currentAgg || finiteNumber(currentAgg.totalMatches) < 3) return 0;

  let previousScore = 0;
  let previousWeight = 0;
  for (const yearOffset of [1, 2]) {
    const bucket = byYear[String(now.getFullYear() - yearOffset)];
    const aggregate = bucket
      ? pickAggregate(
          {
            overall: bucket.overall,
            byGameType: bucket.byGameType,
          },
          gameType,
        )
      : null;
    const matches = finiteNumber(aggregate?.totalMatches);
    if (!aggregate || matches <= 0) continue;
    previousScore += scoreAggregate(aggregate) * matches;
    previousWeight += matches;
  }

  if (previousWeight <= 0) return 0;
  return clamp(scoreAggregate(currentAgg) - previousScore / previousWeight, -80, 80);
};

const ratePlayer = (
  player: HandicapPlayerInput,
  gameType: string,
  now: Date,
): HandicapPlayerRating | null => {
  const aggregate = pickAggregate(player.careerStats, gameType);
  if (!aggregate) return null;

  const overallScore = scoreAggregate(aggregate);
  const recent = recentAggregateScore(player.careerStats, gameType, now);
  const momentum = momentumScore(player.careerStats, gameType, now);
  const totalMatches = finiteNumber(aggregate.totalMatches);
  const confidenceFactor = clamp(totalMatches / 30, 0, 1);
  const rawEffectiveScore =
    overallScore * 0.5 + recent.score * 0.35 + (overallScore + momentum) * 0.15;
  const effectiveScore =
    rawEffectiveScore * confidenceFactor + DEFAULT_SCORE * (1 - confidenceFactor);

  const overallAvg = finiteNumber(aggregate.avgPerInning);
  const recentAvg = Number(recent.avg.toFixed(3));
  const handyAverage = recentAvg > 0 && totalMatches >= 15 ? recentAvg : overallAvg;

  return {
    id: Number.isFinite(Number(player.id)) ? Number(player.id) : null,
    documentId: player.documentId ?? null,
    name: player.name ?? null,
    effectiveScore: Math.round(effectiveScore),
    overallAvg,
    recentAvg,
    totalMatches,
    highestRun: finiteNumber(aggregate.highestRun),
    bestAverage: finiteNumber(aggregate.bestAverage ?? aggregate.bestAverageFromWins),
    internalHandy: koreanHandyFromAverage(handyAverage),
    calibrationBand: calibrationBandForAverage(handyAverage),
  };
};

const confidenceFor = (minimumMatches: number): HandicapConfidence => {
  if (minimumMatches < MIN_MATCHES) return "none";
  if (minimumMatches < 15) return "low";
  if (minimumMatches < 30) return "medium";
  return "high";
};

const displayName = (value: string | null) => value?.trim() || "Player";

const calibrationAverageFor = (player: HandicapPlayerRating) =>
  player.recentAvg > 0 && player.totalMatches >= 15
    ? player.recentAvg
    : player.overallAvg;

const calibrationBandForAverage = (average: number) => {
  if (average >= 1.5) return "1.500+";
  if (average >= 1.15) return "1.150-1.499";
  if (average >= 0.9) return "0.900-1.149";
  if (average >= 0.7) return "0.700-0.899";
  if (average >= 0.55) return "0.550-0.699";
  if (average >= 0.4) return "0.400-0.549";
  return "<0.400";
};

const koreanHandyFromAverage = (average: number) => {
  if (average >= 1.7) return 44;
  if (average >= 1.5) return 40;
  if (average >= 1.3) return 36;
  if (average >= 1.15) return 35;
  if (average >= 1.11) return 33;
  if (average >= 0.96) return 32;
  if (average >= 0.86) return 30;
  if (average >= 0.77) return 28;
  if (average >= 0.7) return 27;
  if (average >= 0.64) return 26;
  if (average >= 0.59) return 25;
  if (average >= 0.54) return 24;
  if (average >= 0.495) return 23;
  if (average >= 0.45) return 22;
  if (average >= 0.405) return 21;
  return 20;
};

const targetScale = (targetPoints: number) => Math.sqrt(targetPoints / 40);

const normalizeMode = (value: unknown): HandicapMode =>
  value === "race-to" || value === "korean-race-to"
    ? "race-to"
    : DEFAULT_MODE;

const roundAdjustment = (points: number, targetPoints: number) =>
  Math.round(points * targetScale(targetPoints));

const buildCalibration = (
  stronger: HandicapPlayerRating,
  weaker: HandicapPlayerRating,
  baseHandicap: number,
  targetPoints: number,
): HandicapCalibration => {
  const strongerAvg = calibrationAverageFor(stronger);
  const weakerAvg = calibrationAverageFor(weaker);
  const avgGap = Math.max(0, strongerAvg - weakerAvg);
  const adjustments: HandicapAdjustment[] = [];

  if (strongerAvg >= 1.45 && weakerAvg > 0 && weakerAvg <= 0.58) {
    adjustments.push({
      label: "Elite gap",
      points: roundAdjustment(8, targetPoints),
      reason: "Large correction for a high-level player against a low-average player.",
    });
  } else if (strongerAvg >= 1.15 && weakerAvg > 0 && weakerAvg <= 0.8 && avgGap >= 0.35) {
    adjustments.push({
      label: "Strong-player pressure",
      points: roundAdjustment(2, targetPoints),
      reason: "Small increase because longer runs become more decisive as the stronger player rises.",
    });
  }

  if (strongerAvg < 0.8 && weakerAvg >= 0.4 && avgGap <= 0.25) {
    adjustments.push({
      label: "Low-band compression",
      points: -roundAdjustment(1, targetPoints),
      reason: "Small reduction because close low-band averages should not create an inflated start.",
    });
  }

  if (targetPoints >= 50 && avgGap >= 0.4) {
    adjustments.push({
      label: "Longer match",
      points: 1,
      reason: "Longer targets slightly favor the stronger player.",
    });
  }

  const adjustment = adjustments.reduce((sum, item) => sum + item.points, 0);
  const finalHandicap = clamp(
    baseHandicap + adjustment,
    0,
    Math.max(0, targetPoints - 1),
  );

  return {
    source: CALIBRATION_SOURCE,
    baseHandicap,
    adjustment: finalHandicap - baseHandicap,
    finalHandicap,
    adjustments,
  };
};

const buildReason = (
  stronger: HandicapPlayerRating,
  weaker: HandicapPlayerRating,
  handicapPoints: number,
  mode: HandicapMode,
  calibration: HandicapCalibration,
) => {
  if (mode === "race-to") {
    return {
      reason: `${displayName(stronger.name)} maps to internal handy ${stronger.internalHandy}, while ${displayName(weaker.name)} maps to ${weaker.internalHandy}. Race-to mode keeps separate targets, while calibration is shown for comparison.`,
      reasonEl: `Ο ${displayName(stronger.name)} αντιστοιχεί σε internal handy ${stronger.internalHandy}, ενώ ο ${displayName(weaker.name)} σε ${weaker.internalHandy}. Στο race-to mode κάθε παίκτης παίζει μέχρι τον δικό του στόχο, ενώ το calibration εμφανίζεται για σύγκριση.`,
    };
  }

  if (handicapPoints <= 0) {
    return {
      reason:
        "The players are close enough on recorded 3-cushion stats to play even.",
      reasonEl:
        "Οι παίκτες είναι αρκετά κοντά στα καταγεγραμμένα στατιστικά 3-cushion, οπότε προτείνεται ισόπαλο ξεκίνημα.",
    };
  }

  const strongerName = displayName(stronger.name);
  const weakerName = displayName(weaker.name);

  return {
    reason: `${strongerName} maps to internal handy ${stronger.internalHandy}, while ${weakerName} maps to ${weaker.internalHandy}. Base handicap is ${calibration.baseHandicap}, calibration adjustment is ${calibration.adjustment >= 0 ? "+" : ""}${calibration.adjustment}, final suggestion is ${handicapPoints}.`,
    reasonEl: `Ο ${strongerName} αντιστοιχεί σε internal handy ${stronger.internalHandy}, ενώ ο ${weakerName} σε ${weaker.internalHandy}. Η βάση είναι ${calibration.baseHandicap}, το calibration δίνει ${calibration.adjustment >= 0 ? "+" : ""}${calibration.adjustment}, τελική πρόταση ${handicapPoints} πόντ${handicapPoints === 1 ? "ος" : "οι"} εκκίνησης.`,
  };
};

export function buildHandicapRecommendation(input: {
  playerA: HandicapPlayerInput;
  playerB: HandicapPlayerInput;
  targetPoints?: number | null;
  gameType?: string | null;
  mode?: HandicapMode | string | null;
  now?: Date;
}) {
  const targetPoints = Math.max(1, Math.round(finiteNumber(input.targetPoints, 40)));
  const gameType = input.gameType?.trim() || "Three-Cushion";
  const mode = normalizeMode(input.mode);
  const now = input.now ?? new Date();

  const playerA = ratePlayer(input.playerA, gameType, now);
  const playerB = ratePlayer(input.playerB, gameType, now);

  if (!playerA || !playerB) {
    return {
      targetPoints,
      gameType,
      mode,
      recommendation: {
        available: false,
        label: null,
        confidence: "none" as HandicapConfidence,
        reason: "Not enough recorded matches.",
        reasonEl: "Δεν υπάρχουν αρκετοί καταγεγραμμένοι αγώνες.",
      },
      players: [playerA, playerB].filter(Boolean),
    };
  }

  const confidence = confidenceFor(Math.min(playerA.totalMatches, playerB.totalMatches));
  if (confidence === "none") {
    return {
      targetPoints,
      gameType,
      mode,
      recommendation: {
        available: false,
        label: null,
        confidence,
        reason: "Not enough recorded matches.",
        reasonEl: "Δεν υπάρχουν αρκετοί καταγεγραμμένοι αγώνες.",
      },
      players: [playerA, playerB],
    };
  }

  const stronger = playerA.effectiveScore >= playerB.effectiveScore ? playerA : playerB;
  const weaker = stronger === playerA ? playerB : playerA;
  const handyDiff = Math.abs(playerA.internalHandy - playerB.internalHandy);
  const baseHandicap = clamp(
    Math.round(handyDiff * targetScale(targetPoints)),
    0,
    Math.max(0, targetPoints - 1),
  );
  const calibration = buildCalibration(stronger, weaker, baseHandicap, targetPoints);
  const handicapPoints = calibration.finalHandicap;
  const playerARaceTo = Math.max(1, Math.round(playerA.internalHandy * targetScale(targetPoints)));
  const playerBRaceTo = Math.max(1, Math.round(playerB.internalHandy * targetScale(targetPoints)));

  return {
    targetPoints,
    gameType,
    mode,
    recommendation: {
      available: true,
      weakerPlayerId: weaker.id,
      weakerPlayerDocumentId: weaker.documentId,
      handicapPoints,
      calibration,
      raceTo: {
        playerA: playerARaceTo,
        playerB: playerBRaceTo,
      },
      label:
        mode === "race-to"
          ? `${displayName(playerA.name)} to ${playerARaceTo} / ${displayName(playerB.name)} to ${playerBRaceTo}`
          : handicapPoints > 0
          ? `${displayName(weaker.name)} +${handicapPoints}`
          : "Play even",
      confidence,
      ...buildReason(stronger, weaker, handicapPoints, mode, calibration),
    },
    players: [playerA, playerB],
  };
}
