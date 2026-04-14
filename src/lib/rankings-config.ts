export type RankingSeriesTournamentConfig = {
  key: string;
  label: string;
  tournamentSlug: string;
};

export type RankingSeriesConfig = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  federationSlug: string;
  tournaments: RankingSeriesTournamentConfig[];
};

export const RANKING_SERIES_CONFIGS: RankingSeriesConfig[] = [
  {
    slug: "longoni-next-gen-grand-prix-3-cushion-u21",
    title: "LONGONI NEXT GEN Grand Prix 3-Cushion U21",
    shortTitle: "Longoni Next Gen U21",
    description:
      "Seasonal CEB youth ranking for the Longoni Next Gen 3-Cushion U21 circuit, aggregated from the linked Grand Prix tournaments.",
    federationSlug: "ceb",
    tournaments: [
      {
        key: "gp1",
        label: "1st GP",
        tournamentSlug: "longoni-nextgen-grand-prix-3-cushion-u21-2025",
      },
      {
        key: "gp2",
        label: "2nd GP",
        tournamentSlug: "longoni-next-gen-grand-prix-3-cushion-u21-2026",
      },
    ],
  },
];

export const getRankingSeriesConfigBySlug = (slug: string) =>
  RANKING_SERIES_CONFIGS.find((item) => item.slug === slug) ?? null;
