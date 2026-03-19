import type { ReactNode } from "react";
import { EmbedPageFrame } from "@/components/embed/EmbedPageFrame";
import { getCmsAppearance } from "@/lib/cms/strapi";

export default async function EmbedFederationsLayout({ children }: { children: ReactNode }) {
  const appearance = await getCmsAppearance();

  return (
    <EmbedPageFrame appearance={appearance}>
      {children}
    </EmbedPageFrame>
  );
}
