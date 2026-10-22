import Link from "next/link";
import { SectionHeading } from "@/components/public/PresentationBlocks";
import type { RankingSeriesIndexItem } from "@/lib/rankings";

/**
 * Οι σειρές κατάταξης που ανήκουν σε μια ομοσπονδία — κάθε κάρτα ανοίγει τη
 * δημόσια σελίδα της κατάταξης (`/rankings/<slug>`). Μόνο το τμήμα· τον χώρο
 * τον δίνει η καρτέλα που το φιλοξενεί.
 */

type Props = {
  federationName: string;
  series: RankingSeriesIndexItem[];
  embedded?: boolean;
};

const countLabel = (value: number, singular: string) =>
  `${value.toLocaleString("en-US")} ${value === 1 ? singular : `${singular}s`}`;

export function FederationRankingsSection({ federationName, series, embedded = false }: Props) {
  const base = embedded ? "/embed" : "";

  return (
    <section>
      <SectionHeading
        eyebrow="Rankings"
        title={`${federationName} rankings`}
        description="Official ranking lists and circuit standings published by this federation."
      />
      {series.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {series.map((item) => (
            <Link
              key={item.documentId || item.slug}
              href={`${base}/rankings/${item.slug}`}
              className="flex flex-col gap-3 rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                {item.season ? `Season ${item.season}` : "Ranking"}
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <div className="text-sm text-slate-500">
                {countLabel(item.tournamentsCount ?? 0, "counting tournament")}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No ranking lists published for this federation yet.
        </div>
      )}
    </section>
  );
}
