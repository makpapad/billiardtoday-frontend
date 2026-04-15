import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { getCmsPageWidth } from "@/lib/cms/layout";
import type { CmsAppearance } from "@/lib/cms/types";

type Props = {
  appearance: CmsAppearance;
  children: ReactNode;
};

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
      <div className="border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[var(--bt-page-width)] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          {[
            { href: "/embed/tournaments", label: "Tournaments" },
            { href: "/embed/federations", label: "Federations" },
            { href: "/embed/clubs", label: "Clubs" },
            { href: "/embed/rankings", label: "Rankings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
