import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebEditionStrip } from "@/components/public/CebEditionStrip";
import { CebRankingContent } from "@/components/public/CebRankingContent";
import { CebPdfRankingContent } from "@/components/public/CebPdfRankingContent";
import { EmbedSourceBar } from "@/components/embed/EmbedSourceBar";
import { CEB_RANKING_PAGE_SIZE, cebRankingHref, formatCebDate } from "@/lib/cebRanking";
import {
  readCebPdfCategory,
  readCebPlayerLinks,
  readCebRanking,
  readCebRankingArchive,
} from "@/lib/cebRankingData";
import { toEmbedHref } from "@/lib/embedLinks";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const payload = readCebRanking(slug);
  const pdfCategory = payload ? null : readCebPdfCategory(slug);
  return {
    title: payload
      ? `${payload.title} — CEB Ranking`
      : pdfCategory
        ? `${pdfCategory.title} — CEB Ranking`
        : "CEB Ranking",
    robots: { index: false, follow: false },
  };
}

/**
 * EMBED: η τρέχουσα κατάταξη CEB (/rankings/ceb/<slug>) χωρίς το chrome του site.
 * Δέχεται και τις κατηγορίες pdf-mode (π.χ. 3c-ladies): όταν δεν υπάρχει πίνακας
 * δεδομένων αλλά υπάρχει εγγραφή στο `pdf-sources.json`, δείχνει το επίσημο φύλλο
 * της CEB στο ίδιο layout — ίδιο περιεχόμενο με τη δημόσια σελίδα, χωρίς chrome.
 */
export default async function EmbedCebRankingPage({ params }: Props) {
  const { slug } = await params;

  const payload = readCebRanking(slug);
  if (!payload) {
    const pdfCategory = readCebPdfCategory(slug);
    if (pdfCategory) {
      return (
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
          <CebPdfRankingContent
            category={pdfCategory}
            embedded
            campaign={`ceb-ranking-${slug}`}
          />
          <EmbedSourceBar href={cebRankingHref(slug)} campaign={`ceb-ranking-${slug}`} />
        </div>
      );
    }
    notFound();
  }

  const playerLinks = readCebPlayerLinks(payload.links ?? "official");
  const archive = readCebRankingArchive(slug);

  const { counts } = payload;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <PresentationHero
        eyebrow="CEB Official Ranking · Individual"
        title={`${payload.title} — European Ranking`}
        description="The official CEB ranking list with the point breakdown of every counting tournament. Each tournament column links to the event page on BilliardToday."
        actions={[
          { label: "Jump to the list ↓", href: "#list" },
          { label: "All CEB rankings", href: "/embed/rankings/ceb", variant: "secondary" },
          { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
        ]}
        asideHeader={
          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
            <a
              href={toEmbedHref(`/rankings/ceb/${slug}`)}
              className="inline-flex"
              aria-label={`${payload.title} on BilliardToday`}
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
          `Edition ${payload.edition} · last update ${formatCebDate(payload.updatedAt) ?? "—"}`,
          `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
        ]}
      />

      <CebEditionStrip
        slug={slug}
        editions={archive?.editions ?? []}
        currentEdition={payload.edition}
        embedded
      />

      <CebRankingContent
        payload={payload}
        pageSize={CEB_RANKING_PAGE_SIZE}
        playerLinks={playerLinks}
        downloadHref={`/api/rankings/ceb/pdf?slug=${slug}`}
        embedded
        campaign={`ceb-ranking-${slug}`}
      />

      <EmbedSourceBar href={`/rankings/ceb/${slug}`} campaign={`ceb-ranking-${slug}`} />
    </div>
  );
}
