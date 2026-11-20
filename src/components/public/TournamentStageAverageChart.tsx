import type { TournamentStageTotal } from "@/lib/tournamentSeoServer";
import { stageShortLabel, stageSortRank } from "@/lib/stageLabels";

/**
 * Μέσος όρος ανά φάση (καραμπόλες ÷ στεκιές) για τη σελίδα διοργάνωσης.
 *
 * SERVER COMPONENT, ΧΩΡΙΣ JAVASCRIPT: οι μπάρες είναι απλά divs με ύψος σε % και ο
 * πίνακας κανονικό <table>. Δεν μπαίνει recharts εδώ — το `ResponsiveContainer`
 * μετράει DOM, άρα στο πρώτο HTML θα έβγαινε κενό κουτί και ο crawler δεν θα έβλεπε
 * τίποτα. Έτσι οι τιμές υπάρχουν ως κείμενο στο HTML (και στο RSC payload).
 *
 * ΠΟΥ ΖΕΙ: έξω από το ανοιγόμενο «Tournament Overview» (prop `stageChart` του
 * TournamentDetailPage), γιατί γράφημα που χρειάζεται κλικ για να φανεί δεν το
 * βλέπει κανείς.
 *
 * ΕΜΦΑΝΙΖΕΤΑΙ ΜΟΝΟ ΜΕ ≥3 ΦΑΣΕΙΣ ΜΕ ΑΠΟΤΕΛΕΣΜΑΤΑ: με μία-δύο φάσεις το γράφημα δεν
 * δείχνει τίποτα που να μη λέει ήδη η τελική κατάταξη.
 *
 * Ο Μ.Ο. ΕΙΝΑΙ ΣΥΝΟΛΙΚΟΣ ΤΗΣ ΦΑΣΗΣ, όχι μέσος όρος των Μ.Ο. των αθλητών: αλλιώς
 * ένας αθλητής με 3 στεκιές θα ζύγιζε όσο ένας με 30. Ίδιος υπολογισμός με το
 * `/api/stats/tournament-comparison` (stage average).
 */

type Row = {
  key: string;
  label: string;
  title: string;
  caroms: number;
  innings: number;
  average: number;
  diffPct: number | null;
};

const buildRows = (stages: TournamentStageTotal[]): Row[] => {
  const played = stages
    .filter((stage) => stage.innings > 0 && stage.caroms > 0)
    .sort(
      (a, b) =>
        (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
        stageSortRank(stageShortLabel(a.title)) - stageSortRank(stageShortLabel(b.title)),
    );

  return played.map((stage, index) => {
    const average = stage.caroms / stage.innings;
    const previous = index > 0 ? played[index - 1] : null;
    const previousAverage = previous ? previous.caroms / previous.innings : null;
    return {
      key: stage.key,
      label: stageShortLabel(stage.title, index),
      title: stage.title,
      caroms: stage.caroms,
      innings: stage.innings,
      average,
      diffPct:
        previousAverage && previousAverage > 0
          ? ((average - previousAverage) / previousAverage) * 100
          : null,
    };
  });
};

const formatAverage = (value: number) => value.toFixed(3);

const formatDiff = (value: number | null) => {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const diffTone = (value: number | null) => {
  if (value === null) return "text-slate-400 dark:text-slate-500";
  if (value > 0) return "text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "text-rose-700 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
};

export function TournamentStageAverageChart({
  stages,
  title,
}: {
  stages: TournamentStageTotal[];
  title: string;
}) {
  const rows = buildRows(stages);
  if (rows.length < 3) return null;

  const maxAverage = Math.max(...rows.map((row) => row.average));
  const best = rows.reduce((top, row) => (row.average > top.average ? row : top), rows[0]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Average per stage
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            Carom average, stage by stage
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Total caroms ÷ total innings of every published match in the stage — {title}.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Best</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">
            {best.label} · {formatAverage(best.average)}
          </div>
        </div>
      </div>

      {/* Μπάρες: καθαρό HTML/CSS, χωρίς JS. Οι τιμές υπάρχουν και στον πίνακα από κάτω,
          γι' αυτό το γράφημα είναι aria-hidden για τους screen readers. */}
      <div aria-hidden="true" className="mt-6 flex items-end gap-1 sm:gap-3">
        {rows.map((row) => {
          const heightPct = Math.max(6, (row.average / maxAverage) * 92);
          return (
            <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center">
              {/* Η τιμή κάθεται ΑΚΡΙΒΩΣ πάνω από την κορυφή της μπάρας (όχι σε κοινή
                  γραμμή στην κορυφή), όπως στο γράφημα αναφοράς. */}
              <div className="relative flex h-28 w-full items-end border-b border-slate-200 sm:h-40">
                <div
                  className="relative w-full rounded-t bg-gradient-to-t from-sky-300 to-sky-600 dark:from-sky-500 dark:to-sky-300"
                  style={{ height: `${heightPct}%` }}
                >
                  <span
                    className="absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200 sm:text-xs"
                    style={{ bottom: `calc(100% + 4px)` }}
                  >
                    {formatAverage(row.average)}
                  </span>
                </div>
              </div>
              <div
                className="mt-2 w-full break-words text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600 dark:text-slate-300 sm:text-[11px]"
                title={row.title}
              >
                {row.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Χωρίς min-w: πέντε στήλες με σύντομους τίτλους χωρούν και σε 360px — στο
          κινητό δεν θέλουμε οριζόντιο scroll. */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums sm:text-sm">
          <thead>
            <tr className="text-left uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2 font-normal" title="Stage">Stage</th>
              <th className="py-2 pr-2 text-right font-normal" title="Caroms scored in the stage">Caroms</th>
              <th className="py-2 pr-2 text-right font-normal" title="Innings played in the stage">Inn</th>
              <th className="py-2 pr-2 text-right font-normal" title="Caroms ÷ innings">Avg</th>
              <th className="py-2 text-right font-normal" title="Change versus the previous stage">Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 pr-2 font-medium text-slate-900 dark:text-white" title={row.title}>
                  {row.label}
                </td>
                <td className="py-2 pr-2 text-right text-slate-600 dark:text-slate-300">{row.caroms}</td>
                <td className="py-2 pr-2 text-right text-slate-600 dark:text-slate-300">{row.innings}</td>
                <td className="py-2 pr-2 text-right font-semibold text-slate-900 dark:text-white">
                  {formatAverage(row.average)}
                </td>
                <td className={`py-2 text-right font-semibold ${diffTone(row.diffPct)}`}>
                  {formatDiff(row.diffPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}