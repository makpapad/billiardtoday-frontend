import { redirect } from "next/navigation";
import Link from "next/link";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireFederationByIdentifier } from "@/lib/directory";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmbedFederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([
    getCmsAppearance(),
    requireFederationByIdentifier(id),
  ]);

  if (id !== federation.slug) {
    redirect(`/embed/federations/${federation.slug}`);
  }

  return (
    <>
      <section className="px-4 py-8 sm:px-6 sm:py-10">
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

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              {federation.level === "national" ? "Clubs" : "Federations"}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {federation.level === "national" ? "Affiliated clubs" : "Child federations"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {federation.level === "national"
                ? `Only national federations connect directly to clubs.`
                : `Confederations and world federations connect to federations, not directly to clubs.`}
            </p>

            {federation.level === "national" ? (
              Array.isArray(federation.clubs) && federation.clubs.length > 0 ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {federation.clubs.map((club) => (
                    <Link
                      key={club.documentId}
                      href={`/embed/clubs/${club.slug}`}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-white"
                    >
                      <div className="text-lg font-semibold tracking-tight text-slate-950">{club.name}</div>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        {club.city ? <div>City: {club.city}</div> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No clubs connected to this federation yet.
                </div>
              )
            ) : Array.isArray(federation.children) && federation.children.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {federation.children.map((child) => (
                  <Link
                    key={child.documentId}
                    href={`/embed/federations/${child.slug || child.documentId}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-white"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                      {child.level || "federation"}
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{child.name}</div>
                    <div className="mt-2 text-sm text-slate-600">{child.country || "Country pending"}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No child federations connected to this organizer yet.
              </div>
            )}
          </div>
        </div>
      </section>

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
        embedded
        federationId={federation.documentId}
      />
    </>
  );
}
