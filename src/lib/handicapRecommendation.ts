export type HandicapConfidence = "none" | "low" | "medium" | "high";

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
};

const DEFAULT_SCORE = 500;
const MIN_MATCHES = 5;

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

  return {
    id: Number.isFinite(Number(player.id)) ? Number(player.id) : null,
    documentId: player.documentId ?? null,
    name: player.name ?? null,
    effectiveScore: Math.round(effectiveScore),
    overallAvg: finiteNumber(aggregate.avgPerInning),
    recentAvg: Number(recent.avg.toFixed(3)),
    totalMatches,
    highestRun: finiteNumber(aggregate.highestRun),
    bestAverage: finiteNumber(aggregate.bestAverage ?? aggregate.bestAverageFromWins),
  };
};

const confidenceFor = (minimumMatches: number): HandicapConfidence => {
  if (minimumMatches < MIN_MATCHES) return "none";
  if (minimumMatches < 15) return "low";
  if (minimumMatches < 30) return "medium";
  return "high";
};

const displayName = (value: string | null) => value?.trim() || "Player";

const buildReason = (
  stronger: HandicapPlayerRating,
  weaker: HandicapPlayerRating,
  handicapPoints: number,
) => {
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
  const avgText =
    stronger.recentAvg > 0 && stronger.recentAvg > weaker.recentAvg
      ? "recent"
      : "overall";

  return {
    reason: `${strongerName} has the stronger ${avgText} average from recorded 3-cushion stats, so ${weakerName} gets ${handicapPoints} starting point${handicapPoints === 1 ? "" : "s"}.`,
    reasonEl: `Ο ${strongerName} έχει ισχυρότερο ${avgText === "recent" ? "πρόσφατο" : "συνολικό"} μέσο όρο στα καταγεγραμμένα 3-cushion στατιστικά, οπότε ο ${weakerName} παίρνει ${handicapPoints} πόντ${handicapPoints === 1 ? "ο" : "ους"} εκκίνησης.`,
  };
};

export function buildHandicapRecommendation(input: {
  playerA: HandicapPlayerInput;
  playerB: HandicapPlayerInput;
  targetPoints?: number | null;
  gameType?: string | null;
  now?: Date;
}) {
  const targetPoints = Math.max(1, Math.round(finiteNumber(input.targetPoints, 40)));
  const gameType = input.gameType?.trim() || "Three-Cushion";
  const now = input.now ?? new Date();

  const playerA = ratePlayer(input.playerA, gameType, now);
  const playerB = ratePlayer(input.playerB, gameType, now);

  if (!playerA || !playerB) {
    return {
      targetPoints,
      gameType,
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
  const scoreDiff = Math.abs(playerA.effectiveScore - playerB.effectiveScore);
  const maxHandicap = Math.round(targetPoints * 0.35);
  const handicapPoints = clamp(Math.round(scoreDiff / 35), 0, maxHandicap);

  return {
    targetPoints,
    gameType,
    recommendation: {
      available: true,
      weakerPlayerId: weaker.id,
      weakerPlayerDocumentId: weaker.documentId,
      handicapPoints,
      label:
        handicapPoints > 0
          ? `${displayName(weaker.name)} +${handicapPoints}`
          : "Play even",
      confidence,
      ...buildReason(stronger, weaker, handicapPoints),
    },
    players: [playerA, playerB],
  };
}
