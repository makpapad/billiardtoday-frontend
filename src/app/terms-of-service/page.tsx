import type { Metadata } from "next";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { DocumentPage } from "@/components/site/DocumentPage";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Core terms for using Billiard Today public pages, accounts, admin tools and scoreboards.",
  path: "/terms-of-service",
});

export default async function TermsOfServicePage() {
  return (
    <AppSiteShell>
      <DocumentPage
        eyebrow="Legal"
        title="Terms of Service"
        intro="These terms describe the basic rules for using Billiard Today, including public competition pages, account features, admin tools, scoreboard experiences, and connected services."
        updatedAt="2026-04-15"
        sections={[
          {
            title: "Using the platform",
            paragraphs: [
              "You may browse public pages freely and use account or organizer tools only for legitimate billiard-related activity and in accordance with the permissions granted to you.",
              "You are responsible for the accuracy of the information you submit directly and for keeping your account credentials secure.",
            ],
          },
          {
            title: "Tournament and scoreboard data",
            paragraphs: [
              "Scores, rankings, brackets, schedules, and related event records are published to support competition management and public visibility. Organizers remain responsible for the sporting accuracy of the information they approve or publish.",
              "Temporary inconsistencies can occur while events are being edited, synchronized, or recalculated. Final authority may still rest with the organizer or federation in charge of the event.",
            ],
          },
          {
            title: "Acceptable use",
            paragraphs: [
              "You may not use the platform to disrupt events, scrape protected data, interfere with scoreboards, bypass permissions, upload harmful material, or impersonate another person or organization.",
              "We may suspend access, limit functionality, or remove content when activity creates operational, legal, or security risk.",
            ],
          },
          {
            title: "Availability and changes",
            paragraphs: [
              "We may update features, interfaces, data models, or integrations as the platform evolves. Some areas may be experimental or limited to selected partners, clubs, or organizers.",
              "We aim for reliability, but uninterrupted availability cannot be guaranteed during maintenance, infrastructure issues, or upstream service incidents.",
            ],
          },
          {
            title: "Intellectual property and contact",
            paragraphs: [
              "Billiard Today branding, product design, software workflows, and original platform content remain protected. Tournament names, logos, and related sporting assets may belong to clubs, federations, sponsors, or rights holders.",
              "If you have a legal, rights, or support question about these terms, contact the platform operator through the official contact channels published on the site.",
            ],
          },
        ]}
      />
    </AppSiteShell>
  );
}
