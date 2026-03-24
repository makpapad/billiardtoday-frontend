export const t = (key: string): string => {
  try {
    const dictionary: Record<string, string> = {
        // Player profile page
        'players.profile.logoAlt': 'BilliardToday logo',
        'players.profile.back': 'Back',
        'players.profile.loading': 'Loading player profile...',
        'players.profile.error.generic': 'Failed to load player',
        'players.profile.error.notFound': 'Player not found',

        // Stats header
        'players.profile.stats.title.overall': 'Overall Stats - ({gameType})',
        'players.profile.stats.title.year': 'Year {year} Stats - ({gameType})',

        // Stats cards
        'players.profile.stats.events': 'Events',
        'players.profile.stats.matches': 'Matches',
        'players.profile.stats.wins': 'Wins',
        'players.profile.stats.draws': 'Draws',
        'players.profile.stats.losses': 'Losses',
        'players.profile.stats.winPct': 'Win %',
        'players.profile.stats.avg': 'AVG',
        'players.profile.stats.bestAvgWinsShort': 'B.AVG (W)',
        'players.profile.stats.highRunShort': 'H.R.',

        // History section
        'players.profile.history.title': 'Tournament History',
        'players.profile.history.filter.gameType.all': 'All games',
        'players.profile.history.filter.year.all': 'All seasons',
        'players.profile.history.loading': 'Loading tournament history...',
        'players.profile.history.empty': 'No tournament participations yet.',

        // H2H filters & labels
        'players.profile.h2h.searchPlaceholder': 'Head-to-Head: Search Opponent',
        'players.profile.h2h.moreResults': 'Showing first 20 results… refine your search',
        'players.profile.h2h.title': 'Head-to-Head vs',
        'players.profile.h2h.title.yearAll': 'All years',
        'players.profile.h2h.title.yearSpecific': 'Year {year}',
        'players.profile.h2h.matches': 'Matches',
        'players.profile.h2h.wins': 'Wins',
        'players.profile.h2h.losses': 'Losses',
        'players.profile.h2h.winPct': 'Win %',
        'players.profile.h2h.avg': 'AVG',
        'players.profile.h2h.highRunShort': 'H.R.',
        'players.profile.h2h.listTitle': 'Head-to-Head Matches',
        'players.profile.h2h.vsOpponent': 'vs {opponent}',
        'players.profile.h2h.innings': 'Innings: {innings}',
        'players.profile.h2h.avgValue': 'AVG: {avg}',
        'players.profile.h2h.highRun': 'H.R.: {value}',
        'players.profile.h2h.viewDetails': 'View details',

        // Tournament history lists
        'players.profile.history.tournament.detailsTitle': 'Detailed Results ({count} matches)',
        'players.profile.history.tournament.positionLabel': 'Final Position',

        // Reuse stats labels for per-tournament stats
        'players.profile.history.tournament.matches': 'Matches',
        'players.profile.history.tournament.wins': 'Wins',
        'players.profile.history.tournament.losses': 'Losses',
        'players.profile.history.tournament.avg': 'AVG',
        'players.profile.history.tournament.highRunShort': 'H.R.',

        // Pagination buttons
        'players.profile.loadMoreYears': 'Load previous seasons',
        'players.profile.loadMoreTournaments': 'Load more tournaments ({year})',
        // Backwards-compatible keys (in case other pages use them)
        'players.profile.pagination.loadMoreYears': 'Load previous seasons',
        'players.profile.pagination.loadMoreTournaments': 'Load more tournaments ({year})',

        // Performance chart
        'players.profile.performance.title': 'Performance Over Time',
        'players.profile.performance.avgPerInning': 'Average per Inning',
        'players.profile.performance.winPct': 'Win %',
        'players.profile.performance.wins': 'Wins',
        'players.profile.performance.yearLabel': 'Year:',

        // Footer note
        'players.profile.note.data': 'Tournament data are updated automatically from the central database.',

        // Modal
        'players.profile.modal.badge.win': 'WIN',
        'players.profile.modal.badge.draw': 'DRAW',
        'players.profile.modal.badge.loss': 'LOSS',
        'players.profile.modal.stageLabel': 'Stage',
        'players.profile.modal.inningsLabel': 'Innings',
        'players.profile.modal.avgLabel': 'AVG',
        'players.profile.modal.close': 'Close',

        // Remote scoreboard home
        'remote.home.eyebrow': 'Remote Scoreboard',
        'remote.home.title': 'Χειριστήριο scoreboard',
        'remote.home.description': 'Σύνδεσε ένα screen ID και επίλεξε το παιχνίδι που έχει σταλεί από το admin για να το χειριστείς από κινητό.',
        'remote.home.screenIdLabel': 'Screen ID',
        'remote.home.screenIdPlaceholder': 'Πληκτρολόγησε το screen ID',
        'remote.home.connectButton': 'Σύνδεση',
        'remote.home.connectedScreen': 'Συνδεδεμένη οθόνη',
        'remote.home.noScreenSelected': 'Δεν έχει επιλεγεί οθόνη',
        'remote.home.availableMatchesLabel': 'Διαθέσιμα παιχνίδια',
        'remote.home.liveMatchesLabel': 'Live παιχνίδια',
        'remote.home.loading': 'Φόρτωση παιχνιδιών...',
        'remote.home.emptyState': 'Δεν βρέθηκαν pending ή live παιχνίδια για αυτή την οθόνη.',
        'remote.home.errors.loadSessions': 'Αποτυχία φόρτωσης των παιχνιδιών της οθόνης.',
        'remote.home.status.inProgress': 'Live',
        'remote.home.status.pending': 'Pending',
        'remote.home.matchCard.fallbackTitle': 'Παιχνίδι',
        'remote.home.matchCard.fallbackStage': 'Στάδιο',
        'remote.home.matchCard.fallbackPlayer1': 'Παίκτης 1',
        'remote.home.matchCard.fallbackPlayer2': 'Παίκτης 2',
        'remote.home.matchCard.fallbackTable': 'Τραπέζι',
        'remote.home.matchCard.fallbackMatchNo': 'Αριθμός',
        'remote.home.matchCard.fallbackGroup': 'Group',
        'remote.home.matchCard.stageLabel': 'Στάδιο',
        'remote.home.matchCard.tableLabel': 'Τραπέζι',
        'remote.home.matchCard.matchNoLabel': 'Match No',
        'remote.home.matchCard.groupLabel': 'Group',
        'remote.home.matchCard.targetPointsLabel': 'Πόντοι στόχος',
        'remote.home.matchCard.maxInningsLabel': 'Μέγιστα innings',

        // Remote scoreboard control
        'remote.control.eyebrow': 'Remote Control',
        'remote.control.title': 'Χειρισμός αγώνα',
        'remote.control.backButton': 'Πίσω',
        'remote.control.screenIdLabel': 'Screen ID',
        'remote.control.sessionIdLabel': 'Session ID',
        'remote.control.noScreenId': 'Χωρίς screen ID',
        'remote.control.noSessionId': 'Χωρίς session ID',
        'remote.control.lastCommandPrefix': 'Εστάλη εντολή:',
        'remote.control.errors.missingParams': 'Λείπει screen ID ή session ID για να σταλεί εντολή.',
        'remote.control.errors.commandFailed': 'Αποτυχία αποστολής εντολής στο scoreboard.',
        'remote.control.sections.setup.title': 'Προετοιμασία',
        'remote.control.sections.scoring.title': 'Σκορ',
        'remote.control.sections.timer.title': 'Χρονόμετρα',
        'remote.control.sections.corrections.title': 'Διορθώσεις',
        'remote.control.actions.startMatch': 'Start Match',
        'remote.control.actions.swapPlayers': 'Swap Players',
        'remote.control.actions.warmupBreak': 'Warmup / Break',
        'remote.control.actions.resetGame': 'Reset Game',
        'remote.control.actions.runDec': 'Live Run -',
        'remote.control.actions.confirmTurn': 'Confirm / End Turn',
        'remote.control.actions.runInc': 'Live Run +',
        'remote.control.actions.toggleTimer': 'Start / Pause Timer',
        'remote.control.actions.resetShotClock': 'Reset Shot Clock',
        'remote.control.actions.undo': 'Undo',
        'remote.control.actions.undoTimeout': 'Undo Timeout',
    }

    return dictionary[key] ?? key
  } catch (error) {
    console.error('Translation error:', error, 'for key:', key);
    return key; // Fallback to key itself
  }
}
