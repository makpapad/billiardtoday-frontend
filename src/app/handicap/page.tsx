import type { Metadata } from "next";
import { HandicapToolContent } from "@/components/public/HandicapToolContent";

export const metadata: Metadata = {
  title: "3-Cushion Handicap Tool",
  description: "Personal 3-cushion handicap calculator based on recorded player statistics.",
};

export default function HandicapPage() {
  return <HandicapToolContent />;
}
