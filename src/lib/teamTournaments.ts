/**
 * Team tournaments (διασυλλογικά) — public frontend data layer.
 *
 * Fetches from Strapi public REST API (read permissions granted for
 * team-tournament / team-match / team-match-set / team / team-group).
 * Standings computation mirrors the admin matches page exactly:
 *   src/app/(protected-pages)/admin/team-tournaments/[id]/matches/page.tsx
 * and the Strapi lifecycle src/api/team-match-set/content-types/team-match-set/lifecycles.js
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamTournamentSummary = {
  documentId: string;
  title: string;
  teamSize: number | null;
  divisionName: string | null;
  formatType: string | null;
  countryCode: string | null;
  season: number | null;
  gameType: string | null;
  config: Record<string, unknown> | null;
  scoringConfig: Record<string, unknown> | null;
  teamCount: number;
};

export type TeamEntity = {
  id: number | null;
  documentId: string | null;
  name: string;
  slug: string | null;
  category: string | null;
};

export type TeamGroup = {
  id: number | null;
  documentId: string | null;
  groupKey: string;
  title: string | null;
  teams: TeamEntity[];
};

export type TeamMatchSet = {
  id: number | null;
  documentId: string | null;
  boardIndex: number | null;
  result: string | null;
  homePoints: number | null;
  awayPoints: number | null;
  homeInnings: number | null;
  awayInnings: number | null;
  homeHighRun: number | null;
  awayHighRun: number | null;
  homePlayerName: string | null;
  awayPlayerName: string | null;
};

export type MatchComputed = {
  homeTotalPoints: number;
  awayTotalPoints: number;
  homeTotalInnings: number;
  awayTotalInnings: number;
  homeHighRun: number;
  awayHighRun: number;
  homeBoardPoints: number;
  awayBoardPoints: number;
  homeTeamPoints: number;
  awayTeamPoints: number;
  boardCount: number;
};

export type NormalizedTeamMatch = {
  id: number | null;
  documentId: string | null;
  stage: string;
  groupKey: string;
  round: number | null;
  status: string;
  matchDate: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  winnerTeamName: string | null;
  sets: TeamMatchSet[];
  computed: MatchComputed;
};

export type ComputedStandingRow = {
  key: string;
  teamId: number | null;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  leaguePoints: number;
  framesFor: number;
  framesAgainst: number;
  frameDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  inningsFor: number;
  avg: number;
  highestRun: number;
};

export type TeamTournamentDetail = {
  summary: TeamTournamentSummary;
  groups: TeamGroup[];
  matches: NormalizedTeamMatch[];
  standingsByGroup: Record<string, ComputedStandingRow[]>;
};

// ---------------------------------------------------------------------------
// Fetch helpers (public REST, no auth needed)
// ---------------------------------------------------------------------------

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PRIMARY_STRAPI_URL =
  process.env.STRAPI_API_URL ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : process.env.NEXT_PUBLIC_STRAPI_URL) ||
  "https://app.billiardtoday.com";
const FALLBACK_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(
  new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean)),
) as string[];

const fetchPublic = async (path: string): Promise<unknown> => {
  const runtimeOptions: RequestInit & { next?: { revalidate: number } } = IS_PRODUCTION
    ? { next: { revalidate: 60 } }
    : { cache: "no-store" };

  for (const baseUrl of STRAPI_URLS) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, runtimeOptions).catch(() => null);
    if (response?.ok) {
      return response.json().catch(() => null);
    }
  }
  return null;
};

const readList = (json: unknown): Record<string, unknown>[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown }).data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readString = (value: unknown): string | null => {
  const cleaned = String(value || "").trim();
  return cleaned || null;
};

/** Strapi v5 entities are flat (no `attributes` wrapper); handle both shapes. */
const flatten = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  if (record.attributes && typeof record.attributes === "object") {
    return { ...(record.attributes as Record<string, unknown>), ...record };
  }
  return record;
};

const unwrapRelationArray = (value: unknown): Record<string, unknown>[] => {
  if (!value) return [];
  if (typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    const data = (value as { data?: unknown }).data;
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  }
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
};

const slugify = (value: string): string =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

// ---------------------------------------------------------------------------
// Team tournament summary
// ---------------------------------------------------------------------------

const normalizeTeamTournamentSummary = (raw: unknown): TeamTournamentSummary | null => {
  const entity = flatten(raw);
  const title = readString(entity.title);
  if (!title) return null;

  const config =
    entity.config && typeof entity.config === "object"
      ? (entity.config as Record<string, unknown>)
      : {};
  const scoringConfig =
    entity.scoring_config && typeof entity.scoring_config === "object"
      ? (entity.scoring_config as Record<string, unknown>)
      : null;

  const season = toNumber(config.season);
  const gameType = readString(config.game_type);

  return {
    documentId: readString(entity.documentId) || "",
    title,
    teamSize: toNumber(entity.team_size),
    divisionName: readString(entity.division_name),
    formatType: readString(entity.format_type),
    countryCode: readString(entity.country_code),
    season,
    gameType,
    config,
    scoringConfig,
    teamCount: 0,
  };
};

export const fetchTeamTournaments = async (): Promise<TeamTournamentSummary[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
  params.set("sort[0]", "title:asc");
  const json = await fetchPublic(`/api/team-tournaments?${params.toString()}`);
  const items = readList(json);

  const summaries = items
    .map(normalizeTeamTournamentSummary)
    .filter((s): s is TeamTournamentSummary => Boolean(s));

  // Team counts via groups relation (populate teams, count unique)
  const withCounts = await Promise.all(
    summaries.map(async (summary) => {
      const groupsParams = new URLSearchParams();
      groupsParams.set(
        "filters[team_tournament][documentId][$eq]",
        summary.documentId,
      );
      groupsParams.set("populate[teams][fields][0]", "name");
      groupsParams.set("pagination[pageSize]", "100");
      const groupsJson = await fetchPublic(`/api/team-groups?${groupsParams.toString()}`);
      const teamIds = new Set<number>();
      readList(groupsJson).forEach((g) => {
        unwrapRelationArray(flatten(g).teams).forEach((t) => {
          const id = toNumber(t.id);
          if (id !== null) teamIds.add(id);
        });
      });
      return { ...summary, teamCount: teamIds.size };
    }),
  );

  return withCounts;
};

export const buildTeamTournamentSlug = (summary: TeamTournamentSummary): string => {
  const base = slugify(summary.title);
  return summary.season ? `${base}-${summary.season}` : base;
};

export const resolveTeamTournamentBySlug = async (
  slug: string,
): Promise<TeamTournamentSummary | null> => {
  const cleanSlug = slugify(String(slug || "").trim());
  if (!cleanSlug) return null;

  const all = await fetchTeamTournaments();
  return all.find((s) => buildTeamTournamentSlug(s) === cleanSlug) ?? null;
};

export const fetchTeamTournamentByDocumentId = async (
  documentId: string,
): Promise<TeamTournamentSummary | null> => {
  if (!documentId) return null;
  const json = await fetchPublic(`/api/team-tournaments/${documentId}`);
  return json ? normalizeTeamTournamentSummary(json) : null;
};

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

const normalizeTeamGroup = (raw: unknown): TeamGroup | null => {
  const entity = flatten(raw);
  const groupKey = readString(entity.group_key);
  if (!groupKey) return null;

  const teams = unwrapRelationArray(entity.teams)
    .map((t) => {
      const team = flatten(t);
      const name = readString(team.name);
      if (!name) return null;
      return {
        id: toNumber(team.id),
        documentId: readString(team.documentId),
        name,
        slug: readString(team.slug),
        category: readString(team.category),
      } satisfies TeamEntity;
    })
    .filter((t): t is TeamEntity => Boolean(t));

  return {
    id: toNumber(entity.id),
    documentId: readString(entity.documentId),
    groupKey,
    title: readString(entity.title),
    teams,
  };
};

export const fetchTeamGroups = async (
  tournamentDocumentId: string,
): Promise<TeamGroup[]> => {
  if (!tournamentDocumentId) return [];
  const params = new URLSearchParams();
  params.set("filters[team_tournament][documentId][$eq]", tournamentDocumentId);
  params.set("populate[teams][fields][0]", "name");
  params.set("populate[teams][fields][1]", "slug");
  params.set("populate[teams][fields][2]", "category");
  params.set("pagination[pageSize]", "100");
  params.set("sort[0]", "group_key:asc");
  const json = await fetchPublic(`/api/team-groups?${params.toString()}`);
  return readList(json)
    .map(normalizeTeamGroup)
    .filter((g): g is TeamGroup => Boolean(g));
};

// ---------------------------------------------------------------------------
// Matches + sets
// ---------------------------------------------------------------------------

const normalizeTeamMatchSet = (raw: unknown): TeamMatchSet | null => {
  const entity = flatten(raw);
  const homePlayer = flatten(entity.home_player);
  const awayPlayer = flatten(entity.away_player);

  return {
    id: toNumber(entity.id),
    documentId: readString(entity.documentId),
    boardIndex: toNumber(entity.board_index),
    result: readString(entity.result),
    homePoints: toNumber(entity.home_points),
    awayPoints: toNumber(entity.away_points),
    homeInnings: toNumber(entity.home_innings),
    awayInnings: toNumber(entity.away_innings),
    homeHighRun: toNumber(entity.home_high_run),
    awayHighRun: toNumber(entity.away_high_run),
    homePlayerName: readString(homePlayer.full_name),
    awayPlayerName: readString(awayPlayer.full_name),
  };
};

/** Mirrors admin computeTeamPointsFromBoardPoints (league points from board points). */
export const computeTeamPointsFromBoardPoints = (boardPoints: number): number => {
  if (boardPoints > 4) return 2;
  if (boardPoints === 4) return 1;
  return 0;
};

/** Mirrors admin formatAvg (3-Cushion biathlon board: caroms stored x4). */
export const formatAvg = (points: number, innings: number, caromBoard = false): string => {
  if (!innings || innings <= 0) return "-";
  const base = caromBoard ? points / 4 : points;
  const avg = base / innings;
  return avg.toFixed(3);
};

const computeMatchTotals = (
  sets: TeamMatchSet[],
): MatchComputed => {
  let homeTotalPoints = 0;
  let awayTotalPoints = 0;
  let homeTotalInnings = 0;
  let awayTotalInnings = 0;
  let homeHighRun = 0;
  let awayHighRun = 0;
  let homeBoardPoints = 0;
  let awayBoardPoints = 0;

  sets.forEach((s) => {
    const hp = s.homePoints ?? 0;
    const ap = s.awayPoints ?? 0;
    homeTotalPoints += hp;
    awayTotalPoints += ap;
    homeTotalInnings += s.homeInnings ?? 0;
    awayTotalInnings += s.awayInnings ?? 0;
    homeHighRun = Math.max(homeHighRun, s.homeHighRun ?? 0);
    awayHighRun = Math.max(awayHighRun, s.awayHighRun ?? 0);

    if (hp === 0 && ap === 0) return;
    if (hp > ap) {
      homeBoardPoints += 2;
      return;
    }
    if (ap > hp) {
      awayBoardPoints += 2;
      return;
    }
    homeBoardPoints += 1;
    awayBoardPoints += 1;
  });

  return {
    homeTotalPoints,
    awayTotalPoints,
    homeTotalInnings,
    awayTotalInnings,
    homeHighRun,
    awayHighRun,
    homeBoardPoints,
    awayBoardPoints,
    homeTeamPoints: computeTeamPointsFromBoardPoints(homeBoardPoints),
    awayTeamPoints: computeTeamPointsFromBoardPoints(awayBoardPoints),
    boardCount: sets.length,
  };
};

const normalizeTeamMatch = (raw: unknown): NormalizedTeamMatch | null => {
  const entity = flatten(raw);
  const homeTeam = flatten(entity.home_team);
  const awayTeam = flatten(entity.away_team);
  const winnerTeam = flatten(entity.winner_team);

  const sets = unwrapRelationArray(entity.sets)
    .map(normalizeTeamMatchSet)
    .filter((s): s is TeamMatchSet => Boolean(s))
    .sort((a, b) => (a.boardIndex ?? 0) - (b.boardIndex ?? 0));

  const computed = computeMatchTotals(sets);

  return {
    id: toNumber(entity.id),
    documentId: readString(entity.documentId),
    stage: readString(entity.stage) || "-",
    groupKey: readString(entity.group_key) || "-",
    round: toNumber(entity.round),
    status: readString(entity.status) || "-",
    matchDate: readString(entity.match_date),
    homeTeamName: readString(homeTeam.name) || "-",
    awayTeamName: readString(awayTeam.name) || "-",
    homeTeamId: toNumber(homeTeam.id),
    awayTeamId: toNumber(awayTeam.id),
    winnerTeamName: readString(winnerTeam.name),
    sets,
    computed,
  };
};

export const fetchTeamMatches = async (
  tournamentDocumentId: string,
): Promise<NormalizedTeamMatch[]> => {
  if (!tournamentDocumentId) return [];
  const params = new URLSearchParams();
  params.set("filters[team_tournament][documentId][$eq]", tournamentDocumentId);
  params.set("populate[home_team][fields][0]", "name");
  params.set("populate[away_team][fields][0]", "name");
  params.set("populate[winner_team][fields][0]", "name");
  params.set("populate[sets][fields][0]", "board_index");
  params.set("populate[sets][fields][1]", "result");
  params.set("populate[sets][fields][2]", "home_points");
  params.set("populate[sets][fields][3]", "away_points");
  params.set("populate[sets][fields][4]", "home_innings");
  params.set("populate[sets][fields][5]", "away_innings");
  params.set("populate[sets][fields][6]", "home_high_run");
  params.set("populate[sets][fields][7]", "away_high_run");
  params.set("populate[sets][populate][home_player][fields][0]", "full_name");
  params.set("populate[sets][populate][away_player][fields][0]", "full_name");
  params.set("fields[0]", "stage");
  params.set("fields[1]", "group_key");
  params.set("fields[2]", "round");
  params.set("fields[3]", "status");
  params.set("fields[4]", "match_date");
  params.set("pagination[pageSize]", "500");
  params.set("sort[0]", "stage:asc");
  params.set("sort[1]", "group_key:asc");
  params.set("sort[2]", "round:asc");
  params.set("sort[3]", "id:asc");
  const json = await fetchPublic(`/api/team-matches?${params.toString()}`);
  return readList(json)
    .map(normalizeTeamMatch)
    .filter((m): m is NormalizedTeamMatch => Boolean(m));
};

// ---------------------------------------------------------------------------
// Standings (mirrors admin + Strapi lifecycle exactly)
// ---------------------------------------------------------------------------

export const computeStandingsByGroup = (
  matches: NormalizedTeamMatch[],
): Record<string, ComputedStandingRow[]> => {
  const byGroup = new Map<string, Map<string, ComputedStandingRow>>();

  const ensure = (
    teamId: number | null,
    teamName: string,
    groupKey: string,
  ): ComputedStandingRow => {
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, new Map());
    const map = byGroup.get(groupKey)!;
    const key = teamId === null ? teamName || "-" : String(teamId);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        teamId,
        teamName: teamName || "-",
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        leaguePoints: 0,
        framesFor: 0,
        framesAgainst: 0,
        frameDiff: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        inningsFor: 0,
        avg: 0,
        highestRun: 0,
      };
      map.set(key, row);
    }
    return row;
  };

  matches.forEach((m) => {
    const groupKey = m.groupKey || "-";
    const home = ensure(m.homeTeamId, m.homeTeamName, groupKey);
    const away = ensure(m.awayTeamId, m.awayTeamName, groupKey);

    // Only completed matches count toward the standings
    if (m.status !== "completed") return;

    const homeFrames = m.computed.homeBoardPoints;
    const awayFrames = m.computed.awayBoardPoints;

    home.matchesPlayed += 1;
    away.matchesPlayed += 1;

    home.framesFor += homeFrames;
    home.framesAgainst += awayFrames;
    away.framesFor += awayFrames;
    away.framesAgainst += homeFrames;

    home.pointsFor += m.computed.homeTotalPoints;
    home.pointsAgainst += m.computed.awayTotalPoints;
    away.pointsFor += m.computed.awayTotalPoints;
    away.pointsAgainst += m.computed.homeTotalPoints;

    home.inningsFor += m.computed.homeTotalInnings;
    away.inningsFor += m.computed.awayTotalInnings;

    home.highestRun = Math.max(home.highestRun, m.computed.homeHighRun);
    away.highestRun = Math.max(away.highestRun, m.computed.awayHighRun);

    // League points (2/1/0) based on board points (frames)
    if (homeFrames === awayFrames) {
      home.draws += 1;
      away.draws += 1;
      home.leaguePoints += 1;
      away.leaguePoints += 1;
    } else if (homeFrames > awayFrames) {
      home.wins += 1;
      away.losses += 1;
      home.leaguePoints += 2;
    } else {
      away.wins += 1;
      home.losses += 1;
      away.leaguePoints += 2;
    }
  });

  const out: Record<string, ComputedStandingRow[]> = {};
  byGroup.forEach((map, groupKey) => {
    const list = Array.from(map.values());
    list.forEach((r) => {
      r.frameDiff = r.framesFor - r.framesAgainst;
      r.avg = r.inningsFor > 0 ? r.pointsFor / r.inningsFor : 0;
    });
    // Tie-break: points, frame diff, average, high run (same as Strapi)
    list.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
      if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;
      if (b.avg !== a.avg) return b.avg - a.avg;
      return b.highestRun - a.highestRun;
    });
    out[groupKey] = list;
  });
  return out;
};

// ---------------------------------------------------------------------------
// Detail bundle
// ---------------------------------------------------------------------------

export const fetchTeamTournamentDetail = async (
  documentId: string,
): Promise<TeamTournamentDetail | null> => {
  if (!documentId) return null;
  const [summary, groups, matches] = await Promise.all([
    fetchTeamTournamentByDocumentId(documentId),
    fetchTeamGroups(documentId),
    fetchTeamMatches(documentId),
  ]);
  if (!summary) return null;
  return {
    summary,
    groups,
    matches,
    standingsByGroup: computeStandingsByGroup(matches),
  };
};
