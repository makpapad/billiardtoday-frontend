/**
 * Ετικέτες της ομαδικής σελίδας διοργάνωσης (`/tournaments/team/[slug]`) σε EL/EN.
 *
 * Γιατί δικό του λεξικό και όχι το `src/lib/i18n.ts`: εκείνο είναι το αγγλικό λεξικό του
 * site (μία γλώσσα, `t(key)`), ενώ εδώ η γλώσσα αλλάζει **ανά διοργάνωση** —
 * `TeamTournamentSummary.labelLocale`, που βγαίνει από το `config.labelLocale` ή από τη
 * χώρα της ομοσπονδίας (GR → ελληνικά, οτιδήποτε άλλο → αγγλικά). Έτσι το ολλανδικό,
 * πορτογαλικό ή ισπανικό ομαδικό πρωτάθλημα δεν δείχνει ελληνικές κεφαλίδες, ενώ οι
 * ελληνικές διοργανώσεις μένουν λέξη-προς-λέξη όπως ήταν.
 *
 * Κανόνες (προτιμήσεις χρήστη): σύντομες κεφαλίδες στήλης (P/W/D/L/Pts/BP/HR/Inn/Avg) με
 * tooltip για τη διευκρίνιση· στα αγγλικά «match» = ο αγώνας των ομάδων και
 * «game»/«board» = ο επιμέρους αγώνας αθλητών (ποτέ «frame»).
 */

export type LabelLocale = "el" | "en";

export const LABEL_LOCALES: LabelLocale[] = ["el", "en"];

const el = {
  /** Locale για `toLocaleDateString` (ονόματα μηνών/ημερών). */
  dateLocale: "el-GR",

  // --- Καταστάσεις αγώνα ---------------------------------------------------
  statusCompleted: "Ολοκληρωμένη",
  statusScheduled: "Προγραμματισμένη",

  // --- Κεφαλίδες στηλών (συντομογραφίες) -----------------------------------
  colTeam: "ΟΜΑΔΑ",
  colPlayer: "ΑΘΛΗΤΗΣ",
  colName: "ΟΝΟΜΑ",
  colPoints: "ΠΟΝΤΟΙ",
  colPlayedShort: "Α",
  colWinsShort: "Ν",
  colDrawsShort: "Ι",
  colDraws: "ΙΣ",
  colLossesShort: "Η",
  colBoardsShort: "Επιμ.",
  colDiffShort: "Διαφ.",
  colDiff: "Δ",
  colAvgShort: "Μ.Ο.",
  colPtsShort: "Βαθ.",
  colPointsShort: "Π",
  colInningsShort: "ΣΤ",
  colRunShort: "ΣΕΡΙ",
  colGamesShort: "Αγ",
  colGames: "ΑΓΩΝΕΣ",
  colBest: "Best",

  // --- Tooltips κεφαλίδων --------------------------------------------------
  tipMatches: "Αγώνες",
  tipMatchesPlayed: "Αγώνες που έπαιξε",
  tipPoints: "Πόντοι",
  tipPointsCaroms: "Πόντοι (καραμπόλες)",
  tipInnings: "Στεκιές",
  tipRun: "Σέρι — η μεγαλύτερη σειρά πόντων",
  tipBoards: "Επιμέρους πόντοι αγώνων",
  tipAvg: "Μέσος όρος",
  tipAvgFormula: "Μέσος όρος: Π ÷ ΣΤ",
  tipBest: "Καλύτερος μέσος όρος αγώνα",
  tipWins: "Νίκες",
  tipDraws: "Ισοπαλίες",
  tipLosses: "Ήττες",
  tipTeamPts: "Βαθμοί ομάδας",
  tipPts: "Βαθμοί",
  tipDiff: "Διαφορά αγώνων",
  tipDiffBoards: "Διαφορά επιμέρους: ΕΠ+ − ΕΠ−",

  // --- Σημάδια αθλητή/ομάδας στη γραμμή & στα «καλύτερα» της αγωνιστικής ---
  markBestPlayer: "ΚΑΛΥΤΕΡΟΣ ΠΑΙΚΤΗΣ",
  markBestAvg: "ΚΑΛΥΤΕΡΟΣ Μ.Ο.",
  markRun: (run: number) => `ΣΕΡΙ ${run}`,
  bestTeamLabel: "ΟΜΑΔΑ ΜΕ ΤΟΝ ΚΑΛΥΤΕΡΟ Μ.Ο.",
  bestTeamTip:
    "Η ομάδα με τον μεγαλύτερο μέσο όρο στην αγωνιστική — κλικ για τον αγώνα της",
  bestPlayerLabel: "ΚΑΛΥΤΕΡΟΣ ΠΑΙΚΤΗΣ",
  bestPlayerTip:
    "Ο μεγαλύτερος μέσος όρος (πόντοι ÷ στεκιές) της αγωνιστικής — κλικ για τον αγώνα του",
  bestRunLabel: "ΚΑΛΥΤΕΡΟ ΣΕΡΙ",
  bestRunTip:
    "Το μεγαλύτερο σέρι (σειρά πόντων) της αγωνιστικής — κλικ για τον αγώνα",

  // --- Αγωνιστικές / όμιλοι ------------------------------------------------
  groupName: (key: string) => `Όμιλος ${key}`,
  /** Στα pills των στατιστικών: μόνο το πρόθεμα `GROUP-` γίνεται «Όμιλος » (όπως πριν). */
  groupPillLabel: (key: string) => key.replace(/^GROUP-?/i, "Όμιλος "),
  roundName: (round: number) => `Αγωνιστική ${round}`,
  roundsLabel: "ΑΓΩΝΙΣΤΙΚΕΣ",
  roundTipPlayed: (round: number, played: number, total: number) =>
    `Αγωνιστική ${round} — έχει παιχτεί (${played}/${total} αγώνες)`,
  roundTipNotPlayed: (round: number) => `Αγωνιστική ${round} — δεν έχει παιχτεί ακόμη`,
  notPlayedBadge: "ΔΕΝ ΕΧΕΙ ΠΑΙΧΤΕΙ",
  matchNoun: (count: number): string => (count === 1 ? "αγώνας" : "αγώνες"),
  matchProgress: (played: number, total: number) => `${played}/${total} αγώνες`,
  groupCountSuffix: (count: number) => `· ${count} όμιλοι`,
  allGroups: "Όλοι οι όμιλοι",
  finalRound: "Final Round",

  // --- Βαθμολογία ----------------------------------------------------------
  standingsTitle: "Βαθμολογία ομίλου",
  qualifyingNote: (spots: number) => `Οι ${spots} πρώτοι προκρίνονται στην τελική φάση.`,
  qualifiesTip: (position: number, spots: number) =>
    `Περνά στην τελική φάση (θέση ${position} από ${spots})`,
  teamStatsTip: (team: string) => `Στατιστικά αθλητών: ${team}`,
  openTeamPlayers: "Άνοιγμα των αθλητών της ομάδας",
  noResultsYet: "Δεν υπάρχουν ακόμη αποτελέσματα. Οι αγώνες εμφανίζονται μόλις καταχωρηθούν.",

  // --- Πρόγραμμα (Time Table) ---------------------------------------------
  scheduleTitle: "Πρόγραμμα",
  scheduleSummary: (rounds: number, played: number, total: number) =>
    `${rounds} αγωνιστικές · ${played} από ${total} ζευγάρια έχουν παιχτεί`,
  scheduleEmpty: "Το πρόγραμμα θα εμφανιστεί μόλις δημοσιευτούν οι αγώνες.",
  dateMissing: "Ημερομηνία: —",
  nextBadge: "Επόμενη",

  // --- Στατιστικά ----------------------------------------------------------
  statisticsTitle: "Στατιστικά",
  /** Το `Από 4 καταχωρημένες συναντήσεις (56 στο πρόγραμμα)` — το νούμερο μένει bold. */
  statisticsRecordsPrefix: "Από",
  statisticsRecordsSuffix: (scheduled: number) =>
    ` καταχωρημένες συναντήσεις (${scheduled} στο πρόγραμμα)`,
  statisticsLive: "Όλα βγαίνουν ζωντανά από τους αγώνες.",
  statsEmpty:
    "Δεν υπάρχει καταχωρημένο αποτέλεσμα ακόμη — τα στατιστικά εμφανίζονται μόλις μπει ο πρώτος αγώνας.",
  playersSection: "Αθλητές",
  teamsSection: "Ομαδικά",

  // --- Modals αθλητών ------------------------------------------------------
  close: "Κλείσιμο",
  playersModalLabel: (team: string) => `Αθλητές ${team}`,
  playersSummary: (stats: {
    players: number;
    matches: number;
    caroms: number;
    avg: string;
    points: number;
  }) =>
    `${stats.players} ${stats.players === 1 ? "αθλητής" : "αθλητές"} · ${stats.matches} ${
      stats.matches === 1 ? "αγώνας" : "αγώνες"
    } · ${stats.caroms} πόντοι · ${stats.avg} Μ.Ο. · ${stats.points} βαθμοί`,
  playersModalFooter:
    "Κατάταξη με Μ.Ο. αγώνα (μετά νίκες, μεγαλύτερο σέρι). Άνοιγμα προφίλ με κλικ στο όνομα.",
  rosterSummary: (count: number) =>
    `${count} ${count === 1 ? "αθλητής" : "αθλητές"} στη δήλωση της ομάδας`,
  rosterEmpty: "Δεν υπάρχει δηλωμένο ρόστερ για αυτή την ομάδα.",
  colRole: "Ρόλος",
  tipRole: "Ρόλος στη δήλωση: αρχηγός, αναπληρωματικός ή αθλητής",
  roleCaptain: "Αρχηγός",
  roleSubstitute: "Αναπλ.",
  rolePlayer: "Αθλητής",
  rosterFooter:
    "Όσοι δηλώθηκαν στην ομάδα — ανεξάρτητα από το αν έχουν παίξει αγώνα. Άνοιγμα προφίλ με κλικ στο όνομα.",

  // --- Σελίδα διοργάνωσης --------------------------------------------------
  teamBadge: "ΟΜΑΔΙΚΟ",
};

export type TeamTournamentLabels = typeof el;

const en: TeamTournamentLabels = {
  dateLocale: "en-GB",

  statusCompleted: "Completed",
  statusScheduled: "Scheduled",

  colTeam: "TEAM",
  colPlayer: "PLAYER",
  colName: "NAME",
  colPoints: "POINTS",
  colPlayedShort: "P",
  colWinsShort: "W",
  colDrawsShort: "D",
  colDraws: "D",
  colLossesShort: "L",
  colBoardsShort: "BP",
  colDiffShort: "Diff",
  colDiff: "Diff",
  colAvgShort: "Avg",
  colPtsShort: "Pts",
  colPointsShort: "P",
  colInningsShort: "Inn",
  colRunShort: "HR",
  colGamesShort: "P",
  colGames: "MATCHES",
  colBest: "Best",

  tipMatches: "Matches",
  tipMatchesPlayed: "Matches played",
  tipPoints: "Points",
  tipPointsCaroms: "Points (caroms)",
  tipInnings: "Innings",
  tipRun: "High run — the longest run of points",
  tipBoards: "Points won on the individual games",
  tipAvg: "Average",
  tipAvgFormula: "Average: points ÷ innings",
  tipBest: "Best average in a single game",
  tipWins: "Wins",
  tipDraws: "Draws",
  tipLosses: "Losses",
  tipTeamPts: "Team points",
  tipPts: "Points",
  tipDiff: "Difference between games won and lost",
  tipDiffBoards: "Board points difference: BP+ − BP−",

  markBestPlayer: "BEST PLAYER",
  markBestAvg: "BEST AVG",
  markRun: (run: number) => `RUN ${run}`,
  bestTeamLabel: "TEAM WITH THE BEST AVG",
  bestTeamTip: "The team with the highest average in this round — click for its match",
  bestPlayerLabel: "BEST PLAYER",
  bestPlayerTip:
    "The highest average (points ÷ innings) in this round — click for the match",
  bestRunLabel: "BEST RUN",
  bestRunTip: "The longest run of points in this round — click for the match",

  groupName: (key: string) => `Group ${key}`,
  groupPillLabel: (key: string) => key.replace(/^GROUP-?/i, "Group "),
  roundName: (round: number) => `Round ${round}`,
  roundsLabel: "ROUNDS",
  roundTipPlayed: (round: number, played: number, total: number) =>
    `Round ${round} — played (${played}/${total} matches)`,
  roundTipNotPlayed: (round: number) => `Round ${round} — not played yet`,
  notPlayedBadge: "NOT PLAYED",
  matchNoun: (count: number) => (count === 1 ? "match" : "matches"),
  matchProgress: (played: number, total: number) => `${played}/${total} matches`,
  groupCountSuffix: (count: number) => `· ${count} groups`,
  allGroups: "All groups",
  finalRound: "Final Round",

  standingsTitle: "Group standings",
  qualifyingNote: (spots: number) => `Top ${spots} advance to the Final Round.`,
  qualifiesTip: (position: number, spots: number) =>
    `Advances to the Final Round (position ${position} of ${spots})`,
  teamStatsTip: (team: string) => `Player stats: ${team}`,
  openTeamPlayers: "Open the team's players",
  noResultsYet: "No results yet. Matches appear as soon as they are recorded.",

  scheduleTitle: "Schedule",
  scheduleSummary: (rounds: number, played: number, total: number) =>
    `${rounds} rounds · ${played} of ${total} matches played`,
  scheduleEmpty: "The schedule will appear once the matches are published.",
  dateMissing: "Date: —",
  nextBadge: "Next",

  statisticsTitle: "Statistics",
  statisticsRecordsPrefix: "From",
  statisticsRecordsSuffix: (scheduled: number) => ` recorded matches (${scheduled} scheduled)`,
  statisticsLive: "Everything is calculated live from the matches.",
  statsEmpty:
    "No recorded result yet — statistics appear as soon as the first match is entered.",
  playersSection: "Players",
  teamsSection: "Teams",

  close: "Close",
  playersModalLabel: (team: string) => `Players ${team}`,
  playersSummary: (stats: {
    players: number;
    matches: number;
    caroms: number;
    avg: string;
    points: number;
  }) =>
    `${stats.players} ${stats.players === 1 ? "player" : "players"} · ${stats.matches} ${
      stats.matches === 1 ? "match" : "matches"
    } · ${stats.caroms} points · ${stats.avg} avg · ${stats.points} pts`,
  playersModalFooter:
    "Ranked by match average (then wins, longest run). Click a name to open the profile.",
  rosterSummary: (count: number) =>
    `${count} ${count === 1 ? "player" : "players"} in the team roster`,
  rosterEmpty: "No declared roster for this team.",
  colRole: "Role",
  tipRole: "Roster role: captain, substitute or player",
  roleCaptain: "Captain",
  roleSubstitute: "Res.",
  rolePlayer: "Player",
  rosterFooter:
    "Everyone declared for the team — whether or not they have played. Click a name to open the profile.",

  teamBadge: "TEAM",
};

const DICTIONARIES: Record<LabelLocale, TeamTournamentLabels> = { el, en };

/**
 * Το λεξικό της διοργάνωσης. Προεπιλογή τα ελληνικά, ώστε όποιος καλέσει το component
 * χωρίς `labelLocale` να πάρει το ίδιο κείμενο που έβγαζε πάντα η σελίδα.
 */
export const teamTournamentLabels = (locale?: LabelLocale | null): TeamTournamentLabels =>
  DICTIONARIES[locale === "en" ? "en" : "el"];
