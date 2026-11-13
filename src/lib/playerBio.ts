/**
 * Φυσική γλώσσα για SEO: παράγει μια περιγραφή του αθλητή σε αγγλικά,
 * με σωστή ορολογία μπιλιάρδου, για το <p> πάνω από το αρχείο.
 *
 * ΔΕΝ είναι metadata — είναι ορατό κείμενο στη σελίδα, ώστε το Google
 * να βλέπει ουσιαστικό περιεχόμενο αντί για 70 λέξεις.
 */
import type { PublicPlayerProfileSummary, PublicPlayerGameStats } from "@/lib/publicSiteData";
import type { PlayerHistoryParticipation } from "@/lib/playerHistoryServer";

function formatPositions(items: PlayerHistoryParticipation[]): string {
  const tops = items
    .filter((item) => item.position && /^[1-3]$/.test(item.position.replace(/\D/g, "")))
    .map((item) => ({
      position: item.position,
      tournament: item.tournament,
      year: item.year,
    }))
    .slice(0, 5);

  if (tops.length === 0) return "";

  if (tops.length === 1) {
    const place = tops[0]!.position;
    const ordinal =
      place === "1" ? "winner" : place === "2" ? "runner-up" : `3rd place`;
    return `Their best tournament result was ${ordinal} at ${tops[0]!.tournament}${tops[0]!.year ? ` (${tops[0]!.year})` : ""}.`;
  }

  const labels = tops.map((t) => {
    const place = t.position;
    const ordinal =
      place === "1" ? "won" : place === "2" ? "finished runner-up at" : `finished 3rd at`;
    return `${ordinal} ${t.tournament}${t.year ? ` (${t.year})` : ""}`;
  });

  return `They ${labels.join(", ")}.`;
}

function formatGameTypeLabel(label: string): string {
  // Καθαρισμός ορολογίας: "3-Cushion" → "three-cushion", "Balk 47/1" → "balkline"
  const lower = label.toLowerCase().trim();
  if (lower === "3-cushion") return "three-cushion";
  if (lower === "3 cushion") return "three-cushion";
  if (lower.startsWith("balk")) return `balkline${lower.replace(/^balk.*?(\d.*)$/, " $1") !== lower && lower.length > 4 ? lower.slice(4).trim() : ""}`.trim();
  return lower;
}

function hasRealStats(stats: PublicPlayerGameStats): boolean {
  return stats.totalMatches > 0 || (stats.eventCount ?? 0) > 0;
}

export function buildPlayerBio(
  summary: PublicPlayerProfileSummary,
  history: { items: PlayerHistoryParticipation[]; totalCount: number } | null,
): string {
  const { seoName, country, city, clubName, primaryGameStats, careerStatsByGameType, archiveStartYear, archiveEndYear } = summary;
  const sentences: string[] = [];

  // 1. Ταυτότητα
  const location = [city, country].filter(Boolean).join(", ");
  const origin = location ? ` from ${location}` : "";
  // Αν η χώρα είναι όνομα (π.χ. "Sweden", "Italy") αντί για επίθετο ("Swedish", "Italian"),
  // μετατρέπουμε. Μικρή λίστα — τα περισσότερα δεδομένα είναι ήδη επίθετο (π.χ. "Greek").
  const NATIONALITY_MAP: Record<string, string> = {
    Sweden: "Swedish", Netherlands: "Dutch", Italy: "Italian",
    Spain: "Spanish", France: "French", Germany: "German",
    Turkey: "Turkish", Belgium: "Belgian", Portugal: "Portuguese",
    Denmark: "Danish", Norway: "Norwegian", Finland: "Finnish",
    Poland: "Polish", Czech: "Czech", Switzerland: "Swiss",
    Austria: "Austrian", Hungary: "Hungarian", Croatia: "Croatian",
    Serbia: "Serbian", Romania: "Romanian", Bulgaria: "Bulgarian",
    Russia: "Russian", Japan: "Japanese", Korea: "Korean",
    China: "Chinese", Vietnam: "Vietnamese", Taiwan: "Taiwanese",
    Egypt: "Egyptian", Morocco: "Moroccan", Tunisia: "Tunisian",
    Argentina: "Argentine", Colombia: "Colombian", Brazil: "Brazilian",
    Jamaica: "Jamaican", Qatar: "Qatari", Iran: "Iranian",
    India: "Indian", Australia: "Australian", Canada: "Canadian",
    USA: "American", "United States": "American",
    Greece: "Greek", Cyprus: "Cypriot",
  };
  const nat = country ? (NATIONALITY_MAP[country] || country) : "";
  const article = nat && /^[aeiou]/i.test(nat) ? "n" : "";
  sentences.push(`${seoName} is a${article} ${nat} billiard player${origin}.`);

  // 2. Αγώνισμα / ειδικότητα
  const validStats = careerStatsByGameType.filter(hasRealStats).slice(0, 3);
  if (validStats.length > 0) {
    const labels = validStats.map((s) => formatGameTypeLabel(s.label));
    const primary = labels[0];
    const rest = labels.slice(1);

    if (rest.length === 0) {
      sentences.push(`Specialising in ${primary}, they have competed in ${validStats[0]!.totalMatches} matches across ${validStats[0]!.eventCount ?? "numerous"} tournaments${archiveStartYear ? `, spanning from ${archiveStartYear} to ${archiveEndYear ?? "the present"}` : ""}.`);
    } else {
      const allLabels = [primary!, ...rest];
      const last = allLabels.pop();
      sentences.push(`Competing in ${allLabels.join(", ")} and ${last}, they have logged ${validStats.reduce((sum, s) => sum + s.totalMatches, 0)} matches over ${validStats.reduce((sum, s) => sum + (s.eventCount ?? 0), 0)} tournaments${archiveStartYear ? ` (${archiveStartYear}–${archiveEndYear ?? "present"})` : ""}.`);
    }
  } else {
    sentences.push(`They have competed in ${history?.totalCount ?? 0} tournaments${archiveStartYear ? ` from ${archiveStartYear} to ${archiveEndYear ?? "the present"}` : ""}.`);
  }

  // 3. Στατιστικά (πρωτεύον έπαρμα)
  if (primaryGameStats && primaryGameStats.totalMatches > 0) {
    const rate = primaryGameStats.avgPerInning ?? primaryGameStats.bestAverageFromWins;
    const statsBits: string[] = [];
    statsBits.push(`${primaryGameStats.totalWins} wins`);
    statsBits.push(`${primaryGameStats.totalLosses} losses`);
    if (primaryGameStats.winPercentage !== null && primaryGameStats.winPercentage > 0) {
      statsBits.push(`a win rate of ${primaryGameStats.winPercentage.toFixed(1)}%`);
    }
    if (rate !== null && rate > 0) {
      const label = formatGameTypeLabel(primaryGameStats.label);
      statsBits.push(`a ${label} average of ${rate.toFixed(3)}`);
    }
    if (primaryGameStats.highestRun !== null && primaryGameStats.highestRun > 0) {
      statsBits.push(`a high run of ${primaryGameStats.highestRun}`);
    }

    if (statsBits.length > 0) {
      const allBits = statsBits;
      const bitEnd = allBits.pop();
      sentences.push(`In their primary discipline, they have recorded ${allBits.join(", ")}${allBits.length > 0 ? ", and " : ""}${bitEnd}.`);
    }
  }

  // 4. Κορυφαίες θέσεις
  if (history && history.items.length > 0) {
    const posText = formatPositions(history.items);
    if (posText) sentences.push(posText);
  }

  // 5. Σύλλογος
  if (clubName) {
    sentences.push(`They are affiliated with ${clubName}.`);
  }

  // 6. Τρέχοντα suits
  const recentMatches = history?.items
    .flatMap((item) => item.matches)
    .filter((m) => m.result && (m.result === "W" || m.result === "L"))
    .slice(0, 5);

  if (recentMatches && recentMatches.length >= 2) {
    const recentWins = recentMatches.filter((m) => m.result === "W").length;
    const recentLosses = recentMatches.filter((m) => m.result === "L").length;
    const recentTotal = recentWins + recentLosses;
    if (recentTotal >= 2) {
      sentences.push(`In recent matches, they hold ${recentWins} wins and ${recentLosses} losses.`);
    }
  }

  return sentences.join(" ");
}
