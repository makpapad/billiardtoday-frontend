import type { DataSourceCredit as DataSourceCreditValue } from "@/lib/dataSource";

type Props = {
  source: DataSourceCreditValue;
  className?: string;
};

/**
 * Μία μικρή γραμμή πηγής («Source 3Cushion.gr») — μπαίνει ακριβώς κάτω από τα
 * αποτελέσματα και πάνω από το Tournament Overview.
 */
export function DataSourceCredit({ source, className }: Props) {
  return (
    <p
      className={[
        "text-right text-[11px] leading-5 text-slate-500",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      Source{" "}
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-sky-700"
      >
        {source.label}
      </a>
    </p>
  );
}
