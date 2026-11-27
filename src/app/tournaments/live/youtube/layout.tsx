import { AppSiteShell } from "@/components/site/AppSiteShell";

// Client page με `useSearchParams()` — χωρίς αυτό το build σκάει στο prerender.
export const dynamic = "force-dynamic";

export default function YoutubeLiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ο τοίχος βίντεο θέλει όλο το ύψος της οθόνης σε desktop (βλ. AppSiteShell).
  return <AppSiteShell fitViewport>{children}</AppSiteShell>;
}
