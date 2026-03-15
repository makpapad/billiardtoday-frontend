import Link from "next/link";
import type { LandingFooterContent } from "@/components/landing/content";

export function Footer({ content }: { content: LandingFooterContent }) {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <img
            src="/img/billiard-today-logo.png"
            alt={`${content.siteName} logo`}
            className="h-11 w-auto object-contain"
          />
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">{content.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {content.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
