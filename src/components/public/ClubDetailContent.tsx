import Link from "next/link";
import { PresentationHero, SectionHeading, CountryFlag } from "@/components/public/PresentationBlocks";
import type { PublicClubDetail } from "@/lib/publicSiteData";

type Props = {
  club: PublicClubDetail;
  embedded?: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" });
};

export function ClubDetailContent({ club, embedded = false }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow={club.federationName || "Club"}
        title={club.name}
        description="Club public pages can anchor local tournament visibility, player discovery, and future iframe modules."
        actions={
          embedded
            ? [{ label: "Open full club page", href: club.href, variant: "secondary" }]
            : [{ label: "Open embed page", href: `/embed${club.href}`, variant: "secondary" }]
        }
        meta={[
          club.city || "Club venue",
          `${club.playerCount} connected players`,
          `${club.tournamentCount} connected tournaments`,
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <SectionHeading eyebrow="Players" title="Player cards" description="The player grid is the first step toward richer club presentation pages." />
          <div className="grid gap-4 md:grid-cols-2">
            {club.players.length > 0 ? (
              club.players.map((player) => (
                <Link
                  key={player.documentId}
                  href={`${embedded ? "/embed" : ""}${player.href}`}
                  className="flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_14px_45px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                >
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.fullNameEn || player.fullName} className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-600">
                      {(player.fullNameEn || player.fullName).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-950">{player.fullNameEn || player.fullName}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <CountryFlag country={player.country} />
                      <span>{player.country || player.city || "Profile"}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No players connected to this club yet.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Schedule" title="Club tournaments" description="Tournament links now resolve to the new public tournament presentation route." />
          <div className="space-y-4">
            {club.tournaments.length > 0 ? (
              club.tournaments.map((tournament) => (
                <div key={tournament.documentId} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">{tournament.title}</div>
                      <div className="mt-2 text-sm text-slate-500">{formatDate(tournament.startDate)}</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {tournament.status || "scheduled"}
                    </div>
                  </div>
                  {tournament.gameType ? <div className="mt-3 text-sm text-slate-600">{tournament.gameType}</div> : null}
                  {tournament.href ? (
                    <Link
                      href={`${embedded ? "/embed" : ""}${tournament.href.replace(/^\/embed/, "")}`}
                      className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open tournament page
                    </Link>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No tournaments connected to this club yet.
              </div>
            )}

            {(club.address || club.contactEmail || club.contactPhone) ? (
              <div className="rounded-[24px] border border-black/5 bg-slate-950 p-6 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</div>
                <div className="mt-4 space-y-2 text-sm">
                  {club.address ? <div>{club.address}</div> : null}
                  {club.contactEmail ? <div>{club.contactEmail}</div> : null}
                  {club.contactPhone ? <div>{club.contactPhone}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
