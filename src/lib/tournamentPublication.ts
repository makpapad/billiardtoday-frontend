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
  const tournament = asRecord(item?.tournament) ?? asRecord(item);
  const formatDefinition = asRecord(tournament?.format_definition);
  const publication = asRecord(formatDefinition?.publication);
  const publicationState = String(publication?.state ?? "").toLowerCase();
  if (publicationState) return publicationState !== "published";

  return Boolean(
    formatDefinition?.clubRuntime ||
      String(formatDefinition?.setupMode ?? "").startsWith("club_"),
  );
}
