import Link from "next/link";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { requireFederationByDocumentId } from "@/lib/directory";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FederationPage({ params }: Props) {
  const { id } = await params;
  const [settings, appearance, federation] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    requireFederationByDocumentId(id),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <section className="px-4 py-12 sm:px-6 sm:py-16">
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

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Affiliated clubs</h2>
            {federation.clubs && federation.clubs.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {federation.clubs.map((club) => (
                  <Link
                    key={club.documentId}
                    href={`/clubs/${club.slug}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {club.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No clubs linked to this federation yet.</p>
            )}
            {federation.clubs && federation.clubs.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {federation.clubs.map((club) => (
                  <Link
                    key={`${club.documentId}-live`}
                    href={`/live/${club.documentId}`}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Live: {club.name}
                  </Link>
                ))}
              </div>
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
        federationId={federation.documentId}
      />
    </CmsPageShell>
  );
}
