import Image from "next/image";
import { CEB_SUSPENSION_LEGEND, cebRankingPageTitle, formatCebDate, type CebPdfCategory } from "@/lib/cebRanking";
import { withCebAttribution } from "@/lib/embedLinks";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebPdfSourceLink } from "@/components/public/CebPdfSourceLink";

type Props = {
  category: CebPdfCategory;
  /** In an embed (a third-party site's iframe): links point to the `/embed` path, with UTM + GA4 for the CEB. */
  embedded?: boolean;
  /** GA4 campaign for the links that leave the embed. */
  campaign?: string;
};

const CEB_LOGO = "https://cdn.billiardtoday.com/uploads/CEB_150_fa0cdec244.png";
const FRAME_CLASS = "block h-[70vh] min-h-[600px] w-full sm:h-[85vh] sm:min-h-[900px]";

/**
 * A CEB category page that serves the OFFICIAL PDF sheet (pdf-mode) inside our own
 * layout — same look as the built rankings (hero, white rounded cards). One shared
 * component for the public page and the embed; the category and every value come from
 * `public/data/ceb-ranking/pdf-sources.json`, so every future category is pure data,
 * with no new code.
 */
export function CebPdfRankingContent({ category, embedded = false, campaign = "ceb-ranking" }: Props) {
  const lastUpdate = formatCebDate(category.lastUpdate);
  const allRankingsHref = embedded ? "/embed/rankings/ceb" : "/rankings/ceb";
  const officialHref = embedded ? withCebAttribution(category.pdfUrl, campaign) : category.pdfUrl;

  const meta: string[] = [
    `Edition ${category.editionLabel}${lastUpdate ? ` · last update ${lastUpdate}` : ""}`,
    category.rows && category.rows > 0
      ? `${category.rows} entries on the sheet`
      : "Official CEB sheet, shown as published",
  ];
  if (category.lastUpdateNote) meta.push(`CEB note: ${category.lastUpdateNote}`);

  return (
    <>
      <PresentationHero
        eyebrow={`CEB Official Ranking · ${category.discipline} · ${category.categoryLabel}`}
        title={cebRankingPageTitle(category.title)}
        description="The official CEB ranking sheet for this category, shown here exactly as the CEB publishes it while the full data version is being prepared."
        actions={[
          { label: "Jump to the sheet ↓", href: "#sheet" },
          { label: "All CEB rankings", href: allRankingsHref, variant: "secondary" },
          { label: "Official PDF (CEB)", href: officialHref, variant: "secondary", newTab: true },
        ]}
        asideHeader={
          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
            {embedded ? (
              <a href="/embed/rankings/ceb" className="inline-flex" aria-label="CEB rankings on BilliardToday">
                <Image
                  src={CEB_LOGO}
                  alt="CEB — Confédération Européenne de Billard"
                  width={150}
                  height={147}
                  className="max-h-36 w-auto object-contain"
                  unoptimized
                />
              </a>
            ) : (
              <Image
                src={CEB_LOGO}
                alt="CEB — Confédération Européenne de Billard"
                width={150}
                height={147}
                className="max-h-36 w-auto object-contain"
                unoptimized
              />
            )}
          </div>
        }
        meta={meta}
      />

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Official CEB sheet
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {category.title} — as published by the CEB
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              This page shows the official CEB ranking exactly as the CEB publishes it — the same document,
              rendered in the frame below. The full data version of this list (search, federation filter,
              point breakdown per counting tournament and player links, like our other CEB rankings) is
              being prepared and will replace the sheet here.
            </p>
            <p className="text-[11.5px] leading-5 text-slate-400">
              Source:{" "}
              <CebPdfSourceLink
                href={category.pdfUrl}
                label={category.title}
                campaign={campaign}
                embedded={embedded}
                className="font-semibold text-sky-700 hover:underline"
              >
                CEB — official PDF (edition {category.editionLabel})
              </CebPdfSourceLink>
              . The frame loads our own copy of the file, so nothing else on the page depends on
              eurobillard.org.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 text-sm">
            <span className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-700">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Category
              </span>
              {category.discipline} · {category.categoryLabel}
            </span>
            <span className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-700">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Edition
              </span>
              {category.editionLabel}
              {lastUpdate ? ` · ${lastUpdate}` : ""}
            </span>
          </div>
        </div>
        {category.suspendedNote ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[11.5px] leading-5 text-slate-500">
            {CEB_SUSPENSION_LEGEND}
          </p>
        ) : null}
      </section>

      <section
        id="sheet"
        className="scroll-mt-24 rounded-[32px] border border-black/5 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-1 sm:px-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">The official CEB sheet</h2>
          <CebPdfSourceLink
            href={category.pdfUrl}
            label={category.title}
            campaign={campaign}
            embedded={embedded}
            className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900"
          >
            Open the official CEB PDF
          </CebPdfSourceLink>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
          <object
            data={category.file}
            type="application/pdf"
            className={FRAME_CLASS}
            aria-label={`${category.title} — official CEB ranking sheet (PDF)`}
          >
            <iframe
              src={category.file}
              title={`${category.title} — official CEB ranking sheet (PDF)`}
              className={FRAME_CLASS}
            >
              <p className="p-6 text-sm leading-7 text-slate-600">
                Your browser cannot display the PDF inline.{" "}
                <a
                  href={category.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 underline"
                >
                  Open the official CEB PDF
                </a>
                .
              </p>
            </iframe>
          </object>
        </div>

        <p className="px-3 pt-3 text-[11.5px] leading-5 text-slate-400 sm:px-4">
          The sheet is shown in your browser&apos;s own PDF viewer, straight from the file we keep on
          billiardtoday.com (a same-origin copy of the CEB document).{" "}
          <CebPdfSourceLink
            href={category.pdfUrl}
            label={category.title}
            campaign={campaign}
            embedded={embedded}
            className="font-semibold text-sky-700 hover:underline"
          >
            Open it at eurobillard.org
          </CebPdfSourceLink>
          .
        </p>
      </section>
    </>
  );
}
