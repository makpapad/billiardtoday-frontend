import type { Metadata } from "next";
import Image from "next/image";
import { PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import { EmbedSourceBar } from "@/components/embed/EmbedSourceBar";
import { formatCebDate } from "@/lib/cebRanking";
import { readCebRankingIndex } from "@/lib/cebRankingData";
import { toEmbedHref } from "@/lib/embedLinks";
import { OfficialCebPdfLink } from "@/components/public/OfficialCebPdfLink";

export const revalidate = 300;

const CEB_RANKINGS_URL = "https://www.eurobillard.org/pages/rankings-42.html";

export const metadata: Metadata = {
  title: "CEB Official Rankings — European Billiards Standings",
  robots: { index: false, follow: false },
};

/**
 * EMBED: ο «κόμβος» των κατατάξεων CEB (/rankings/ceb) χωρίς το chrome του site,
 * έτοιμος για iframe σε ξένο site. Κάθε πλακίδιο κατάταξης ανοίγει το `/embed`
 * μονοπάτι της, ώστε η περιήγηση να μένει μέσα στο iframe.
 */
export default function EmbedCebRankingsPage() {
  const index = readCebRankingIndex();
  const available = index?.available ?? [];
  const upcoming = index?.upcoming ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <PresentationHero
        eyebrow="Rankings · CEB"
        title="CEB official rankings"
        description="The official ranking lists of the Confédération Européenne de Billard, published here with the points of every counting tournament and a direct link to each event page."
        actions={[
          { label: "CEB rankings (eurobillard.org)", href: index?.sourcePage ?? CEB_RANKINGS_URL, variant: "secondary", newTab: true },
        ]}
        asideHeader={
          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
            <a
              href="/embed/rankings/ceb"
              className="inline-flex"
              aria-label="CEB rankings on BilliardToday"
            >
              <Image
                src="https://cdn.billiardtoday.com/uploads/CEB_150_fa0cdec244.png"
                alt="CEB — Confédération Européenne de Billard"
                width={150}
                height={147}
                className="max-h-36 w-auto object-contain"
                unoptimized
              />
            </a>
          </div>
        }
        meta={[
          available.length === 1
            ? "1 CEB list published"
            : `${available.length} CEB lists published`,
          `${upcoming.length} more CEB lists are being added`,
        ]}
      />

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <SectionHeading
          eyebrow="Published"
          title="CEB ranking lists available now"
          description="Each list keeps the official column layout so the numbers match the published PDF one by one."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {available.map((entry) => {
            const isPdf = entry.mode === "pdf";
            return (
              <a
                key={entry.slug}
                href={toEmbedHref(entry.href)}
                className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {entry.discipline} · {entry.categoryLabel}
                  </div>
                  {isPdf ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700"
                      title="Official CEB sheet (PDF) — the full data version is being prepared"
                    >
                      PDF
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {entry.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Edition {entry.edition}
                  {entry.updatedAt ? ` · updated ${formatCebDate(entry.updatedAt)}` : ""} ·{" "}
                  {isPdf
                    ? "official CEB sheet (PDF)"
                    : `${(entry.players ?? 0).toLocaleString("en-US")} players · ${entry.federations ?? 0} federations`}
                </p>
                <div className="mt-5 text-sm font-semibold text-sky-700">
                  {isPdf ? "Open the sheet →" : "Open ranking →"}
                </div>
              </a>
            );
          })}
        </div>

        {available.length === 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            The first CEB ranking list is being prepared.
          </div>
        ) : null}
      </section>

      {upcoming.length > 0 ? (
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <SectionHeading
            eyebrow="Coming next"
            title="The rest of the CEB ranking lists"
            description="The remaining CEB lists of this season are added here one by one, in the same format."
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((entry) => (
              <li
                key={entry.title}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600"
              >
                <span className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  <span className="font-medium text-slate-800">{entry.title}</span>
                </span>
                {entry.pdfUrl ? (
                  <OfficialCebPdfLink
                    href={entry.pdfUrl}
                    label={entry.title}
                    campaign="ceb-ranking-embed"
                    className="ml-[18px] inline-flex w-fit items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EmbedSourceBar href="/rankings/ceb" />
    </div>
  );
}
