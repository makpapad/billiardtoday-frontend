import { RemoteScoreboardHome } from "@/components/live/RemoteScoreboardHome";

// Ζωντανά δεδομένα σε κάθε αίτημα — δεν επιτρέπεται στατικό HTML.
export const dynamic = "force-dynamic";

export default function RemoteScoreboardHomePage() {
  return <RemoteScoreboardHome />;
}
