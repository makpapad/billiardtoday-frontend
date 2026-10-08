import type { ReactNode } from "react";
import Image from "next/image";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebEditionStrip } from "@/components/public/CebEditionStrip";
import { CebRankingContent } from "@/components/public/CebRankingContent";
import {
  CEB_RANKING_PAGE_SIZE,
  cebCategoryShortLabel,
  formatCebDate,
} from "@/lib/cebRanking";
import type {
  CebPlayerLinks,
  CebRankingArchive,
  CebRankingPayload,
} from "@/lib/cebRanking";
import { toEmbedHref } from "@/lib/embedLinks";
import { SITE_URL } from "@/lib/socialMetadata";

type Props = {
  payload: CebRankingPayload;
  /** Το slug της κατηγορίας — κρατά τους συνδέσμους (editions, download, embed) σωστούς. */
  slug: string;
  playerLinks?: CebPlayerLinks;
  archive?: CebRankingArchive | null;
  /** Σε embed (iframe σε ξένο site): λίνκ προς `/embed`, λογότυπο-σύνδεσμος, χωρίς chrome. */
  embedded?: boolean;
  /** GA4 campaign για τα λινκ που βγαίνουν από το embed. */
  campaign?: string;
  /** Περιγραφή για το JSON-LD ItemList (συνήθως ίδια με το <meta description> της σελίδας). */
  itemListDescription?: string | null;
  /** Προαιρετικό περιεχόμενο στο τέλος (π.χ. το EmbedSourceBar του embed). */
  footer?: ReactNode;
};

/**
 * Η σελίδα μιας ΚΑΤΗΓΟΡΙΑΣ CEB που σερβίρεται ως πίνακας δεδομένων (data category).
 *
 * Είναι ο ΕΝΑΣ τρόπος απόδοσης: την χρησιμοποιούν η στατική σελίδα
 * `/rankings/ceb/3c-individual` και η δυναμική `/rankings/ceb/[slug]` (και οι δύο
 * embed εκδοχές τους), ώστε κάθε κατηγορία που αποκτά JSON να δείχνει ΑΚΡΙΒΩΣ την
 * ίδια σελίδα με το Individual — hero, edition strip και τον κοινό πίνακα
 * `CebRankingContent` — χωρίς διπλό render. Server component.
 */
export function CebRankingCategoryView({
  payload,
  slug,
  playerLinks,
  archive,
  embedded = false,
  campaign = "ceb-ranking",
  itemListDescription,
  footer,
}: Props) {
  const { counts } = payload;
  const allRankingsHref = embedded ? "/embed/rankings/ceb" : "/rankings/ceb";

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `CEB ${payload.title} Ranking — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/ceb/${slug}`,
    description:
      itemListDescription ??
      `The official CEB ${payload.title} ranking — edition ${payload.edition}, with the point breakdown of every counting tournament.`,
    numberOfItems: counts.players,
    itemListElement: payload.rows.slice(0, 100).map((row) => ({
      "@type": "ListItem",
      position: row.rank,
      name: `${row.name} (${row.fed}) — ${row.points} pts`,
    })),
  };

  const logo = (
    <Image
      src="https://cdn.billiardtoday.com/uploads/CEB_150_fa0cdec244.png"
      alt="CEB — Confédération Européenne de Billard"
      width={150}
      height={147}
      className="max-h-36 w-auto object-contain"
      unoptimized
    />
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
        <PresentationHero
          eyebrow={`CEB Official Ranking · ${cebCategoryShortLabel(payload)}`}
          title={`${payload.title} — European Ranking`}
          description="The official CEB ranking list with the point breakdown of every counting tournament. Each tournament column links to the event page on BilliardToday."
          actions={[
            { label: "Jump to the list ↓", href: "#list" },
            { label: "All CEB rankings", href: allRankingsHref, variant: "secondary" },
            { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
          ]}
          asideHeader={
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
              {embedded ? (
                <a
                  href={toEmbedHref(`/rankings/ceb/${slug}`)}
                  className="inline-flex"
                  aria-label={`${payload.title} on BilliardToday`}
                >
                  {logo}
                </a>
              ) : (
                logo
              )}
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
          embedded={embedded}
        />

        <CebRankingContent
          payload={payload}
          pageSize={CEB_RANKING_PAGE_SIZE}
          playerLinks={playerLinks}
          downloadHref={`/api/rankings/ceb/pdf?slug=${slug}`}
          embedded={embedded}
          campaign={campaign}
        />

        {footer}
      </div>
    </>
  );
}
