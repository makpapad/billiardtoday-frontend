/**
 * Στατιστικά ομαδικού τουρνουά — βγαίνουν ΜΟΝΟ από καταχωρημένα αποτελέσματα
 * (ολοκληρωμένοι αγώνες), όπως η σελίδα «Στατιστικά» της εφαρμογής της ΕΟΑΑ.
 *
 * Ομαδικά:  Αγ | Π | ΣΤ | Μ.Ο. | Δ (διαφορά επιμέρους) | Σερί
 * Αθλητές:  Αγώνες | Π | ΣΤ | Μ.Ο. | Best (καλύτερος Μ.Ο. αγώνα) | Ν | ΙΣ | Η | Σερί
 */

import {
  boardPointsOf,
  isForfeitBoard,
  type NormalizedTeamMatch,
} from "@/lib/teamTournaments";
import {
  pickPlayerName,
  playerIdentityKey,
  type NameVariant,
} from "@/lib/playerNameVariant";

export type TeamStatRow = {
  teamName: string;
  groupKey: string;
  played: number;
  caroms: number;
  innings: number;
  avg: number;
  boardFor: number;
  boardAgainst: number;
  boardDiff: number;
  leaguePoints: number;
  highRun: number;
};

export type PlayerStatRow = {
  /** Σταθερό κλειδί ταυτότητας: documentId όταν υπάρχει, αλλιώς το όνομα. */
  key: string;
  /** Αριθμητικό id / documentId για τον σύνδεσμο προφίλ — `null` όταν λείπουν. */
  playerId: number | null;
  documentId: string | null;
  name: string;
  teamName: string;
  groupKey: string;
  games: number;
  caroms: number;
  innings: number;
  avg: number;
  best: number;
  wins: number;
  draws: number;
  losses: number;
  series: number;
};

export type TeamTournamentStats = {
  playedMatches: number;
  scheduledMatches: number;
  teams: TeamStatRow[];
  players: PlayerStatRow[];
};

const isCounted = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

export const buildTeamTournamentStats = (
  matches: NormalizedTeamMatch[],
  /** national → εθνικά ονόματα· international (προεπιλογή) → International Name. */
  nameVariant: NameVariant = "international",
): TeamTournamentStats => {
  const teams = new Map<string, TeamStatRow>();
  const players = new Map<string, PlayerStatRow>();

  const teamRow = (name: string, groupKey: string): TeamStatRow => {
    const key = `${groupKey}|${name}`;
    let row = teams.get(key);
    if (!row) {
      row = {
        teamName: name,
        groupKey,
        played: 0,
        caroms: 0,
        innings: 0,
        avg: 0,
        boardFor: 0,
        boardAgainst: 0,
        boardDiff: 0,
        leaguePoints: 0,
        highRun: 0,
      };
      teams.set(key, row);
    }
    return row;
  };

  const playerRow = (
    identityKey: string,
    identity: { id: number | null; documentId: string | null },
    name: string,
    teamName: string,
    groupKey: string,
  ): PlayerStatRow => {
    const key = `${groupKey}|${teamName}|${identityKey}`;
    let row = players.get(key);
    if (!row) {
      row = {
        key: identityKey,
        playerId: identity.id,
        documentId: identity.documentId,
        name,
        teamName,
        groupKey,
        games: 0,
        caroms: 0,
        innings: 0,
        avg: 0,
        best: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        series: 0,
      };
      players.set(key, row);
    }
    return row;
  };

  let playedMatches = 0;

  matches.forEach((match) => {
    if (!isCounted(match)) return;
    playedMatches += 1;

    const home = teamRow(match.homeTeamName, match.groupKey);
    const away = teamRow(match.awayTeamName, match.groupKey);

    home.played += 1;
    away.played += 1;
    home.caroms += match.computed.homeTotalPoints;
    away.caroms += match.computed.awayTotalPoints;
    home.innings += match.computed.homeTotalInnings;
    away.innings += match.computed.awayTotalInnings;
    home.boardFor += match.computed.homeBoardPoints;
    home.boardAgainst += match.computed.awayBoardPoints;
    away.boardFor += match.computed.awayBoardPoints;
    away.boardAgainst += match.computed.homeBoardPoints;
    home.leaguePoints += match.computed.homeTeamPoints;
    away.leaguePoints += match.computed.awayTeamPoints;
    home.highRun = Math.max(home.highRun, match.computed.homeHighRun);
    away.highRun = Math.max(away.highRun, match.computed.awayHighRun);

    match.sets.forEach((set) => {
      const homePoints = set.homePoints ?? 0;
      const awayPoints = set.awayPoints ?? 0;
      const homeInnings = set.homeInnings ?? 0;
      const awayInnings = set.awayInnings ?? 0;
      if (homePoints === 0 && awayPoints === 0) return;

      const sides = [
        {
          player: set.homePlayer,
          team: match.homeTeamName,
          points: homePoints,
          innings: homeInnings,
          highRun: set.homeHighRun ?? 0,
          won: homePoints > awayPoints,
          draw: homePoints === awayPoints,
        },
        {
          player: set.awayPlayer,
          team: match.awayTeamName,
          points: awayPoints,
          innings: awayInnings,
          highRun: set.awayHighRun ?? 0,
          won: awayPoints > homePoints,
          draw: homePoints === awayPoints,
        },
      ];

      sides.forEach((side) => {
        const name = pickPlayerName(side.player, nameVariant);
        const identityKey = playerIdentityKey(side.player, nameVariant);
        if (!name || !identityKey) return;
        const row = playerRow(
          identityKey,
          { id: side.player?.id ?? null, documentId: side.player?.documentId ?? null },
          name,
          side.team,
          match.groupKey,
        );
        row.games += 1;
        row.caroms += side.points;
        row.innings += side.innings;
        row.series = Math.max(row.series, side.highRun);
        const boardAvg = side.innings > 0 ? side.points / side.innings : 0;
        row.best = Math.max(row.best, boardAvg);
        if (side.draw) row.draws += 1;
        else if (side.won) row.wins += 1;
        else row.losses += 1;
      });
    });
  });

  const teamList = [...teams.values()];
  teamList.forEach((row) => {
    row.avg = row.innings > 0 ? row.caroms / row.innings : 0;
    row.boardDiff = row.boardFor - row.boardAgainst;
  });
  teamList.sort(
    (a, b) =>
      b.leaguePoints - a.leaguePoints ||
      b.boardDiff - a.boardDiff ||
      b.avg - a.avg ||
      a.teamName.localeCompare(b.teamName, "el"),
  );

  const playerList = [...players.values()];
  playerList.forEach((row) => {
    row.avg = row.innings > 0 ? row.caroms / row.innings : 0;
  });
  playerList.sort(
    (a, b) =>
      b.avg - a.avg ||
      b.best - a.best ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name, "el"),
  );

  return {
    playedMatches,
    scheduledMatches: matches.length,
    teams: teamList,
    players: playerList,
  };
};

/* ------------------------------------------------------------------ */
/* «Καλύτεροι της αγωνιστικής» — κάτω από τους αγώνες κάθε γύρου       */
/* ------------------------------------------------------------------ */

export type RoundBestTeam = {
  name: string;
  /** Κλειδί του αγώνα όπου βγήκε το ρεκόρ — για άνοιγμα της γραμμής με κλικ. */
  matchKey: string;
  boardFor: number;
  boardAgainst: number;
  boardDiff: number;
  avg: number;
};

export type RoundBestPlayer = {
  name: string;
  matchKey: string;
  /** Κλειδί ταυτότητας αθλητή (`playerIdentityKey`) — για τονισμό της γραμμής του. */
  playerKey: string;
  playerId: number | null;
  documentId: string | null;
  teamName: string;
  caroms: number;
  innings: number;
  avg: number;
};

export type RoundBestRun = {
  name: string;
  matchKey: string;
  /** Κλειδί ταυτότητας αθλητή (`playerIdentityKey`) — για τονισμό της γραμμής του. */
  playerKey: string;
  playerId: number | null;
  documentId: string | null;
  teamName: string;
  run: number;
};

export type RoundHighlights = {
  bestTeam: RoundBestTeam | null;
  bestPlayer: RoundBestPlayer | null;
  bestRun: RoundBestRun | null;
};

/**
 * Τα τρία «καλύτερα» μιας αγωνιστικής, από τους ολοκληρωμένους αγώνες της:
 *  - **καλύτερη ομάδα**: ο μεγαλύτερος Μ.Ο. της αγωνιστικής (ισοπαλία → μεγαλύτερη διαφορά επιμέρους),
 *  - **καλύτερος παίκτης**: ο μεγαλύτερος Μ.Ο. (πόντοι ÷ στεκιές) της αγωνιστικής,
 *  - **καλύτερο H.R.**: η μεγαλύτερη στεκιά (high run) της αγωνιστικής.
 * Άνευ αγώνα boards (2-0 χωρίς νούμερα) δεν μετράνε σε Μ.Ο./H.R.
 */
export const buildRoundHighlights = (
  matches: NormalizedTeamMatch[],
  /** national → εθνικά ονόματα· international (προεπιλογή) → International Name. */
  nameVariant: NameVariant = "international",
  /** Ίδιος υπολογισμός Μ.Ο. με τη βαθμολογία (`computeStandingsByGroup`). */
  opts?: { biathlon?: boolean },
): RoundHighlights => {
  type TeamAgg = {
    name: string;
    boardFor: number;
    boardAgainst: number;
    /** Σύνολο πόνων των boards (ό,τι δίνει τη βαθμολογία). */
    points: number;
    /** Πόντοι καραμπόλας (biathlon: το board 2, x4) — για ίδιο Μ.Ο. με τη βαθμολογία. */
    caroms: number;
    innings: number;
    matchKey: string;
  };
  type PlayerAgg = {
    name: string;
    matchKey: string;
    playerKey: string;
    playerId: number | null;
    documentId: string | null;
    teamName: string;
    caroms: number;
    innings: number;
  };

  const teamAgg = new Map<string, TeamAgg>();
  const playerAgg = new Map<string, PlayerAgg>();
  let bestRun: RoundBestRun | null = null;

  const teamRow = (name: string, matchKey: string): TeamAgg => {
    let row = teamAgg.get(name);
    if (!row) {
      row = { name, boardFor: 0, boardAgainst: 0, points: 0, caroms: 0, innings: 0, matchKey };
      teamAgg.set(name, row);
    }
    return row;
  };

  for (const match of matches) {
    if (!isCounted(match)) continue;
    const matchKey = match.documentId || String(match.id ?? "");
    const home = teamRow(match.homeTeamName, matchKey);
    const away = teamRow(match.awayTeamName, matchKey);
    home.points += match.computed.homeTotalPoints;
    home.caroms += match.computed.homeCaromPoints;
    home.innings += match.computed.homeTotalInnings;
    away.points += match.computed.awayTotalPoints;
    away.caroms += match.computed.awayCaromPoints;
    away.innings += match.computed.awayTotalInnings;

    for (const set of match.sets) {
      if (isForfeitBoard(set)) continue;
      const bp = boardPointsOf(set);
      home.boardFor += bp.home;
      home.boardAgainst += bp.away;
      away.boardFor += bp.away;
      away.boardAgainst += bp.home;

      const sides = [
        {
          player: set.homePlayer,
          teamName: match.homeTeamName,
          points: set.homePoints ?? 0,
          innings: set.homeInnings ?? 0,
          highRun: set.homeHighRun ?? 0,
        },
        {
          player: set.awayPlayer,
          teamName: match.awayTeamName,
          points: set.awayPoints ?? 0,
          innings: set.awayInnings ?? 0,
          highRun: set.awayHighRun ?? 0,
        },
      ];

      for (const side of sides) {
        if (side.innings > 0 && side.points > 0) {
          const key = playerIdentityKey(side.player, nameVariant) || `${side.teamName}|${pickPlayerName(side.player, nameVariant)}`;
          const name = pickPlayerName(side.player, nameVariant);
          if (name) {
            let row = playerAgg.get(key);
            if (!row) {
              row = {
                name,
                matchKey,
                playerKey: key,
                playerId: side.player?.id ?? null,
                documentId: side.player?.documentId ?? null,
                teamName: side.teamName,
                caroms: 0,
                innings: 0,
              };
              playerAgg.set(key, row);
            }
            row.caroms += side.points;
            row.innings += side.innings;
          }
        }
        if (side.highRun > 0) {
          const name = pickPlayerName(side.player, nameVariant);
          if (name && (!bestRun || side.highRun > bestRun.run)) {
            bestRun = {
              name,
              matchKey,
              playerKey: playerIdentityKey(side.player, nameVariant),
              playerId: side.player?.id ?? null,
              documentId: side.player?.documentId ?? null,
              teamName: side.teamName,
              run: side.highRun,
            };
          }
        }
      }
    }
  }

  const biathlon = Boolean(opts?.biathlon);
  let bestTeam: RoundBestTeam | null = null;
  for (const row of teamAgg.values()) {
    // Ίδιος τύπος με τη βαθμολογία: 3C → πόντοι/στεκιές· biathlon → (πόντοι καραμπόλας/4)/στεκιές.
    const avg =
      row.innings > 0 ? (biathlon ? row.caroms / 4 / row.innings : row.points / row.innings) : 0;
    if (avg <= 0) continue;
    const candidate: RoundBestTeam = {
      name: row.name,
      matchKey: row.matchKey,
      boardFor: row.boardFor,
      boardAgainst: row.boardAgainst,
      boardDiff: row.boardFor - row.boardAgainst,
      avg,
    };
    // Κριτήριο: ο μεγαλύτερος Μ.Ο. της αγωνιστικής — ισοπαλία κρίνει η διαφορά επιμέρους.
    if (
      !bestTeam ||
      candidate.avg > bestTeam.avg ||
      (candidate.avg === bestTeam.avg && candidate.boardDiff > bestTeam.boardDiff)
    ) {
      bestTeam = candidate;
    }
  }

  let bestPlayer: RoundBestPlayer | null = null;
  for (const row of playerAgg.values()) {
    const avg = row.innings > 0 ? row.caroms / row.innings : 0;
    if (avg <= 0) continue;
    const candidate: RoundBestPlayer = { ...row, avg };
    if (
      !bestPlayer ||
      candidate.avg > bestPlayer.avg ||
      (candidate.avg === bestPlayer.avg && candidate.caroms > bestPlayer.caroms)
    ) {
      bestPlayer = candidate;
    }
  }

  return { bestTeam, bestPlayer, bestRun };
};
