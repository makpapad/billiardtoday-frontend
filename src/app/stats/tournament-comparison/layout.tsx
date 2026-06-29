import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Tournament Comparison",
  description: "Compare billiard tournament series by stage average, best average, highest run, and match volume.",
  path: "/stats/tournament-comparison",
});

export default function TournamentComparisonLayout({ children }: { children: ReactNode }) {
  return children;
}
