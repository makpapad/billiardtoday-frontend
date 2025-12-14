import type { ReactNode } from "react";
import type { WordpressNavMenuItem } from "@/lib/wordpress";
import { WpNavigation } from "./WpNavigation";

export function WpPageTemplate({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems?: WordpressNavMenuItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {navItems && navItems.length > 0 ? <WpNavigation items={navItems} /> : null}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-[#00ff88]/10 blur-3xl" />
          <div className="absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-[#00d9ff]/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/70 via-[#0a0e1a]/90 to-[#0a0e1a]" />
        </div>

        <header className="relative mx-auto max-w-5xl px-6 pt-28 pb-10">
          <h1
            className="text-white drop-shadow-[0_2px_20px_rgba(0,255,136,0.25)]"
            style={{ textShadow: "0 0 60px rgba(0,255,136,0.25), 0 0 30px rgba(0,217,255,0.2)" }}
          >
            {title}
          </h1>
        </header>
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/5 backdrop-blur sm:p-10">
          <div className="prose prose-invert max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
}
