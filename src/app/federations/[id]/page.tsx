import { redirect } from "next/navigation";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireFederationByIdentifier } from "@/lib/directory";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([getCmsAppearance(), requireFederationByIdentifier(id)]);

  if (id !== federation.slug) {
    redirect(`/federations/${federation.slug}`);
  }

  return (
    <>
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Organizer
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {federation.name}
            </h1>
            {federation.country ? (
              <p className="mt-4 text-lg text-slate-600">Country: {federation.country}</p>
            ) : null}
            {federation.level ? (
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-slate-500">
                Level: {federation.level}
              </p>
            ) : null}
            {federation.parent?.name ? (
              <p className="mt-2 text-sm text-slate-500">Parent federation: {federation.parent.name}</p>
            ) : null}
          </div>

        </div>
      </section>

      <FederationDetailContent federation={federation as never} />

      <TournamentListSection
        section={{
          __component: "cms.tournament-list-section",
          title: "Organizer tournaments",
          subtitle: `All tournaments organized by ${federation.name} with link to clubs and Venues.`,
          layout: "table",
          itemsPerPage: 10,
          showSeasonFilter: true,
          showDate: true,
          showStatus: true,
          showResultsLink: true,
          emptyStateText: "No tournaments found for this organizer.",
        }}
        appearance={appearance}
        federationId={federation.documentId}
      />
    </>
  );
}
