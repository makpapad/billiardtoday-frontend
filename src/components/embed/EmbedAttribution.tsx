"use client";

import { usePathname } from "next/navigation";

/**
 * Σημείο μέτρησης ύψους για τις ενσωματώσεις (iframe).
 *
 * ΓΙΑΤΙ ΔΕΝ ΕΧΕΙ ΠΛΕΟΝ ΚΕΙΜΕΝΟ: η σελίδα που φιλοξενεί το widget δείχνει ΔΙΚΟ ΤΗΣ
 * badge «Powered by Billiard Today» με σύνδεσμο (μέρος 2 του κώδικα ενσωμάτωσης).
 * Με την αναφορά και μέσα στο πλαίσιο, η ίδια επωνυμία εμφανιζόταν δύο φορές — μία
 * μέσα στην κάρτα και μία από κάτω. Η αναφορά ζει πλέον ΜΟΝΟ έξω από το πλαίσιο.
 *
 * ΤΟ `data-bt-attribution` ΜΕΝΕΙ: το `EmbedAutoHeight` μετρά το κάτω άκρο ΑΥΤΟΥ του
 * στοιχείου για να βρει το πραγματικό τέλος του περιεχομένου. Χωρίς αυτό πέφτει στο
 * `scrollHeight` του document, που σε σελίδες με κρυφά πάνελ στο τέλος δίνει
 * μεγαλύτερο ύψος και αφήνει κενό μέσα στο πλαίσιο.
 *
 * Δεν μπαίνει στα overlays (τηλεοπτική προβολή): εκεί δεν υπάρχει ύψος να μετρηθεί.
 */
export function EmbedAttribution() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/embed/overlay")) return null;

  return <div data-bt-attribution="" aria-hidden="true" />;
}
