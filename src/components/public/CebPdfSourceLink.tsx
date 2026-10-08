"use client";

import type { ReactNode } from "react";
import { reportCebEmbedClick, reportCebPdfClick, withCebAttribution } from "@/lib/embedLinks";

type Props = {
  /** Απόλυτο URL του επίσημου PDF της CEB (eurobillard.org). */
  href: string;
  /** Η κατηγορία — στέλνεται στο GA4 μαζί με το κλικ. */
  label: string;
  /** GA4 campaign (ξεχωρίζει η κίνηση που έρχεται μέσα από το embed). */
  campaign?: string;
  /** Σε embed: προσθέτει UTM και μετρά `ceb_embed_click` (kind `pdf`) αντί `ceb_pdf_click`. */
  embedded?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Σύνδεσμος προς το ΕΠΙΣΗΜΟ φύλλο PDF της CEB — client component μόνο και μόνο για
 * το `onClick`. Ανοίγει πάντα σε νέα καρτέλα· σε embed παίρνει το UTM convention και
 * το GA4 συμβάν `ceb_embed_click` με `link_kind: "pdf"`, εκτός embed το `ceb_pdf_click`.
 */
export function CebPdfSourceLink({
  href,
  label,
  campaign = "ceb-ranking",
  embedded = false,
  className,
  children,
}: Props) {
  return (
    <a
      href={embedded ? withCebAttribution(href, campaign) : href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        embedded ? reportCebEmbedClick(campaign, "pdf", label) : reportCebPdfClick(label, campaign)
      }
      className={className}
    >
      {children}
    </a>
  );
}
