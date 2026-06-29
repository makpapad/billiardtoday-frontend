import type { Metadata } from "next";
import { HandicapToolContent } from "@/components/public/HandicapToolContent";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Head 2 Head Predictions",
  description: "3-cushion head-to-head match prediction based on recorded player statistics.",
  path: "/handicap",
});

export default function HandicapPage() {
  return <HandicapToolContent />;
}
