import type { ReactNode } from "react";
import { EmbedAttribution } from "@/components/embed/EmbedAttribution";

/**
 * Ενσωματώσεις (widgets) που δείχνουν οι σύλλογοι/ομοσπονδίες στις δικές τους σελίδες.
 * Εδώ μπαίνει η αναφορά «Powered by Billiard Today» — μία φορά, για όλες τις διαδρομές.
 * Το /embed/overlay έχει δικό του layout και δεν την περιλαμβάνει.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <EmbedAttribution />
    </>
  );
}
