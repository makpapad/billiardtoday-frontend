import Link from "next/link";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { PublicFederationDetail } from "@/lib/publicSiteData";

type Props = {
  federation: PublicFederationDetail;
  embedded?: boolean;
};

export function FederationDetailContent({ federation, embedded = false }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Federation"
        title={federation.name}
        description="Federation pages will eventually drive federation-scoped tournament, club, and embed experiences. This baseline already resolves the organization graph from Strapi."
        actions={
          embedded
            ? [{ label: "Open full federation page", href: federation.href, variant: "secondary" }]
            : [{ label: "Open embed page", href: `/embed${federation.href}`, variant: "secondary" }]
        }
        meta={[
          federation.country || "Country",
          federation.level === "national"
            ? `${federation.clubCount} connected clubs`
            : `${federation.federationCount} connected federations`,
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-black/5 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Level</div>
          <div className="mt-2 text-base font-semibold text-slate-950">{federation.level || "n/a"}</div>
        </div>
        <div className="rounded-[22px] border border-black/5 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Parent</div>
          <div className="mt-2 text-base font-semibold text-slate-950">{federation.parentName || "No parent"}</div>
        </div>
        <div className="rounded-[22px] border border-black/5 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ownership</div>
          <div className="mt-2 text-base font-semibold text-slate-950">Own tournaments only</div>
        </div>
      </div>

      {federation.level === "national" ? (
        <section>
          <SectionHeading
            eyebrow="Club network"
            title="Federation clubs"
            description="Only national federations list their affiliated clubs."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {federation.clubs.length > 0 ? (
              federation.clubs.map((club) => (
                <Link
                  key={club.documentId}
                  href={`${embedded ? "/embed" : ""}${club.href}`}
                  className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                >
                  <div className="flex items-center gap-3">
                    <CountryFlag country={federation.country} />
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{federation.country}</div>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{club.name}</h3>
                  <div className="mt-2 text-sm text-slate-500">{club.city || club.address || "Club venue"}</div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Players</div>
                      <div className="mt-2 font-semibold text-slate-950">{club.playerCount}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Tournaments</div>
                      <div className="mt-2 font-semibold text-slate-950">{club.tournamentCount}</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No clubs connected to this federation yet.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section>
          <SectionHeading
            eyebrow="Federation network"
            title="Child federations"
            description="World federations and confederations connect to federations, not directly to clubs."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {federation.children.length > 0 ? (
              federation.children.map((child) => (
                <Link
                  key={child.documentId}
                  href={`${embedded ? "/embed" : ""}${child.href}`}
                  className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {child.level || "federation"}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{child.name}</h3>
                  <div className="mt-2 text-sm text-slate-500">{child.country || "Country pending"}</div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No child federations connected yet.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
