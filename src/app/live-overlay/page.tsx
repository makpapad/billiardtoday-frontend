import type { Metadata } from "next";
import LiveOverlayPage, { type LiveOverlaySearchParams } from "@/components/live/LiveOverlayPage";

type LiveOverlayPublicPageProps = {
  searchParams?: Promise<LiveOverlaySearchParams>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live Overlay | BilliardToday",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LiveOverlayPublicPage({ searchParams }: LiveOverlayPublicPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <LiveOverlayPage
      params={params}
      title="Live overlay"
      description="Live video with BilliardToday scoreboard overlay."
      examplesBasePath="/live-overlay"
    />
  );
}
