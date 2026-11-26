import type { CSSProperties, ReactNode } from "react";
import { getCmsPageWidth } from "@/lib/cms/layout";
import type { CmsAppearance } from "@/lib/cms/types";

type Props = {
  appearance: CmsAppearance;
  children: ReactNode;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export function EmbedPageFrame({ appearance, children }: Props) {
  return (
    <div
      className="min-h-screen"
      style={
        {
          ["--bt-page-width" as string]: getCmsPageWidth(appearance),
          background: "#ffffff",
          color: appearance.tokens.text,
          fontFamily: appearance.tokens.bodyFont,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
