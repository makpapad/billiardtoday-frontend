import { redirect } from "next/navigation";

// Ζωντανά δεδομένα σε κάθε αίτημα — δεν επιτρέπεται στατικό HTML.
export const dynamic = "force-dynamic";

export default function FederationIndexPage() {
  redirect("/federation/submit");
}
