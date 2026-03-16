import { AppSiteShell } from "@/components/site/AppSiteShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
