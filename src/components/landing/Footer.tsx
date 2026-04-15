import type { LandingFooterContent } from "@/components/landing/content";
import { PublicFooter } from "@/components/site/PublicFooter";

export function Footer({ content }: { content: LandingFooterContent }) {
  return (
    <PublicFooter
      siteName={content.siteName}
      description={content.description}
      exploreLinks={content.links}
      socialLinks={content.socialLinks}
    />
  );
}
