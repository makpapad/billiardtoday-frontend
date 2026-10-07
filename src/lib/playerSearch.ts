/**
 * «Έξυπνη» αναζήτηση αθλητή — ένας τόπος, ίδια συμπεριφορά σε όλες τις λίστες.
 *
 * Τι κάνει «έξυπνο» το ταίριασμα:
 *  - αγνοεί τόνους/διαλυτικά (ÅKESSON = AKESSON, ÖZTÜRK = OZTURK, ΜΕΘΕΝΙΤΗΣ = ΜΕΘΕΝΙΤΗΣ)
 *  - αγνοεί πεζά/κεφαλαία και σημεία στίξης
 *  - δέχεται τις λέξεις με ΟΠΟΙΑΔΗΠΟΤΕ σειρά («yuksel polat» βρίσκει «POLAT Yuksel»)
 *  - δέχεται UMB ID (και με ή χωρίς μηδενικά μπροστά: 102 = 0102)
 */

/** Κανονικοποίηση για σύγκριση: χωρίς τόνους, πεζά, μόνο γράμματα/νούμερα/κενά. */
export function foldName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Οι λέξεις που πληκτρολόγησε ο χρήστης, κανονικοποιημένες. */
export function searchTerms(query: string): string[] {
  return foldName(query).split(" ").filter(Boolean);
}

/** Όλες οι λέξεις πρέπει να υπάρχουν στο κείμενο — με όποια σειρά. */
export function matchesAll(haystack: string, terms: string[]): boolean {
  if (!terms.length) return true;
  return terms.every((term) => haystack.includes(term));
}

/**
 * Κείμενο αναζήτησης για έναν αθλητή: το όνομα όπως είναι στη λίστα, το όνομα
 * όπως το έχουμε στη βάση, και το UMB ID (με και χωρίς μηδενικά μπροστά).
 */
export function playerHaystack(name: string, databaseName?: string | null, umbId?: string | null): string {
  const parts = [name, databaseName ?? ""].map((value) => foldName(value)).filter(Boolean);
  const digits = (umbId ?? "").replace(/\D+/g, "");
  if (digits) {
    parts.push(foldName(digits));
    const withoutZeros = digits.replace(/^0+/, "");
    if (withoutZeros && withoutZeros !== digits) parts.push(foldName(withoutZeros));
  }
  return parts.join(" ");
}
