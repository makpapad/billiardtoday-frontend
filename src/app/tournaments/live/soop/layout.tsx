import { AppSiteShell } from "@/components/site/AppSiteShell";

export default function SoopLiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppSiteShell>{children}</AppSiteShell>;
}
