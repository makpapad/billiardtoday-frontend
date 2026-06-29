import type { Metadata } from "next";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { ContactPageClient } from "@/app/contact/ContactPageClient";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "Contact Billiard Today for platform, tournament, federation, club, and scoreboard support.",
  path: "/contact",
});

export default async function ContactPage() {
  return (
    <AppSiteShell>
      <ContactPageClient />
    </AppSiteShell>
  );
}
