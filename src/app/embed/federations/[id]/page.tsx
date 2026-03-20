import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireFederationByDocumentId } from "@/lib/directory";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmbedFederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([
    getCmsAppearance(),
    requireFederationByDocumentId(id),
  ]);

  return (
    <>
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Federation
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {federation.name}
            </h1>
            {federation.country ? (
              <p className="mt-4 text-lg text-slate-600">Country: {federation.country}</p>
            ) : null}
          </div>

        </div>
      </section>

      <TournamentListSection
        section={{
          __component: "cms.tournament-list-section",
          title: "Federation tournaments",
          subtitle: `All tournaments linked to clubs that belong to ${federation.name}.`,
          layout: "table",
          itemsPerPage: 10,
          showSeasonFilter: true,
          showDate: true,
          showStatus: true,
          showResultsLink: true,
          emptyStateText: "No tournaments found for this federation.",
        }}
        appearance={appearance}
        embedded
        federationId={federation.documentId}
      />
    </>
  );
}
