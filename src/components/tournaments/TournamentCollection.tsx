import Link from "next/link";
import type { TournamentViewMode } from "@/components/tournaments/TournamentViewToggle";

/**
 * Η ΚΟΙΝΗ εμφάνιση των τουρνουά σε όλο το site (CEB, UMB, γενικές σελίδες
 * ομοσπονδιών, clubs, /tournaments). Λίστα και κάρτες είναι το ίδιο markup με
 * τα ίδια πεδία — αλλάζει μόνο η διάταξη.
 */

export type TournamentCollectionItem = {
  key: string;
  title: string;
  /** null = μη ανοίξιμο (π.χ. canOpen === false) — η γραμμή δεν είναι link. */
  href: string | null;
  gameType?: string | null;
  season?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Προϋπολογισμένη ετικέτα κατάστασης (Upcoming / Live / Completed / Scheduled). */
  status?: string | null;
  /** Ξεχωριστός σύνδεσμος («View tournament») όταν ο τίτλος δεν είναι link. */
  resultsHref?: string | null;
  /** Μικρή γκρι σημείωση όταν δεν υπάρχει link (π.χ. «Club tournament»). */
  note?: string | null;
};

export type TournamentCollectionView = TournamentViewMode;

export const TOURNAMENT_DATE_LOCALE = "en-GB";

export function formatTournamentDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(TOURNAMENT_DATE_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const endOfDayTime = (value?: string | null): number | null => {
  if (!value) return null;
  const dateTime = /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
  if (dateTime && !Number.isNaN(dateTime.getTime())) {
    dateTime.setUTCDate(dateTime.getUTCDate() + 1);
  }
  const key = dateTime ? dateTime.toISOString().slice(0, 10) : value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const end = key ? new Date(`${key}T23:59:59.999`) : new Date(value);
  return Number.isNaN(end.getTime()) ? null : end.getTime();
};

export function tournamentStatus(
  startDate?: string | null,
  endDate?: string | null,
): "Upcoming" | "Live" | "Completed" | "Scheduled" {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endOfDayTime(endDate);
  if (start !== null && !Number.isNaN(start) && start > now) return "Upcoming";
  if (end !== null && end < now) return "Completed";
  if (start !== null || end !== null) return "Live";
  return "Scheduled";
}

const dateRangeLabel = (item: TournamentCollectionItem): string | null => {
  const start = formatTournamentDate(item.startDate);
  const end = formatTournamentDate(item.endDate);
  if (start && end && start !== end) return `${start} — ${end}`;
  return start || end || null;
};

const StatusBadge = ({ status }: { status?: string | null }) =>
  status ? (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>
  ) : null;

const ActionLink = ({ href }: { href?: string | null }) =>
  href ? (
    <Link
      href={href}
      className="text-sm font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
    >
      View tournament
    </Link>
  ) : null;

const Note = ({ note }: { note?: string | null }) =>
  note ? <span className="text-sm font-semibold text-slate-500">{note}</span> : null;

function ListRow({ item }: { item: TournamentCollectionItem }) {
  const range = dateRangeLabel(item);
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        {item.gameType ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">{item.gameType}</div>
        ) : null}
        <div className="mt-1 text-[15px] font-semibold text-slate-950">{item.title}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        {item.season ? <span>Season {item.season}</span> : null}
        {range ? <span>{range}</span> : null}
      </div>
      <StatusBadge status={item.status} />
      <ActionLink href={item.resultsHref} />
      <Note note={item.resultsHref ? null : item.note} />
    </>
  );
  const className =
    "flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 transition hover:bg-sky-50/40";

  return (
    <li>
      {item.href ? (
        <Link href={item.href} className={className}>
          {inner}
        </Link>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

function Card({ item }: { item: TournamentCollectionItem }) {
  const range = dateRangeLabel(item);
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          {item.gameType ? (
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{item.gameType}</div>
          ) : null}
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {item.season ? <span>Season {item.season}</span> : null}
        {range ? <span>{range}</span> : null}
        <ActionLink href={item.resultsHref} />
        <Note note={item.resultsHref ? null : item.note} />
      </div>
    </>
  );
  const className =
    "block rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/30";

  return (
    <li className="list-none">
      {item.href ? (
        <Link href={item.href} className={className}>
          {inner}
        </Link>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

type Props = {
  items: TournamentCollectionItem[];
  view: TournamentCollectionView;
  /** Κλάση για το <ul> — οι κάρτες θέλουν grid, η λίστα divide-y. */
  className?: string;
};

export function TournamentCollection({ items, view, className = "" }: Props) {
  if (view === "cards") {
    return (
      <ul className={`grid gap-4 p-0 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
        {items.map((item) => (
          <Card key={item.key} item={item} />
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={`divide-y divide-slate-100 overflow-hidden rounded-[26px] border border-slate-200 bg-white ${className}`}
    >
      {items.map((item) => (
        <ListRow key={item.key} item={item} />
      ))}
    </ul>
  );
}
