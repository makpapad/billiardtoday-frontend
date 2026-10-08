import { SITE_URL } from "@/lib/socialMetadata";

type Props = {
  /**
   * Η διαδρομή προς την κανονική σελίδα στη BilliardToday, π.χ.
   * `/rankings/ceb/3c-individual`. Δέχεται και απόλυτο URL.
   */
  href: string;
  /** Κείμενο του συνδέσμου — προεπιλογή «BilliardToday». */
  label?: string;
};

/**
 * Διακριτική γραμμή «Source: BilliardToday» στο κάτω μέρος μιας embed σελίδας.
 * Server component· ο σύνδεσμος ανοίγει πάντα σε νέα καρτέλα, ώστε ο επισκέπτης
 * του iframe να βγαίνει στην κανονική σελίδα όποτε το θελήσει.
 */
export function EmbedSourceBar({ href, label = "BilliardToday" }: Props) {
  const url = href.startsWith("http") ? href : `${SITE_URL}${href}`;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 px-4 pt-4 text-[11px] text-slate-400">
      <span>Source:</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-sky-700 hover:underline"
      >
        {label}
      </a>
    </div>
  );
}
