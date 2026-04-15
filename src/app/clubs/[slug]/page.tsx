import { redirect } from "next/navigation";
import Link from "next/link";
import { CountryFlag, PresentationHero } from "@/components/public/PresentationBlocks";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireClubByIdentifier } from "@/lib/directory";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ClubPage({ params }: Props) {
  const { slug } = await params;
  const [appearance, club] = await Promise.all([getCmsAppearance(), requireClubByIdentifier(slug)]);

  if (slug !== club.slug) {
    redirect(`/clubs/${club.slug}`);
  }

  return (
    <>
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <PresentationHero
            eyebrow={club.federation?.name || "Club"}
            title={club.name}
            description={
              club.city || club.country || club.federation?.name
                ? `Public club page for ${club.city ? `${club.city}${club.country ? `, ${club.country}` : ""}` : club.country || "the local venue"}${club.federation?.name ? `, connected to ${club.federation.name}.` : "."}`
                : "Public club page for local visibility, live sessions, tournaments, and player discovery."
            }
            actions={[
              { label: "Open live hub", href: `/live/${club.documentId}` },
              { label: "Embed live", href: `/embed/live/${club.documentId}`, variant: "secondary" },
            ]}
            meta={[]}
            aside={
              <div className="grid gap-4">
                <div className="flex min-h-[180px] items-center gap-5 rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/15 bg-slate-950/30 text-3xl font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {club.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.charAt(0).toUpperCase())
                      .join("")}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                      Club Profile
                    </div>
                    <div className="text-2xl font-semibold text-white">
                      {club.city || club.country || "Billiard Venue"}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/75">
                      {club.country ? (
                        <span className="inline-flex items-center gap-2">
                          <CountryFlag country={club.country} className="h-4 w-6 rounded-sm object-cover" />
                          <span>{club.country}</span>
                        </span>
                      ) : null}
                      {club.federation?.name ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1">
                          {club.federation.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-center backdrop-blur-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">City</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {club.city || "Pending"}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-center backdrop-blur-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Federation</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {club.federation?.name || "Independent"}
                    </div>
                  </div>
                </div>
                {(club.contactEmail || club.contactPhone || club.address) ? (
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-sm text-white/78 backdrop-blur-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Contact</div>
                    <div className="mt-3 space-y-2">
                      {club.address ? <div>{club.address}</div> : null}
                      {club.contactEmail ? <div>{club.contactEmail}</div> : null}
                      {club.contactPhone ? <div>{club.contactPhone}</div> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            }
          />
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
        clubSlug={club.slug}
      />
    </>
  );
}
