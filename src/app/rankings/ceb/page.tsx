import type { Metadata } from "next";
import Link from "next/link";
import { PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { formatCebDate } from "@/lib/cebRanking";
import { readCebRankingIndex } from "@/lib/cebRankingData";

export const revalidate = 300;

const CEB_RANKINGS_URL = "https://www.eurobillard.org/pages/rankings-42.html";

export const metadata: Metadata = buildPageMetadata({
  title: "CEB Official Rankings — European Billiards Standings",
  description:
    "The official ranking lists of the Confédération Européenne de Billard (CEB) on BilliardToday: 3-cushion individual and ladies, national teams, artistic, cadre, 1-cushion and youth circuits — each with the point breakdown of every counting tournament.",
  path: "/rankings/ceb",
  keywords: [
    "CEB rankings",
    "European billiards rankings",
    "eurobillard rankings",
    "3 cushion European ranking",
    "billiard national teams ranking",
    "carom rankings",
  ],
});

export default function CebRankingsPage() {
  const index = readCebRankingIndex();
  const available = index?.available ?? [];
  const upcoming = index?.upcoming ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <PresentationHero
        eyebrow="Rankings · CEB"
        title="CEB official rankings"
        description="The official ranking lists of the Confédération Européenne de Billard, published here with the points of every counting tournament and a direct link to each event page."
        actions={[
          { label: "CEB rankings (eurobillard.org)", href: index?.sourcePage ?? CEB_RANKINGS_URL, variant: "secondary", newTab: true },
        ]}
        meta={[
          available.length === 1
            ? "1 CEB list published"
            : `${available.length} CEB lists published`,
          `${upcoming.length} more CEB lists are being added`,
          "Only tournaments held in Europe count towards the CEB lists",
        ]}
      />

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <SectionHeading
          eyebrow="Published"
          title="CEB ranking lists available now"
          description="Each list keeps the official column layout so the numbers match the published PDF one by one."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {available.map((entry) => (
            <Link
              key={entry.slug}
              href={entry.href}
              className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                {entry.discipline} · {entry.categoryLabel}
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {entry.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Edition {entry.edition}
                {entry.updatedAt ? ` · updated ${formatCebDate(entry.updatedAt)}` : ""} ·{" "}
                {entry.players.toLocaleString("en-US")} players · {entry.federations} federations
              </p>
              <div className="mt-5 text-sm font-semibold text-sky-700">Open ranking</div>
            </Link>
          ))}
        </div>

        {available.length === 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            The first CEB ranking list is being prepared.
          </div>
        ) : null}
      </section>

      {upcoming.length > 0 ? (
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <SectionHeading
            eyebrow="Coming next"
            title="The rest of the CEB ranking lists"
            description="The remaining CEB lists of this season are added here one by one, in the same format."
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((entry) => (
              <li
                key={entry.title}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <span className="font-medium text-slate-800">{entry.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
