/**
 * Στατιστικά ομαδικού τουρνουά — βγαίνουν ΜΟΝΟ από καταχωρημένα αποτελέσματα
 * (ολοκληρωμένοι αγώνες), όπως η σελίδα «Στατιστικά» της εφαρμογής της ΕΟΑΑ.
 *
 * Ομαδικά:  Αγ | Π | ΣΤ | Μ.Ο. | Δ (διαφορά επιμέρους) | Σερί
 * Αθλητές:  Αγώνες | Π | ΣΤ | Μ.Ο. | Best (καλύτερος Μ.Ο. αγώνα) | Ν | ΙΣ | Η | Σερί
 */

import type { NormalizedTeamMatch } from "@/lib/teamTournaments";
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
