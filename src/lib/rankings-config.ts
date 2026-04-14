export type RankingSeriesTournamentConfig = {
  key: string;
  label: string;
  tournamentSlug?: string;
  fallbackTitle?: string;
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
      "Seasonal CEB youth ranking for the Longoni Next Gen 3-Cushion U21 circuit, aggregated from the two Grand Prix tournaments and the EC U21 event.",
    federationSlug: "ceb",
    tournaments: [
      {
        key: "gp1",
        label: "1st GP",
        tournamentSlug: "4f2cd729-df19-4927-8c05-089da6692964",
        fallbackTitle: "LONGONI NEXTGEN Grand Prix 3-Cushion U21",
      },
      {
        key: "gp2",
        label: "2nd GP",
        tournamentSlug: "v8nc64onx1l242seiui2wjng",
        fallbackTitle: "LONGONI NEXT GEN Grand Prix 3-Cushion U21",
      },
      {
        key: "ec",
        label: "EC U21",
        fallbackTitle: "European Championship 3-Cushion U21",
      },
    ],
  },
];

export const getRankingSeriesConfigBySlug = (slug: string) =>
  RANKING_SERIES_CONFIGS.find((item) => item.slug === slug) ?? null;
