/**
 * Πότε ένα προφίλ αθλητή αξίζει να μπει στο ευρετήριο της Google.
 *
 * ΓΙΑΤΙ: το site έχει ~3.270 προφίλ. Το 30% έχει 0–2 αγώνες: ίδιο template, ίδιο
 * μήκος, ίδιες προτάσεις — μόνο το όνομα αλλάζει. Η Google το βλέπει και το λύνει
 * μόνη της: στο GSC το «/players/536-…» δηλώνει «Alternate page with proper
 * canonical tag» με canonical σε ΑΛΛΟΝ παίκτη, και το sitemap (3.795 URLs) έδειχνε
 * 0 indexed. Όσο το 86% του sitemap είναι σχεδόν πανομοιότυπες σελίδες, χάνεται
 * το crawl budget που χρειάζονται τα τουρνουά και οι κατατάξεις.
 *
 * ΚΑΝΟΝΑΣ: index μόνο όταν το προφίλ έχει πραγματικό ιστορικό αγώνων. Τα υπόλοιπα
 * μένουν προσβάσιμα (noindex, follow) — ο χρήστης δεν χάνει τίποτα, η Google παύει
 * να τα μετράει ως διπλότυπα.
 */
export const PLAYER_INDEX_MIN_MATCHES = 10;

/**
 * @param careerTotalMatches `career_stats.overall.totalMatches` της bt-player.
 *   `null`/`undefined` (άγνωστο) μετράει ως 0 — δεν ρισκάρουμε να μπει στο ευρετήριο
 *   σελίδα χωρίς περιεχόμενο.
 */
export const isPlayerIndexable = (
  careerTotalMatches?: number | null,
): boolean => {
  const matches = Number(careerTotalMatches);
  if (!Number.isFinite(matches)) return false;
  return matches >= PLAYER_INDEX_MIN_MATCHES;
};
