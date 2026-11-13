/**
 * Φυσική γλώσσα για SEO: περιγραφή συλλόγου σε αγγλικά.
 *
 * Προστίθεται ορατό κείμενο στη σελίδα ώστε να μην είναι "thin content"
 * (≈ 154 λέξεις και μετά συχνά <details> με λίστα αθλητών).
 */

export function buildClubBio(
  club: {
    name: string;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    federation?: { name: string } | null;
  },
  playerCount: number,
): string {
  const location = [club.city, club.country].filter(Boolean).join(", ");
  const federation = club.federation?.name ?? null;
  const sentences: string[] = [];

  // 1. Ταυτότητα
  if (location) {
    sentences.push(`${club.name} is a billiard club based in ${location}.`);
  } else {
    sentences.push(`${club.name} is a billiard club.`);
  }

  // 2. Federation
  if (federation) {
    sentences.push(`It is affiliated with ${federation}.`);
  }

  // 3. Μέγεθος (αριθμός αθλητών)
  if (playerCount > 0) {
    const playerLabel = playerCount === 1 ? "player" : "players";
    sentences.push(`The club counts ${playerCount} registered ${playerLabel} on its roster.`);
  }

  // 4. Επικοινωνία
  const contactBits: string[] = [];
  if (club.address) contactBits.push(`located at ${club.address}`);
  if (club.contactPhone) contactBits.push(`reachable by phone at ${club.contactPhone}`);
  if (club.contactEmail) contactBits.push(`with email contact at ${club.contactEmail}`);

  if (contactBits.length > 0) {
    const all = contactBits;
    const last = all.pop();
    sentences.push(`It is ${all.join(", ")}${all.length > 0 ? ", and " : ""}${last}.`);
  }

  return sentences.join(" ");
}
