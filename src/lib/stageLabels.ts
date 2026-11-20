/**
 * Σύντομη ετικέτα φάσης διοργάνωσης («PPPQ», «Q», «1/16», «FINAL 16»).
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ: το ίδιο «σύντομο» όνομα χρειάζεται σε πίνακες, γραφήματα
 * και στο API σύγκρισης διοργανώσεων. Οι τίτλοι των φάσεων στη βάση δεν είναι
 * τυποποιημένοι — «Pre-Pre-Pre-Qual», «PPPPQ», «QUALIFICATIONS», «1/16 MAIN
 * TOURNAMENT», «FINAL16», «Τελική 16άδα» — άρα η συντόμευση γίνεται με κανόνες.
 *
 * ΣΗΜΑΝΤΙΚΟ: η σειρά των κανόνων μετράει. Το κλάσμα («1/16») ελέγχεται ΠΡΙΝ το
 * «MAIN», αλλιώς το «1/16 MAIN TOURNAMENT» και το «1/8 FINAL TOURNAMENT» θα
 * κατέληγαν και τα δύο σε «MAIN»/«FINAL 16» και δύο διαφορετικές φάσεις θα
 * έσβηναν η μία την άλλη σε πίνακα/γράφημα.
 */
export function stageShortLabel(title: string | null | undefined, fallbackIndex = 0): string {
  const raw = String(title ?? "").trim();
  if (!raw) return `Stage ${fallbackIndex + 1}`;

  const condensed = raw.replace(/[^A-Za-z]/g, "");
  if (/^P*Q$/i.test(condensed)) return condensed.toUpperCase();

  // «QUALIFICATIONS», «Pre-Qual», «Pre-Pre-Pre-Qual» → Q / PQ / PPPQ
  if (/qual/i.test(condensed)) {
    const leadingP = (condensed.match(/^(P+)/i)?.[1] ?? "").length;
    const preCount = (condensed.match(/pre/gi) ?? []).length;
    return `${"P".repeat(Math.max(leadingP, preCount))}Q`;
  }

  const fraction = raw.match(/\d+\s*\/\s*\d+/);
  if (fraction) return fraction[0].replace(/\s+/g, "");

  if (/final\s*16|final16/i.test(raw)) return "FINAL 16";
  if (/main/i.test(raw)) return "MAIN";

  return raw.length > 14 ? `${raw.slice(0, 13)}…` : raw;
}

/**
 * Σειρά φάσης για ταξινόμηση, όταν το `order` λείπει από τη βάση.
 * Μικρότερο = νωρίτερα. Άγνωστες φάσεις πάνε στο τέλος.
 */
export function stageSortRank(label: string): number {
  const known: Record<string, number> = {
    PPPPQ: 1,
    PPPQ: 2,
    PPQ: 3,
    PQ: 4,
    Q: 5,
    "1/16": 6,
    "1/8": 7,
    "1/4": 8,
    "1/2": 9,
    FINAL: 10,
    "FINAL 16": 6,
    MAIN: 6,
  };
  return known[label.toUpperCase()] ?? 99;
}
