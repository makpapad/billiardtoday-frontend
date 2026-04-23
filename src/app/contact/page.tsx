import { AppSiteShell } from "@/components/site/AppSiteShell";
import { ContactPageClient } from "@/app/contact/ContactPageClient";

export default async function ContactPage() {
  return (
    <AppSiteShell>
      <ContactPageClient />
    </AppSiteShell>
  );
}
