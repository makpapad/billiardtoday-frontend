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
