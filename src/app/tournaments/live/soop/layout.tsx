import { AppSiteShell } from "@/components/site/AppSiteShell";

// Client page με `useSearchParams()` — χωρίς αυτό το build σκάει στο prerender.
export const dynamic = "force-dynamic";

export default function SoopLiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
