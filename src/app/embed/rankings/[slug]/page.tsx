import { notFound } from "next/navigation";
import { RankingSeriesContent } from "@/app/rankings/[slug]/page";
import { getRankingSeriesData } from "@/lib/rankings";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EmbedRankingSeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getRankingSeriesData(slug);

  if (!data) {
    notFound();
  }

  return <RankingSeriesContent data={data} embedded />;
}
