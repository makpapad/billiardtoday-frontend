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

/**
 * Κίνηση από τη CEB: ό,τι λινκ βγαίνει από το embed παίρνει UTM ώστε στο GA4 να
 * ξεχωρίζει καθαρά η επισκεψιμότητα που έρχεται μέσω του iframe της CEB.
 */
export const CEB_EMBED_SOURCE = "ceb";

export function withCebAttribution(url: string, campaign: string): string {
  if (!/^https?:\/\//i.test(url)) return url;
  const [base, hash] = url.split("#");
  const sep = base.includes("?") ? "&" : "?";
  const qs = `utm_source=${CEB_EMBED_SOURCE}&utm_medium=embed&utm_campaign=${encodeURIComponent(campaign)}`;
  return `${base}${sep}${qs}${hash ? `#${hash}` : ""}`;
}

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/**
 * Στέλνει στο GA4 το κλικ που έγινε ΜΕΣΑ στο embed, πριν φύγει ο επισκέπτης στο
 * billiardtoday.com. Έτσι μετριούνται και τα κλικ που δεν καταλήγουν σε παραμονή.
 */
export function reportCebEmbedClick(
  campaign: string,
  kind: "player" | "tournament" | "source" | "pdf",
  label: string,
): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "ceb_embed_click", {
    campaign,
    link_kind: kind,
    link_label: label,
    transport_type: "beacon",
  });
}

/**
 * Κλικ στον σύνδεσμο προς το ΕΠΙΣΗΜΟ PDF της CEB (κατάταξη που δεν έχει ακόμη χτιστεί
 * στο BilliardToday). Μετριέται στο GA4 πριν ο επισκέπτης φύγει για το eurobillard.org,
 * ώστε να φαίνεται ποιες κατηγορίες τραβούν κόσμο προς τα επίσημα έγγραφα.
 */
export function reportCebPdfClick(label: string, campaign: string = "ceb-ranking"): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "ceb_pdf_click", {
    campaign,
    link_kind: "official_pdf",
    link_label: label,
    transport_type: "beacon",
  });
}
