import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { FederationSubmitForm } from "./FederationSubmitForm";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "New national ranking submission — federation",
    description:
      "Submit the finishing positions of your national championship for the CEB ranking.",
    path: "/federation/submit",
  }),
  robots: { index: false, follow: false },
};

export default function FederationSubmitPage() {
  return (
    <div className="fedmock-page">
      <FederationSubmitForm />
    </div>
  );
}
