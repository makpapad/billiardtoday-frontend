import PlayerProfileClient from "./PlayerProfileClient";
import { PlayerInstantSummary } from "./PlayerInstantSummary";
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
      {summary ? <PlayerInstantSummary summary={summary} /> : null}
      <PlayerProfileClient hasServerSummary={Boolean(summary)} />
    </>
  );
}
