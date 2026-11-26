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
      {/* Στα embeds δεν θέλουμε ύψη 100vh: μέσα σε iframe θα έσπρωχναν το πλαίσιο
          να μεγαλώνει σε κύκλο (όσο ψηλώνει το πλαίσιο, τόσο ψηλώνει το 100vh).
          Το πραγματικό ύψος το δίνει το EmbedAutoHeight. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "html,body{min-height:0!important;height:auto!important}" +
            '[class*="min-h-screen"]{min-height:0!important}',
        }}
      />
      {children}
      <EmbedAttribution />
      <EmbedAutoHeight />
    </>
  );
}
