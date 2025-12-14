import Link from "next/link";

import type { WordpressNavMenuItem } from "@/lib/wordpress";
import { tWp } from "./wpI18n";

export function WpNavigation({
  items,
}: {
  items: WordpressNavMenuItem[];
}) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#1e293b] bg-[#0a0e1a]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d9ff]">
            <div className="h-6 w-6 rounded-full border-2 border-white" />
          </div>
          <span className="text-xl tracking-tight text-white">{tWp("nav.brand")}</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {items.map((item) => {
            const content = tWp(item.labelKey);
            if (item.href.startsWith("/")) {
              return (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  className="text-[#94a3b8] transition-colors hover:text-white"
                >
                  {content}
                </Link>
              );
            }

            return (
              <a
                key={item.labelKey}
                href={item.href}
                className="text-[#94a3b8] transition-colors hover:text-white"
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noreferrer" : undefined}
              >
                {content}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
