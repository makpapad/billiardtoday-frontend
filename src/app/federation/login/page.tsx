import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { FederationSignIn } from "./FederationSignIn";

// Ζωντανά δεδομένα σε κάθε αίτημα — δεν επιτρέπεται στατικό HTML.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Federation sign in — national ranking submission",
    description:
      "Sign in to submit the finishing positions of your national championship so BilliardToday can turn them into CEB ranking points.",
    path: "/federation/login",
  }),
  robots: { index: false, follow: false },
};

export default function FederationLoginPage() {
  return (
    <div className="fedmock-page">
      <FederationSignIn />
    </div>
  );
}
