import type { Metadata } from "next";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { DocumentPage } from "@/components/site/DocumentPage";

export const metadata: Metadata = {
  title: "Platform Manual",
  description: "Starting point for the Billiard Today admin and scoreboard manuals.",
};

export default async function ManualPage() {
  return (
    <AppSiteShell>
      <DocumentPage
        eyebrow="Documentation"
        title="Platform Manual"
        intro="This page is the public entry point for the Billiard Today operational manuals. It is intended to host step-by-step guidance for administrators, organizers, clubs, and venue staff as the documentation set grows."
        updatedAt="2026-04-15"
        sections={[
          {
            title: "Admin manual",
            paragraphs: [
              "This section is reserved for workflows such as tournament creation, event configuration, seeding, stage management, scoring, ranking publication, federation pages, and operational maintenance.",
              "We will also document the correct order for setup, validation, publishing, and corrections so organizers can work without guessing hidden dependencies.",
            ],
          },
          {
            title: "Scoreboard manual",
            paragraphs: [
              "This section is reserved for venue-side guidance such as screen registration, remote control usage, overlays, playlist behavior, fallback states, and troubleshooting common live-display issues.",
              "It will also cover the practical steps needed to recover from connection loss, stale content, wrong screen mapping, or player-facing display problems.",
            ],
          },
          {
            title: "What will be added next",
            paragraphs: [
              "The next iterations can split this manual into dedicated pages for admin, scoreboard, clubs, and federations, with screenshots, checklists, and short operator runbooks.",
              "For now, this page acts as the stable documentation route that can be linked from the site footer and expanded without changing the public URL structure.",
            ],
          },
        ]}
      />
    </AppSiteShell>
  );
}
