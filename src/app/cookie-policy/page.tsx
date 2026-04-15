import type { Metadata } from "next";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { DocumentPage } from "@/components/site/DocumentPage";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Billiard Today uses cookies and similar browser storage.",
};

export default async function CookiePolicyPage() {
  return (
    <AppSiteShell>
      <DocumentPage
        eyebrow="Legal"
        title="Cookie Policy"
        intro="Billiard Today uses cookies and similar storage technologies to keep the site working correctly, remember useful preferences, and understand how public and authenticated areas are performing."
        updatedAt="2026-04-15"
        sections={[
          {
            title: "Essential cookies",
            paragraphs: [
              "Some cookies are required for sign-in flows, account sessions, security checks, and core navigation behavior. Without them, parts of the platform may not function correctly.",
              "These cookies may also help us protect admin pages, player account areas, and screen-control workflows against misuse.",
            ],
          },
          {
            title: "Preference cookies",
            paragraphs: [
              "We may store simple preferences such as language choices, interface settings, or device-related state so the platform feels consistent when you return.",
              "These cookies are used to improve usability rather than to identify you across unrelated services.",
            ],
          },
          {
            title: "Analytics and diagnostics",
            paragraphs: [
              "We may use limited analytics or performance measurements to understand page reliability, feature usage, or technical issues. This helps us improve load times, stability, and support workflows.",
              "Whenever possible, we prefer practical operational measurements over unnecessary tracking.",
            ],
          },
          {
            title: "How to control cookies",
            paragraphs: [
              "Most browsers allow you to block, delete, or restrict cookies from their settings. If you disable all cookies, sign-in and account-related features may stop working correctly.",
              "You can also clear stored site data on your device if you want to reset saved preferences or session state.",
            ],
          },
          {
            title: "Updates",
            paragraphs: [
              "We may revise this policy when platform features, hosting providers, or legal requirements change. The latest version published on this page is the one that applies.",
            ],
          },
        ]}
      />
    </AppSiteShell>
  );
}
