"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Locale = "el" | "en";

const dictionaries: Record<Locale, Record<string, string>> = {
  el: {
    "nav.features": "Χαρακτηριστικά",
    "nav.howItWorks": "Πώς Λειτουργεί",
    "nav.forYou": "Για Εσάς",
    "nav.login": "Σύνδεση",

    "hero.livePlatform": "Live Πλατφόρμα Τουρνουά",
    "hero.title": "Διοργάνωσε & Παρακολούθησε",
    "hero.subtitle": "Τουρνουά Μπιλιάρδου",
    "hero.description": "Η ολοκληρωμένη πλατφόρμα για λέσχες, διοργανωτές και παίκτες. Δημιούργησε επαγγελματικά τουρνουά, παρακολούθησε live scores, κατατάξεις και αποτελέσματα σε πραγματικό χρόνο.",
    "hero.createTournament": "Δημιούργησε Τουρνουά",
    "hero.viewTournaments": "Δες Τουρνουά",
    "hero.live": "Live",
    "hero.backgroundAlt": "Τραπέζι μπιλιάρδου",
    "hero.activeTournaments": "Ενεργά Τουρνουά",
    "hero.registeredPlayers": "Εγγεγραμμένοι Παίκτες",
    "hero.completedMatches": "Ολοκληρωμένοι Αγώνες",

    "stats.activeTournaments": "Ενεργά Τουρνουά",
    "stats.players": "Παίκτες",
    "stats.registeredMatches": "Καταγεγραμμένοι Αγώνες",

    "features.badge": "Χαρακτηριστικά",
    "features.title": "Όλα Όσα Χρειάζεσαι για Επαγγελματικά Τουρνουά",
    "features.description": "Ολοκληρωμένη λύση με όλα τα εργαλεία που χρειάζεσαι για να οργανώσεις, να διεξάγεις και να παρακολουθείς τουρνουά μπιλιάρδου.",
    "features.tournament.title": "Διοργάνωση Τουρνουά",
    "features.tournament.description": "Δημιούργησε επαγγελματικά τουρνουά με αυτοματοποιημένη κλήρωση και bracket generation.",
    "features.liveScores.title": "Live Scores",
    "features.liveScores.description": "Ενημέρωση αποτελεσμάτων σε πραγματικό χρόνο. Όλοι οι παίκτες και φίλαθλοι ενημερωμένοι.",
    "features.stats.title": "Αποτελέσματα & Stats",
    "features.stats.description": "Λεπτομερή στατιστικά, ιστορικό αγώνων και αναλυτικές αναφορές για κάθε παίκτη.",
    "features.playerManagement.title": "Διαχείριση Παικτών",
    "features.playerManagement.description": "Εγγραφή παικτών, δημιουργία προφίλ, ranking system και leaderboards.",
    "features.matchTimer.title": "Χρονομέτρηση Αγώνων",
    "features.matchTimer.description": "Ενσωματωμένο σύστημα χρονομέτρησης για επαγγελματική διεξαγωγή αγώνων.",
    "features.rankings.title": "Κατατάξεις & Rankings",
    "features.rankings.description": "Αυτόματη ενημέρωση κατατάξεων, ELO rating system και hall of fame.",

    "howItWorks.badge": "Διαδικασία",
    "howItWorks.title": "Πώς Λειτουργεί",
    "howItWorks.description": "Τρία απλά βήματα για να ξεκινήσεις το επόμενο επαγγελματικό τουρνουά μπιλιάρδου.",
    "howItWorks.step1.title": "Δημιούργησε Τουρνουά",
    "howItWorks.step1.description": "Όρισε τους κανόνες, τη μορφή του τουρνουά (single/double elimination, round robin), και προσκάλεσε παίκτες.",
    "howItWorks.step2.title": "Διεξαγωγή Αγώνων",
    "howItWorks.step2.description": "Παρακολούθησε live τους αγώνες, ενημέρωσε τα scores σε πραγματικό χρόνο, και διαχειρίσου το bracket.",
    "howItWorks.step3.title": "Αποτελέσματα & Rankings",
    "howItWorks.step3.description": "Αυτόματη ανακοίνωση νικητών, ενημέρωση κατατάξεων, και αναλυτικά στατιστικά για όλους τους παίκτες.",

    "audience.badge": "Για Όλους",
    "audience.title": "Λύσεις για Παίκτες & Συλλόγους",
    "audience.description": "Ανεξάρτητα αν είστε λέσχη, διοργανωτής ή παίκτης, το BilliardToday έχει τα εργαλεία που χρειάζεστε.",
    "audience.clubs.title": "Λέσχες & Αίθουσες",
    "audience.clubs.description": "Διοργανώστε τακτικά τουρνουά, προσελκύστε νέους παίκτες και δημιουργήστε μια ζωντανή κοινότητα.",
    "audience.clubs.features.multiTournament": "Διαχείριση πολλαπλών τουρνουά",
    "audience.clubs.features.venuePromotion": "Προβολή της αίθουσάς σας",
    "audience.clubs.features.autoBrackets": "Αυτόματη δημιουργία brackets",
    "audience.clubs.features.participationStats": "Στατιστικά συμμετοχής",
    "audience.organizers.title": "Διοργανωτές",
    "audience.organizers.description": "Εργαλεία για επαγγελματική διοργάνωση τουρνουά με αυτοματοποίηση και real-time management.",
    "audience.organizers.features.centralManagement": "Κεντρική διαχείριση αγώνων",
    "audience.organizers.features.liveScores": "Live score updates",
    "audience.organizers.features.autoDraws": "Αυτόματες κλήρωσεις",
    "audience.organizers.features.printableBrackets": "Εκτυπώσιμα brackets",
    "audience.players.title": "Παίκτες",
    "audience.players.description": "Βρείτε τουρνουά, παρακολουθήστε την πρόοδό σας, και ανεβείτε στις κατατάξεις.",
    "audience.players.features.profileStats": "Προσωπικό προφίλ & στατιστικά",
    "audience.players.features.tournamentRegistration": "Εγγραφή σε τουρνουά",
    "audience.players.features.rankings": "Ranking & leaderboards",
    "audience.players.features.matchHistory": "Ιστορικό αγώνων",

    "finalCTA.badge": "Ξεκίνα Τώρα",
    "finalCTA.title": "Έτοιμος να Δημιουργήσεις το",
    "finalCTA.subtitle": "Επόμενο Μεγάλο Τουρνουά;",
    "finalCTA.description": "Εγγραφή δωρεάν, χωρίς δέσμευση. Ξεκινήστε να οργανώνετε επαγγελματικά τουρνουά σε λιγότερο από 5 λεπτά.",
    "finalCTA.createTournament": "Δημιούργησε Τουρνουά",
    "finalCTA.browseTournaments": "Περιήγηση Τουρνουά",
    "finalCTA.freeSignup": "Δωρεάν εγγραφή",
    "finalCTA.noCreditCard": "Χωρίς πιστωτική κάρτα",
    "finalCTA.setup5Minutes": "Setup σε 5 λεπτά",

    "footer.description": "Η κορυφαία πλατφόρμα για τουρνουά μπιλιάρδου στην Ελλάδα.",
    "footer.platform.title": "Πλατφόρμα",
    "footer.platform.features": "Χαρακτηριστικά",
    "footer.platform.pricing": "Τιμές",
    "footer.platform.guide": "Οδηγός Χρήσης",
    "footer.community.title": "Κοινότητα",
    "footer.community.tournaments": "Τουρνουά",
    "footer.community.rankings": "Κατατάξεις",
    "footer.community.clubs": "Λέσχες",
    "footer.support.title": "Υποστήριξη",
    "footer.support.contact": "Επικοινωνία",
    "footer.support.terms": "Όροι Χρήσης",
    "footer.support.privacy": "Απόρρητο",
    "footer.copyright": "© 2025 BilliardToday. Με επιφύλαξη παντός δικαιώματος."
  },
  en: {
    "nav.features": "Features",
    "nav.howItWorks": "How It Works",
    "nav.forYou": "For You",
    "nav.login": "Log in",

    "hero.livePlatform": "Live Tournament Platform",
    "hero.title": "Organize & Track",
    "hero.subtitle": "Billiard Tournaments",
    "hero.description": "The complete platform for clubs, organizers, and players. Create pro tournaments, track live scores, rankings, and results in real time.",
    "hero.createTournament": "Create Tournament",
    "hero.viewTournaments": "View Tournaments",
    "hero.live": "Live",
    "hero.backgroundAlt": "Billiard table",
    "hero.activeTournaments": "Active Tournaments",
    "hero.registeredPlayers": "Registered Players",
    "hero.completedMatches": "Completed Matches",

    "stats.activeTournaments": "Active Tournaments",
    "stats.players": "Players",
    "stats.registeredMatches": "Recorded Matches",

    "features.badge": "Features",
    "features.title": "Everything You Need for Pro Tournaments",
    "features.description": "An end-to-end toolkit to organize, run, and track billiard tournaments with ease.",
    "features.tournament.title": "Tournament Management",
    "features.tournament.description": "Build professional brackets with automated draws.",
    "features.liveScores.title": "Live Scores",
    "features.liveScores.description": "Real-time updates for players and fans.",
    "features.stats.title": "Results & Stats",
    "features.stats.description": "Detailed stats, match history, and reports for every player.",
    "features.playerManagement.title": "Player Management",
    "features.playerManagement.description": "Profiles, registrations, rankings, and leaderboards.",
    "features.matchTimer.title": "Match Timing",
    "features.matchTimer.description": "Built-in timing for professional match conduct.",
    "features.rankings.title": "Rankings",
    "features.rankings.description": "Automatic rankings with ELO and hall of fame.",

    "howItWorks.badge": "Process",
    "howItWorks.title": "How It Works",
    "howItWorks.description": "Three quick steps to launch your next pro billiard tournament.",
    "howItWorks.step1.title": "Create Tournament",
    "howItWorks.step1.description": "Set rules, format (single/double elim, round robin) and invite players.",
    "howItWorks.step2.title": "Run Matches",
    "howItWorks.step2.description": "Track matches live, update scores, and manage the bracket.",
    "howItWorks.step3.title": "Results & Rankings",
    "howItWorks.step3.description": "Publish winners, update rankings, and share detailed stats.",

    "audience.badge": "For Everyone",
    "audience.title": "Solutions for Players & Clubs",
    "audience.description": "Whether you are a club, organizer, or player, BilliardToday has the tools you need.",
    "audience.clubs.title": "Clubs & Venues",
    "audience.clubs.description": "Host regular tournaments, attract players, and build a vibrant community.",
    "audience.clubs.features.multiTournament": "Manage multiple tournaments",
    "audience.clubs.features.venuePromotion": "Promote your venue",
    "audience.clubs.features.autoBrackets": "Automatic brackets",
    "audience.clubs.features.participationStats": "Participation stats",
    "audience.organizers.title": "Organizers",
    "audience.organizers.description": "Pro tools with automation and real-time management.",
    "audience.organizers.features.centralManagement": "Central match management",
    "audience.organizers.features.liveScores": "Live score updates",
    "audience.organizers.features.autoDraws": "Automatic draws",
    "audience.organizers.features.printableBrackets": "Printable brackets",
    "audience.players.title": "Players",
    "audience.players.description": "Find tournaments, track your progress, and climb the rankings.",
    "audience.players.features.profileStats": "Profile & stats",
    "audience.players.features.tournamentRegistration": "Tournament registrations",
    "audience.players.features.rankings": "Ranking & leaderboards",
    "audience.players.features.matchHistory": "Match history",

    "finalCTA.badge": "Start Now",
    "finalCTA.title": "Ready to Launch the",
    "finalCTA.subtitle": "Next Big Tournament?",
    "finalCTA.description": "Free signup, no commitment. Go live with pro tournaments in under 5 minutes.",
    "finalCTA.createTournament": "Create Tournament",
    "finalCTA.browseTournaments": "Browse Tournaments",
    "finalCTA.freeSignup": "Free signup",
    "finalCTA.noCreditCard": "No credit card",
    "finalCTA.setup5Minutes": "5-minute setup",

    "footer.description": "The leading platform for billiard tournaments in Greece.",
    "footer.platform.title": "Platform",
    "footer.platform.features": "Features",
    "footer.platform.pricing": "Pricing",
    "footer.platform.guide": "User Guide",
    "footer.community.title": "Community",
    "footer.community.tournaments": "Tournaments",
    "footer.community.rankings": "Rankings",
    "footer.community.clubs": "Clubs",
    "footer.support.title": "Support",
    "footer.support.contact": "Contact",
    "footer.support.terms": "Terms of Service",
    "footer.support.privacy": "Privacy",
    "footer.copyright": "© 2025 BilliardToday. All rights reserved."
  },
};

const I18nContext = createContext<{
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({
  t: (key: string) => key,
  locale: "el",
  setLocale: () => {},
});

export function LandingI18nProvider({
  locale: initialLocale = "el",
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const dict = dictionaries[locale] ?? dictionaries.el;
  const value = useMemo(() => ({ 
    t: (key: string) => dict[key] ?? key, 
    locale, 
    setLocale 
  }), [dict, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLandingT() {
  return useContext(I18nContext);
}
