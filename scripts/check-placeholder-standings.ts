/**
 * Scratch fixture (προσωρινό): θέση αναμονής («eoaa-slot:…») δεν βγάζει γραμμή
 * στην κατάταξη ομίλου, οι δύο πραγματικοί αθλητές βγαίνουν κανονικά.
 * Τρέχει με: npx tsx scripts/check-placeholder-standings.ts
 */
import { buildGroupStandings, normalizeGroup } from "../src/app/tournaments/events/utils";
import type {
  NormalizedGroupPlayer,
  StageMatchGroup,
} from "../src/app/tournaments/events/types";

const PLACEHOLDER_KEY = "eoaa-slot:round-1:13";
const PLACEHOLDER_LABEL = "Πρόκριση PPPPQ · θέση 13";

const realPlayer = (documentId: string, name: string, country: string) => ({
  documentId,
  id: null,
  full_name: name,
  full_name_en: name,
  country,
});

// Ωμά ωμά rows όπως τα δίνει το Strapi (bt-groups) — η θέση αναμονής έχει κενή
// σχέση player1/player2 και local_key με πρόθεμα `eoaa-slot:`.
const rawRows = [
  {
    documentId: "m1",
    number: 1,
    player1: realPlayer("doc-a", "ΠΑΠΑΔΟΠΟΥΛΟΣ Αλέξανδρος", "GR"),
    player2: realPlayer("doc-b", "ΚΑΡΑΓΙΑΝΝΗΣ Βασίλης", "GR"),
    player1_points: 40,
    player2_points: 25,
    player1_innings: 4,
    player2_innings: 4,
    player1_match_points: 2,
    player2_match_points: 0,
  },
  {
    documentId: "m2",
    number: 1,
    player1: realPlayer("doc-a", "ΠΑΠΑΔΟΠΟΥΛΟΣ Αλέξανδρος", "GR"),
    player2: null,
    player2_local_key: PLACEHOLDER_KEY,
    player2_local_name: PLACEHOLDER_LABEL,
    player1_points: 40,
    player2_points: 0,
    player1_innings: 3,
    player2_innings: 0,
    player1_match_points: 2,
    player2_match_points: 0,
  },
  {
    documentId: "m3",
    number: 1,
    player1: realPlayer("doc-b", "ΚΑΡΑΓΙΑΝΝΗΣ Βασίλης", "GR"),
    player2: null,
    player2_local_key: PLACEHOLDER_KEY,
    player2_local_name: PLACEHOLDER_LABEL,
    player1_points: 40,
    player2_points: 0,
    player1_innings: 3,
    player2_innings: 0,
    player1_match_points: 2,
    player2_match_points: 0,
  },
];

const matches: StageMatchGroup["matches"] = rawRows.map((row, index) => {
  const normalized = normalizeGroup(row, `match-${index + 1}`);
  const entry = (
    player: NormalizedGroupPlayer,
    points: number | null,
    matchPoints: number | null,
  ): { player: NormalizedGroupPlayer; outcome: "W" | "L" | null } => ({
    player: { ...player, points, matchPoints },
    outcome: matchPoints === 2 ? "W" : matchPoints === 0 ? "L" : null,
  });
  return {
    key: normalized.id,
    matchDocumentId: normalized.documentId,
    matchNumber: normalized.matchNumber,
    round: normalized.round,
    dateTime: normalized.dateTime,
    top: entry(
      normalized.player1,
      row.player1_points ?? null,
      row.player1_match_points ?? null,
    ),
    bottom: entry(
      normalized.player2,
      row.player2_points ?? null,
      row.player2_match_points ?? null,
    ),
  };
});

const sides = matches.flatMap((match) => [match.top.player, match.bottom.player]);
console.log("--- normalized sides ---");
sides.forEach((side) => {
  console.log(
    `name=${JSON.stringify(side.name)} documentId=${JSON.stringify(side.documentId)} placeholder=${String(side.placeholder)}`,
  );
});

const standings = buildGroupStandings(matches);
console.log("--- buildGroupStandings rows ---");
console.log(`rows=${standings.length}`);
standings.forEach((row) => {
  console.log(
    `place=${row.place} name=${JSON.stringify(row.playerName)} key=${JSON.stringify(row.key)} MP=${row.totalMatchPoints} PTS=${row.totalPoints} record=${row.record.wins}-${row.record.draws}-${row.record.losses}`,
  );
});

const placeholderRows = standings.filter(
  (row) => row.key === PLACEHOLDER_KEY || row.playerName === PLACEHOLDER_LABEL,
);
console.log(
  `placeholderRows=${placeholderRows.length} placeholderFlagOnSide=${String(
    sides.some((side) => side.placeholder === true),
  )}`,
);
