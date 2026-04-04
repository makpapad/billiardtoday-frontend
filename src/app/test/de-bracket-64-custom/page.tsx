import CustomFlowchartClient from "./CustomFlowchartClient";
import { resolveTournamentEventSummary } from "@/lib/tournaments";

const PRODUCTION_TOURNAMENT_SLUG = "dev-de64-test-2026-04-02-2026";

export default async function TestDoubleEliminationBracket64CustomPage() {
  const summary = await resolveTournamentEventSummary(PRODUCTION_TOURNAMENT_SLUG).catch(
    () => null,
  );

  return (
    <CustomFlowchartClient
      eventDocumentId={summary?.documentId ?? null}
      tournamentSlug={PRODUCTION_TOURNAMENT_SLUG}
      tournamentTitle={summary?.title ?? "dev-de64-test-2026-04-02-2026"}
    />
  );
}
