import type { Metadata } from "next";
import { HandicapToolContent } from "@/components/public/HandicapToolContent";

export const metadata: Metadata = {
  title: "Head 2 Head Predictions",
  description: "3-cushion head-to-head match prediction based on recorded player statistics.",
};

export default function HandicapPage() {
  return <HandicapToolContent />;
}
