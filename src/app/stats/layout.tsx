import { AppSiteShell } from "@/components/site/AppSiteShell";

export default async function StatsLayout({ children }: { children: React.ReactNode }) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
