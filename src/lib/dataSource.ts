/**
 * Ένδειξη πηγής δεδομένων κάτω από τα αποτελέσματα διοργάνωσης.
 *
 * Τα δεδομένα των διοργανώσεων της ΕΟΑΑ (ατομικά + ομαδικά) έρχονται από το 3Cushion.gr,
 * οπότε οι σελίδες της το αναφέρουν. Ο έλεγχος γίνεται πάντα με την ταυτότητα της
 * διοργανώτριας ομοσπονδίας (slug ή documentId), ποτέ με τίτλο/όνομα.
 */

export type DataSourceCredit = {
  label: string;
  href: string;
};

export const THREE_CUSHION_GR_CREDIT: DataSourceCredit = {
  label: "3Cushion.gr",
  href: "https://3cushion.gr",
};

/** ΕΟΑΑ — «Hellenic Federation of Precision Sports». */
const EOAA_FEDERATION_SLUGS = new Set(["hellenic-federation-of-precision-sports"]);
const EOAA_FEDERATION_DOCUMENT_ID = "rblgb0ykuokcisxxt0e140el";

/** Η διοργανώτρια ομοσπονδία είναι η ΕΟΑΑ; */
export const isEoaaFederation = (
  identity: { slug?: string | null; documentId?: string | null } | null | undefined,
): boolean => {
  if (!identity) return false;
  const slug = String(identity.slug ?? "").trim().toLowerCase();
  if (slug && EOAA_FEDERATION_SLUGS.has(slug)) return true;
  return String(identity.documentId ?? "").trim() === EOAA_FEDERATION_DOCUMENT_ID;
};

/** Η ένδειξη πηγής που ταιριάζει στη διοργάνωση (null = καμία ένδειξη). */
export const dataSourceCreditFor = (
  identity: { slug?: string | null; documentId?: string | null } | null | undefined,
): DataSourceCredit | null =>
  isEoaaFederation(identity) ? THREE_CUSHION_GR_CREDIT : null;

/**
 * Ένδειξη πηγής από τον **επίσημο ιστότοπο της ίδιας της ομοσπονδίας** (π.χ. `billard-union.net`
 * για τη DBU, `fpbilhar.pt` για την FPB). Χρησιμοποιείται στα ομαδικά, όπου τα αποτελέσματα
 * συλλέγονται από τη σελίδα του διοργανωτή.
 *
 * Η ΕΟΑΑ κρατά το `3Cushion.gr` (από εκεί έρχονται τα δεδομένα της, όχι από το eoaa.org.gr).
 */
export const federationWebsiteCredit = (
  federation:
    | {
        slug?: string | null;
        documentId?: string | null;
        website?: string | null;
      }
    | null
    | undefined,
): DataSourceCredit | null => {
  const eoaa = dataSourceCreditFor(federation ?? null);
  if (eoaa) return eoaa;

  const website = String(federation?.website ?? "").trim();
  if (!website) return null;

  try {
    const url = new URL(website);
    const host = url.hostname.replace(/^www\./i, "");
    if (!host) return null;
    return { label: host, href: website };
  } catch {
    return null;
  }
};
