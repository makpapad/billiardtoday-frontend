import type { LandingTrustedClubsContent } from "@/components/landing/content";

export function TrustedClubs({ content }: { content: LandingTrustedClubsContent }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {content.eyebrow}
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{content.description}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.clubs.map((club) => (
            <div
              key={club}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-center text-sm font-semibold text-slate-700 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
            >
              {club}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
