import Link from "next/link";
import { PresentationHero, SectionHeading, CountryFlag } from "@/components/public/PresentationBlocks";
import type { PublicClubCard, PublicFederationCard, PublicPlayerCard, PublicTournamentEventCard } from "@/lib/publicSiteData";

type Props = {
  tournaments: PublicTournamentEventCard[];
  players: PublicPlayerCard[];
  clubs: PublicClubCard[];
  federations: PublicFederationCard[];
};

const formatDate = (value: string | null) => {
  if (!value) return "Schedule pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" });
};

export function HomeFallbackPage({ tournaments, players, clubs, federations }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Billiard Today"
        title="Public pages for tournaments, players, clubs, and federations"
        description="The public site now renders directly from Strapi-backed data. This fallback home is only shown until a CMS-managed `home` page is published."
        actions={[
          { label: "Browse tournaments", href: "/tournaments" },
          { label: "Explore players", href: "/players", variant: "secondary" },
        ]}
        meta={[
          `${tournaments.length} recent tournaments connected`,
          `${players.length} featured players ready for profile cards`,
          `${clubs.length} clubs and ${federations.length} federations in the public graph`,
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Live archive"
          title="Recent tournament pages"
          description="These pages already use the new public route model and the reusable tournament detail presentation."
          action={{ label: "See all tournaments", href: "/tournaments" }}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {tournaments.map((item) => (
            <Link
              key={item.documentId}
              href={item.href}
              className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                {item.season ? `Season ${item.season}` : "Tournament"}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.tournamentTitle || item.gameType || "Event page"}</p>
              <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                <span>{formatDate(item.startDate)}</span>
                <span className="font-semibold text-slate-700">Open page</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <SectionHeading
            eyebrow="Profiles"
            title="Featured players"
            description="Player cards can now live as a first-class public content type instead of being buried in a generic CMS."
            action={{ label: "All players", href: "/players" }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {players.map((player) => (
              <Link
                key={player.documentId}
                href={player.href}
                className="flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
              >
                {player.photoUrl ? (
                  <img src={player.photoUrl} alt={player.fullNameEn || player.fullName} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-600">
                    {(player.fullNameEn || player.fullName).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-950">{player.fullNameEn || player.fullName}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <CountryFlag country={player.country} />
                    <span>{player.country || player.city || "Player profile"}</span>
                  </div>
                  {player.clubName ? <div className="mt-1 text-sm text-slate-600">{player.clubName}</div> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="Organizations"
            title="Club and federation directories"
            description="These are the next public entities to be fully styled and embeddable."
          />
          <div className="space-y-4">
            {clubs.slice(0, 3).map((club) => (
              <Link
                key={club.documentId}
                href={club.href}
                className="block rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{club.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{club.city || club.federationName || "Club page"}</div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {club.tournamentCount} tournaments
                  </div>
                </div>
              </Link>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              {federations.slice(0, 4).map((federation) => (
                <Link
                  key={federation.documentId}
                  href={federation.href}
                  className="rounded-[22px] border border-black/5 bg-white p-4 text-sm text-slate-700 shadow-[0_12px_36px_rgba(15,23,42,0.04)] transition hover:border-sky-200"
                >
                  <div className="flex items-center gap-2">
                    <CountryFlag country={federation.country} />
                    <span className="font-semibold text-slate-950">{federation.name}</span>
                  </div>
                  <div className="mt-2 text-slate-500">{federation.clubCount} clubs</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
