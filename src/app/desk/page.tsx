import type { Metadata } from "next";
import DeskShell from "./DeskShell";

export const metadata: Metadata = {
  title: "Event Desk",
  description: "Χειριστήριο τραπεζιών για διοργανώσεις μπιλιάρδου.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DeskPage() {
  return <DeskShell />;
}
