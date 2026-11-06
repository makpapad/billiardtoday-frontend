/**
 * Κοινοί κανόνες δημοσίευσης για τα τουρνουά που βλέπει το κοινό.
 *
 * Ο κανόνας ζει σε ΕΝΑ σημείο: το `/api/tournaments` φιλτράρει με αυτόν, και κάθε
 * server-side μέτρηση για δημόσια σελίδα (π.χ. «θα δείξουμε την καρτέλα Team;»)
 * πρέπει να μετράει τα ίδια rows — αλλιώς η σελίδα εμφανίζει καρτέλα με άδεια λίστα.
 */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Ένα event κρύβεται όταν το τουρνουά του δεν είναι δημοσιευμένο (ή είναι club runtime). */
export function isDraftTournament(item: any): boolean {
  const isEventRow =
    Boolean(item) && typeof item === "object" && "tournament" in item;
  const tournament = asRecord(item?.tournament);
  // Ένα event χωρίς τουρνουά δεν έχει πού να δηλώσει κατάσταση δημοσίευσης.
  // Χωρίς αυτόν τον κανόνα, ορφανά events (δοκιμές, διαγραμμένα τουρνουά) βγαίνουν
  // στην αρχική και στο /tournaments σαν κανονικές διοργανώσεις.
  if (isEventRow && !tournament) return true;
  const source = tournament ?? asRecord(item);
  const formatDefinition = asRecord(source?.format_definition);
  const publication = asRecord(formatDefinition?.publication);
  const publicationState = String(publication?.state ?? "").toLowerCase();
  if (publicationState) return publicationState !== "published";

  return Boolean(
    formatDefinition?.clubRuntime ||
      String(formatDefinition?.setupMode ?? "").startsWith("club_"),
  );
}
