import Link from "next/link";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { PublicFederationCard } from "@/lib/publicSiteData";

type Props = {
  federations: PublicFederationCard[];
};

export function FederationsPageContent({ federations }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Federations"
        title="Federation public pages with club context"
        description="Federation pages should feel like editorial hubs, not generic CMS records. This is the first public slice of that model."
        actions={[{ label: "Browse clubs", href: "/clubs", variant: "secondary" }]}
        meta={[`${federations.length} federations available`, "Ready for future federation-specific tournament filters"]}
      />
      <section>
        <SectionHeading eyebrow="Directory" title="Federation listing" description="Each federation page can anchor clubs, calendars, and branded embeds later." />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {federations.map((federation) => (
            <Link
              key={federation.documentId}
              href={federation.href}
              className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200"
            >
              <div className="flex items-center gap-3">
                <CountryFlag country={federation.country} className="h-5 w-7 rounded object-cover" />
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{federation.country}</div>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{federation.name}</h2>
              {federation.level ? (
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {federation.level}
                </div>
              ) : null}
              {federation.parentName ? (
                <div className="mt-2 text-sm text-slate-500">Parent: {federation.parentName}</div>
              ) : null}
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Connected clubs</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{federation.clubCount}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
