import Link from "next/link";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { requireClubBySlug } from "@/lib/directory";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EmbedClubPage({ params }: Props) {
  const { slug } = await params;
  const [settings, appearance, club] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    requireClubBySlug(slug),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance} showChrome={false}>
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Club
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {club.name}
            </h1>
            <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              {club.federation?.name ? <div>Federation: {club.federation.name}</div> : null}
              {club.city ? <div>City: {club.city}</div> : null}
              {club.contactEmail ? <div>Email: {club.contactEmail}</div> : null}
              {club.contactPhone ? <div>Phone: {club.contactPhone}</div> : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/embed/live/${club.documentId}`}
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open live embed
              </Link>
            </div>
          </div>
        </div>
      </section>

      <TournamentListSection
        section={{
          __component: "cms.tournament-list-section",
          title: "Club tournaments",
          subtitle: `All tournaments belonging to ${club.name}.`,
          layout: "table",
          itemsPerPage: 10,
          showSeasonFilter: true,
          showDate: true,
          showStatus: true,
          showResultsLink: true,
          emptyStateText: "No tournaments found for this club.",
        }}
        appearance={appearance}
        embedded
        clubSlug={club.slug}
      />
    </CmsPageShell>
  );
}
