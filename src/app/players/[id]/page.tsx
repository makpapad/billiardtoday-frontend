import { PlayerBackButton } from "./PlayerBackButton";
import PlayerProfileClient from "./PlayerProfileClient";
import { PlayerInstantSummary } from "./PlayerInstantSummary";
import { CebPlayerRankingCard } from "@/components/public/CebPlayerRankingCard";
import { UmbPlayerRankingCard } from "@/components/public/UmbPlayerRankingCard";
import { PlayerArchiveSection } from "@/components/public/PlayerArchiveSection";
import { readCebPlayerRankings } from "@/lib/cebRankingData";
import { readUmbPlayerRanking } from "@/lib/umbRankingData";
import { getPlayerHistoryForServer } from "@/lib/playerHistoryServer";
import { getPublicPlayerProfileSummary } from "@/lib/publicSiteData";
import { SITE_URL, toAbsoluteUrl } from "@/lib/socialMetadata";

type Props = {
  params: Promise<{ id: string }>;
};

const buildPlayerStructuredData = (
  summary: Awaited<ReturnType<typeof getPublicPlayerProfileSummary>>,
) => {
  if (!summary) return null;
  const primaryStats = summary.primaryGameStats;
  const pageUrl = `${SITE_URL}${summary.href}`;
  const additionalProperty = primaryStats
    ? [
        {
          "@type": "PropertyValue",
          name: `${primaryStats.label} recorded matches`,
          value: primaryStats.totalMatches,
        },
        primaryStats.avgPerInning
          ? {
              "@type": "PropertyValue",
              name: `${primaryStats.label} average per inning`,
              value: primaryStats.avgPerInning.toFixed(3),
            }
          : null,
        primaryStats.highestRun
          ? {
              "@type": "PropertyValue",
              name: `${primaryStats.label} high run`,
              value: primaryStats.highestRun,
            }
          : null,
      ].filter(Boolean)
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${summary.seoName} billiard player profile`,
    url: pageUrl,
    mainEntity: {
      "@type": "Person",
      name: summary.seoName,
      alternateName: summary.fullName !== summary.seoName ? summary.fullName : undefined,
      nationality: summary.country || undefined,
      image: toAbsoluteUrl(summary.photoUrl) || undefined,
      url: pageUrl,
      // Ο σύλλογος/ομάδα του αθλητή: πραγματικό, ήδη δημόσιο δεδομένο (όχι προσωπικά στοιχεία).
      memberOf:
        summary.clubName && summary.clubSlug
          ? {
              "@type": "SportsOrganization",
              name: summary.clubName,
              url: `${SITE_URL}/clubs/${summary.clubSlug}`,
            }
          : undefined,
      knowsAbout: [
        "Billiards",
        "Carom billiards",
        primaryStats?.label,
        ...summary.otherGameLabels,
      ].filter(Boolean),
      additionalProperty,
    },
  };
};

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const summary = await getPublicPlayerProfileSummary(id);
  const structuredData = buildPlayerStructuredData(summary);
  // Μία κάρτα CEB ανά λίστα στην οποία ο παίκτης εμφανίζεται (π.χ. Individual + Ladies),
  // με τα δικά της counting tournaments κάθε λίστας. Μετά, η UMB κάρτα παραμένει ως έχει.
  const cebRankings = await readCebPlayerRankings(id);
  const umbRanking = readUmbPlayerRanking(id);
  // Server-rendered αρχείο αγώνων: το ιστορικό φόρτωνε μόνο client-side, άρα το
  // HTML είχε ~1.500 χαρακτήρες και τίποτα από αγώνες/αντιπάλους/σκορ.
  const history = await getPlayerHistoryForServer(id, 25);

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      ) : null}
      {summary ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pt-8 dark:from-gray-900 dark:to-gray-800">
          <div className="mx-auto max-w-6xl">
            <PlayerBackButton />
          </div>
        </div>
      ) : null}
      {summary ? <PlayerInstantSummary summary={summary} /> : null}
      {cebRankings.map((cebRanking) => (
        <CebPlayerRankingCard
          key={cebRanking.rankingSlug}
          ranking={cebRanking}
          playerLabel={summary?.seoName ?? null}
        />
      ))}
      {umbRanking ? (
        <UmbPlayerRankingCard ranking={umbRanking} playerLabel={summary?.seoName ?? null} />
      ) : null}
      {history && history.items.length > 0 ? (
        <PlayerArchiveSection
          items={history.items}
          totalCount={history.totalCount}
          playerLabel={summary?.seoName ?? "Player"}
        />
      ) : null}
      <PlayerProfileClient hasServerSummary={Boolean(summary)} />
    </>
  );
}
