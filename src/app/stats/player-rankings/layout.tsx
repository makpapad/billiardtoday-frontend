import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Player Lab",
  description: "Explore billiard player rankings by highest run, average, wins, losses, and tournament participation.",
  path: "/stats/player-rankings",
});

export default function PlayerRankingsLayout({ children }: { children: ReactNode }) {
  return children;
}
