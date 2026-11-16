import type { DataSourceCredit as DataSourceCreditValue } from "@/lib/dataSource";
import type { LabelLocale } from "@/lib/teamTournamentLabels";

type Props = {
  source: DataSourceCreditValue | null;
  locale: LabelLocale;
  className?: string;
};

type Copy = {
  title: string;
  body: string;
  sourceLabel: string;
};

const COPY: Record<LabelLocale, Copy> = {
  en: {
    title: "Data & methodology.",
    body:
      "BilliardToday publishes the match data only — caroms, innings, high runs (HR1 and HR2) and the fixture " +
      "schedule — collected from the official websites of the organising federations once they have been " +
      "announced. Standings, qualification places, averages and every other derived figure are calculated by " +
      "BilliardToday's own engine, in accordance with the official regulations published by each federation. " +
      "Where a figure differs from the organiser's own page, the organiser's official publication prevails.",
    sourceLabel: "Source",
  },
  el: {
    title: "Δεδομένα & μεθοδολογία.",
    body:
      "Το BilliardToday δημοσιεύει μόνο τα δεδομένα των αγώνων — καραμπόλες, στεκιές, σερί (HR1 και HR2) και " +
      "το πρόγραμμα των αγώνων — τα οποία συλλέγει από τους επίσημους ιστότοπους των διοργανωτών, μετά την " +
      "ανακοίνωσή τους. Οι κατατάξεις, οι προκριθέντες, οι μέσοι όροι και κάθε άλλο παράγωγο μέγεθος " +
      "υπολογίζονται από το σύστημα του BilliardToday, σύμφωνα με τους επίσημους κανονισμούς που έχει " +
      "δημοσιεύσει η εκάστοτε ομοσπονδία. Όπου ένα μέγεθος διαφέρει από τη σελίδα του διοργανωτή, " +
      "υπερισχύει η επίσημη δημοσίευσή του.",
    sourceLabel: "Πηγή",
  },
};

/**
 * Μικρή σημείωση μεθοδολογίας κάτω από τα αποτελέσματα ομαδικής διοργάνωσης, πάνω από το SEO block —
 * αριστερά το κείμενο, δεξιά η πηγή (ο επίσημος ιστότοπος της διοργανώτριας ομοσπονδίας), όπως η
 * ένδειξη «Source 3Cushion.gr» στη σελίδα των Masters.
 */
export function TeamTournamentDataNote({ source, locale, className }: Props) {
  const copy = COPY[locale] ?? COPY.en;

  return (
    <div
      className={[
        "flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-8",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="max-w-3xl text-[11px] leading-5 text-slate-500">
        <span className="font-semibold uppercase tracking-[0.14em] text-slate-600">{copy.title}</span>{" "}
        {copy.body}
      </p>
      {source ? (
        <p className="shrink-0 text-[11px] leading-5 text-slate-500 sm:text-right">
          {copy.sourceLabel}{" "}
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-sky-700"
          >
            {source.label}
          </a>
        </p>
      ) : null}
    </div>
  );
}
