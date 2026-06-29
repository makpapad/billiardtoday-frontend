import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getClubs } from "@/lib/directory";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Live",
  description: "Open live billiard scoreboard hubs and follow active or pending club sessions in real time.",
  path: "/live",
});

export default async function LivePage() {
  const [settings, appearance, clubs] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getClubs(),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Live</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Live scoreboard hubs
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Open any club to watch active or pending scoreboard sessions in real time.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map((club) => (
              <article
                key={club.documentId}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="text-xl font-semibold tracking-tight text-slate-950">{club.name}</div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {club.federation?.name ? <div>Federation: {club.federation.name}</div> : null}
                  {club.city ? <div>City: {club.city}</div> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/live/${club.documentId}`}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open live
                  </Link>
                  <Link
                    href={`/embed/live/${club.documentId}`}
                    className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Embed
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </CmsPageShell>
  );
}
