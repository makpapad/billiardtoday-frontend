import type { Metadata } from "next";

import { buildTournamentShareMetadata, resolveMatchResultVersion } from "@/lib/tournamentShareMetadata";
import { getTournamentEventSummary } from "@/lib/tournaments";

import TournamentEventsPage from "./TournamentEventsContent";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null =>
  typeof params[key] === "string" ? (params[key] as string) : null;

/**
 * Μεταδεδομένα για το `/tournaments/events?eventId=…`.
 *
 * Χωρίς αυτό η σελίδα κληρονομούσε τα γενικά metadata του site, οπότε το share
 * αγώνα/ομίλου έβγαινε στο Facebook με λάθος ή κενή προεπισκόπηση.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const eventId = readParam(params, "eventId");
  const match = readParam(params, "match");
  const group = readParam(params, "group");
  const stage = readParam(params, "stage");

  if (!eventId) {
    return { title: "Tournament events | Billiard Today" };
  }

  const summary = await getTournamentEventSummary(eventId);
  const matchVersion = await resolveMatchResultVersion(eventId, match);
  return buildTournamentShareMetadata(summary, { stage, group, match, matchVersion });
}

export default function Page() {
  return <TournamentEventsPage />;
}
