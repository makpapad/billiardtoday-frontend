import type { ReactNode } from "react";
import { EmbedAttribution } from "@/components/embed/EmbedAttribution";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";

/**
 * Ενσωματώσεις (widgets) που δείχνουν οι σύλλογοι/ομοσπονδίες στις δικές τους σελίδες.
 * Εδώ μπαίνει η αναφορά «Powered by Billiard Today» — μία φορά, για όλες τις διαδρομές.
 * Το /embed/overlay έχει δικό του layout και δεν την περιλαμβάνει.
 * Το EmbedAutoHeight ενημερώνει τη φιλοξενούσα σελίδα για το ύψος του περιεχομένου.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <EmbedAttribution />
      <EmbedAutoHeight />
    </>
  );
}
