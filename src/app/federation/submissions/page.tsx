import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { FederationSubmissions } from "./FederationSubmissions";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "My submissions — federation",
    description: "The national ranking submissions sent by your federation and what happened to them.",
    path: "/federation/submissions",
  }),
  robots: { index: false, follow: false },
};

export default function FederationSubmissionsPage() {
  return (
    <div className="fedmock-page">
      <FederationSubmissions />
    </div>
  );
}
