import type { Metadata } from "next";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { DocumentPage } from "@/components/site/DocumentPage";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "How Billiard Today handles account, tournament and platform data.",
  path: "/privacy-policy",
});

export default async function PrivacyPolicyPage() {
  return (
    <AppSiteShell>
      <DocumentPage
        eyebrow="Legal"
        title="Privacy Policy"
        intro="This page explains what information Billiard Today collects, why we collect it, and how we handle it when people browse public pages, use player profiles, access the admin tools, or operate venue screens."
        updatedAt="2026-04-15"
        sections={[
          {
            title: "What we collect",
            paragraphs: [
              "We may process profile details, tournament data, match results, screen identifiers, contact information, device metadata, and routine technical logs needed to keep the platform secure and operational.",
              "Some information comes directly from users, while other information is supplied by clubs, federations, tournament organizers, or trusted integrations connected to the platform.",
            ],
          },
          {
            title: "Why we use the data",
            paragraphs: [
              "We use the data to publish competition pages, manage scoreboards, operate admin tools, support player account features, respond to support requests, and improve service reliability.",
              "We also use limited technical information for fraud prevention, debugging, abuse monitoring, and uptime monitoring.",
            ],
          },
          {
            title: "Sharing and visibility",
            paragraphs: [
              "Public tournament, ranking, club, federation, and player information may be visible on the website by design. Private account or operational data is only shared when required to deliver the service or when an organizer has legitimate access to it.",
              "We do not sell personal data. We may use infrastructure, analytics, email, or hosting providers that process information on our behalf under service agreements.",
            ],
          },
          {
            title: "Retention and protection",
            paragraphs: [
              "We keep operational data for as long as it is needed for tournament history, account security, legal obligations, or legitimate business continuity. Retention periods may differ depending on the type of record.",
              "We use administrative, technical, and access-control measures to reduce unauthorized access, accidental loss, or misuse of data.",
            ],
          },
          {
            title: "Your choices",
            paragraphs: [
              "If you need a correction, removal request, or clarification about personal information connected to your account or player profile, contact us through the support details available on the platform.",
              "If a federation or organizer submitted the data, we may coordinate with that source before applying changes to public records or historical results.",
            ],
          },
        ]}
      />
    </AppSiteShell>
  );
}
