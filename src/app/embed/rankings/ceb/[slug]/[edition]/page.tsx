import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebEditionStrip } from "@/components/public/CebEditionStrip";
import { CebRankingContent } from "@/components/public/CebRankingContent";
import { EmbedSourceBar } from "@/components/embed/EmbedSourceBar";
import {
  CEB_RANKING_PAGE_SIZE,
  cebEditionHref,
  cebEditionKey,
  cebRankingHref,
  formatCebDate,
} from "@/lib/cebRanking";
import {
  readCebPlayerLinks,
  readCebRanking,
  readCebRankingArchive,
  readCebRankingEdition,
} from "@/lib/cebRankingData";
import { SITE_URL } from "@/lib/socialMetadata";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string; edition: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, edition } = await params;
  const payload = readCebRankingEdition(slug, edition);
  return {
    title: payload
      ? `${payload.title} — CEB Ranking — Edition ${payload.edition}`
      : "CEB ranking edition",
    robots: { index: false, follow: false },
  };
}

/**
 * EMBED: μια αρχειοθετημένη έκδοση της κατάταξης CEB
 * (/rankings/ceb/<slug>/<edition>) χωρίς το chrome του site. Ίδιο περιεχόμενο με
 * την κανονική σελίδα έκδοσης (hero + ειδοποίηση αρχείου + λωρίδα εκδόσεων +
 * πίνακας), με τους συνδέσμους προς billiardtoday.com να ανοίγουν σε νέα καρτέλα.
 */
export default async function EmbedCebRankingEditionPage({ params }: Props) {
  const { slug, edition } = await params;

  const payload = readCebRankingEdition(slug, edition);
  if (!payload) notFound();

  const current = readCebRanking(slug);
  const archive = readCebRankingArchive(slug);
  const playerLinks = readCebPlayerLinks(payload.links ?? "official");

  const isCurrent = current?.edition === payload.edition;
  const updated = formatCebDate(payload.updatedAt);
  const { counts } = payload;
  const editionKey = cebEditionKey(payload.edition);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <PresentationHero
        eyebrow={`CEB Official Ranking · Individual · Edition ${payload.edition}`}
        title={`${payload.title} — Edition ${payload.edition}`}
        description={
          isCurrent
            ? "This is the edition the CEB publishes right now, kept here unchanged as an archived copy with the point breakdown of every counting tournament."
            : "The list exactly as the CEB published it, with the point breakdown of every counting tournament of that edition. Kept online after the next edition arrived."
        }
        actions={[
          { label: "Current CEB list →", href: `${SITE_URL}${cebRankingHref(slug)}`, newTab: true },
          { label: "All CEB rankings", href: `${SITE_URL}/rankings/ceb`, variant: "secondary", newTab: true },
          { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
        ]}
        asideHeader={
          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
            <a
              href={`${SITE_URL}${cebEditionHref(slug, editionKey)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
              aria-label={`${payload.title} edition ${payload.edition} on BilliardToday`}
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
          `Edition ${payload.edition} · last update ${updated ?? "—"}`,
          `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
        ]}
      />

      <section className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-6 py-5 text-sm leading-7 text-amber-900">
        {isCurrent ? (
          <>
            <span className="font-semibold">Archived copy of the current edition.</span> The ranking the
            CEB publishes today is edition {payload.edition}
            {updated ? ` (last update ${updated})` : ""} —{" "}
            <a
              href={`${SITE_URL}${cebRankingHref(slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              open the current list
            </a>
            . When the CEB publishes the next edition, this page keeps today&apos;s numbers.
          </>
        ) : (
          <>
            <span className="font-semibold">Archived edition — {payload.edition}</span>
            {updated ? `, last updated ${updated}` : ""}. This is not the list the CEB publishes today:{" "}
            <a
              href={`${SITE_URL}${cebRankingHref(slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              open the current edition{current ? ` (${current.edition})` : ""}
            </a>
            .
          </>
        )}
      </section>

      <CebEditionStrip
        slug={slug}
        editions={archive?.editions ?? []}
        currentEdition={current?.edition ?? null}
        viewingKey={editionKey}
        embedded
      />

      <CebRankingContent
        payload={payload}
        pageSize={CEB_RANKING_PAGE_SIZE}
        playerLinks={playerLinks}
        downloadHref={`/api/rankings/ceb/pdf?slug=${slug}&edition=${editionKey}`}
        embedded
      />

      <EmbedSourceBar href={`/rankings/ceb/${slug}/${editionKey}`} />
    </div>
  );
}
