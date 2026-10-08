"use client";

import type { ReactNode } from "react";
import { reportCebEmbedClick, reportCebPdfClick, withCebAttribution } from "@/lib/embedLinks";

type Props = {
  /** Absolute URL of the official CEB PDF (eurobillard.org). */
  href: string;
  /** The category — sent to GA4 along with the click. */
  label: string;
  /** GA4 campaign (separates the traffic coming in through the embed). */
  campaign?: string;
  /** In an embed: adds UTM and reports `ceb_embed_click` (kind `pdf`) instead of `ceb_pdf_click`. */
  embedded?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Link to the OFFICIAL CEB PDF sheet — a client component only for the `onClick`.
 * Always opens in a new tab; in an embed it gets the UTM convention and the GA4 event
 * `ceb_embed_click` with `link_kind: "pdf"`, outside an embed `ceb_pdf_click`.
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
