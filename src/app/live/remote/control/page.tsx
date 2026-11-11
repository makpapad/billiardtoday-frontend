import { RemoteScoreboardControl } from "@/components/live/RemoteScoreboardControl";

// Ζωντανά δεδομένα σε κάθε αίτημα — δεν επιτρέπεται στατικό HTML.
export const dynamic = "force-dynamic";

export default function RemoteScoreboardControlPage() {
  return <RemoteScoreboardControl />;
}
