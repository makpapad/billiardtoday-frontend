import { AppSiteShell } from "@/components/site/AppSiteShell";

export default async function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
