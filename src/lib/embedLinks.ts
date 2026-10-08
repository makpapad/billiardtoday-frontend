/**
 * EMBED: ποια λινκ μένουν ΜΕΣΑ στο iframe.
 *
 * Κανόνας (απόφαση Maki): μόνο οι σελίδες που υπάρχουν σε embedded μορφή και τις
 * σερβίρουμε καθαρές — οι **κατατάξεις** (`/rankings/...`) και οι **ομοσπονδίες**
 * (`/federations/...`). Όλα τα άλλα (προφίλ αθλητή, τουρνουά, σύλλογοι) ανοίγουν στο
 * billiardtoday.com σε νέα καρτέλα, ώστε ο επισκέπτης να μη «φυλακίζεται» σε σελίδα
 * που δεν είναι φτιαγμένη για embed.
 */
const EMBED_PREFIXES = ["/rankings/", "/federations/"];

/** `/rankings/ceb/3c-individual` → `/embed/rankings/ceb/3c-individual` (διατηρεί ?query/#hash). */
export function toEmbedHref(href: string): string {
  if (!href || href.startsWith("#") || /^https?:\/\//i.test(href)) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const suffix = cut === -1 ? "" : href.slice(cut);
  if (!EMBED_PREFIXES.some((prefix) => path.startsWith(prefix))) return href;
  return `/embed${path}${suffix}`;
}

/**
 * Το λινκ έτοιμο για μέσα στο iframe: ή σχετικό `/embed/...` (μένει στο frame), ή
 * απόλυτο URL στο site μας + νέα καρτέλα όταν δεν υπάρχει embedded εκδοχή.
 */
export function embedLinkTarget(href: string, siteUrl: string): { href: string; newTab: boolean } {
  const embed = toEmbedHref(href);
  if (embed !== href) return { href: embed, newTab: false };
  if (/^https?:\/\//i.test(href) || href.startsWith("#")) return { href, newTab: href.startsWith("#") ? false : true };
  return { href: `${siteUrl}${href}`, newTab: true };
}
