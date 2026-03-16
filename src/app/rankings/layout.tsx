import { AppSiteShell } from "@/components/site/AppSiteShell";

export default async function RankingsLayout({ children }: { children: React.ReactNode }) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
