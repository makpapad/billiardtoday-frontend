import { AppSiteShell } from "@/components/site/AppSiteShell";
import { AccountSessionProvider } from "@/components/account/AccountSessionProvider";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSiteShell>
      <AccountSessionProvider>{children}</AccountSessionProvider>
    </AppSiteShell>
  );
}
