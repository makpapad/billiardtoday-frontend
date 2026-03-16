import { AppSiteShell } from "@/components/site/AppSiteShell";

export default async function EnrollLayout({ children }: { children: React.ReactNode }) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
