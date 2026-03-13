import Link from "next/link";
import { PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { PublicClubCard } from "@/lib/publicSiteData";

type Props = {
  clubs: PublicClubCard[];
};

export function ClubsPageContent({ clubs }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Clubs"
        title="Club pages built from structured Strapi data"
        description="Each club page can evolve into a branded public hub with tournaments, player cards, embeds, and local federation context."
        actions={[{ label: "Explore federations", href: "/federations", variant: "secondary" }]}
        meta={[
          `${clubs.length} clubs available in the public directory`,
          "Designed for club pages, tournament visibility, and future embeds",
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Directory"
          title="Club listing"
          description="A curated listing is more useful here than a generic page builder. Each club opens a dedicated public page."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <Link
              key={club.documentId}
              href={club.href}
              className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{club.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{club.city || "Club venue"}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {club.playerCount} players
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Federation</div>
                  <div className="mt-2 font-semibold text-slate-900">{club.federationName || "Independent"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Tournaments</div>
                  <div className="mt-2 font-semibold text-slate-900">{club.tournamentCount}</div>
                </div>
              </div>
              {club.address ? <div className="mt-4 text-sm text-slate-600">{club.address}</div> : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
