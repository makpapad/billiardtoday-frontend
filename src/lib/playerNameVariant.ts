/**
 * Ποιο όνομα αθλητή δείχνουμε — εθνικό ή διεθνές.
 *
 * Κανόνας (απόφαση χρήστη, 2026-10-27):
 *  - **εθνικά** πρωταθλήματα/διοργανώσεις (`federation.level === 'national'`) → **εθνικό όνομα**
 *    (`full_name`), είτε πρόκειται για ομαδικά σωματείων είτε για εθνικές ομάδες·
 *  - **διεθνείς** διοργανώσεις (`world`, `confederation`) → **International Name**
 *    (`full_name_en`).
 * Αν λείπει η ζητούμενη γλώσσα, πέφτουμε στην άλλη (ποτέ κενό όταν υπάρχει έστω ένα όνομα).
 */

export type NameVariant = "national" | "international";

/** Ό,τι χρειάζεται για να διαλέξουμε όνομα και να φτιάξουμε σύνδεσμο προφίλ. */
export type PlayerNamePair = {
  documentId?: string | null;
  national?: string | null;
  international?: string | null;
};

/** `national` → εθνικό όνομα· `world`/`confederation`/άγνωστο → διεθνές. */
export const nameVariantForFederationLevel = (
  level: string | null | undefined,
): NameVariant => (String(level ?? "").trim().toLowerCase() === "national" ? "national" : "international");

export const isNationalFederationLevel = (level: string | null | undefined): boolean =>
  nameVariantForFederationLevel(level) === "national";

/** Το όνομα που θα δει ο επισκέπτης για τη συγκεκριμένη διοργάνωση. */
export const pickPlayerName = (
  player: PlayerNamePair | null | undefined,
  variant: NameVariant,
): string => {
  if (!player) return "";
  const national = String(player.national ?? "").trim();
  const international = String(player.international ?? "").trim();
  return variant === "national"
    ? national || international
    : international || national;
};

/** Κλειδί ταυτότητας αθλητή στη σελίδα (documentId όταν υπάρχει, αλλιώς το όνομα). */
export const playerIdentityKey = (
  player: PlayerNamePair | null | undefined,
  variant: NameVariant,
): string => {
  const documentId = String(player?.documentId ?? "").trim();
  if (documentId) return `p:${documentId}`;
  const name = pickPlayerName(player, variant);
  return name ? `n:${name}` : "";
};

/**
 * Σύνδεσμος προφίλ αθλητή, με τη σύμβαση που χρησιμοποιεί όλο το site:
 * `/players/{αριθμητικό id}-{Όνομα-με-παύλες}` (το `[id]` της σελίδας διαβάζει ό,τι
 * υπάρχει πριν από την πρώτη παύλα, γι' αυτό προτιμάται το αριθμητικό id — ένα
 * documentId περιέχει παύλες).
 */
export const playerProfileHref = (
  player: { id?: number | null; documentId?: string | null } | null | undefined,
  displayName?: string | null,
): string | null => {
  const numeric = player?.id !== null && player?.id !== undefined && Number.isFinite(Number(player.id))
    ? String(player.id)
    : "";
  const identifier = numeric || String(player?.documentId ?? "").trim();
  if (!identifier) return null;
  const slug = String(displayName ?? "").trim().replace(/\s+/g, "-");
  return `/players/${encodeURIComponent(slug ? `${identifier}-${slug}` : identifier)}`;
};
