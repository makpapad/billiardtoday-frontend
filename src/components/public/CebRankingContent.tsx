"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { formatCebDate, normalizeCebSuspension, CEB_SUSPENSION_LEGEND, buildCebPlayerLinkIndex, resolveCebPlayerLink, resolveCebIntro, CEB_POINTS_HEADER } from "@/lib/cebRanking";
import type { CebPlayerLinks, CebRankingPayload, CebRankingRow, CebSuspensionMark } from "@/lib/cebRanking";
import { embedLinkTarget, reportCebEmbedClick, withCebAttribution } from "@/lib/embedLinks";
import { SITE_URL } from "@/lib/socialMetadata";

type Props = {
  payload: CebRankingPayload;
  pageSize: number;
  playerLinks?: CebPlayerLinks;
  /** Σύνδεσμος προς το PDF export ακριβώς αυτής της έκδοσης (χωρίς τιμή = χωρίς κουμπί). */
  downloadHref?: string | null;
  /**
   * Σε embed (iframe σε ξένο site):
   * - οι σύνδεσμοι προς billiardtoday.com (προφίλ παίκτη, σελίδες διοργανώσεων) γίνονται
   *   απόλυτοι και ανοίγουν σε νέα καρτέλα — ο επισκέπτης δεν «φυλακίζεται» στο iframe·
   * - ο πίνακας αποκτά δικό του κάθετο scroll (σταθερό ύψος) ώστε η σελίδα να χωρά σε
   *   iframe σταθερού ύψους χωρίς να κόβεται, και το sticky header «κολλά» στην κορυφή
   *   του scroll container (όχι κάτω από το header του site, που εδώ δεν υπάρχει).
   * - τα λινκ προς κατατάξεις/ομοσπονδίες δείχνουν στο `/embed` μονοπάτι τους (μένουν στο
   *   iframe). Τουρνουά και προφίλ αθλητή ανοίγουν στο billiardtoday.com σε νέα καρτέλα.
   */
  embedded?: boolean;
  /** Όνομα καμπάνιας GA4 για τα λινκ που βγαίνουν από το embed (π.χ. `ceb-ranking-3c-individual`). */
  campaign?: string;
};

/** Compact page list: 1 … 4 5 [6] 7 8 … 42 */
const buildPageList = (page: number, pageCount: number): Array<number | "gap"> => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= 2; offset += 1) {
    if (page - offset > 1) pages.add(page - offset);
    if (page + offset < pageCount) pages.add(page + offset);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
};

const formatScale = (scale: number[]) => scale.join(" / ");

/**
 * Μετάλλια δίπλα στους βαθμούς της διοργάνωσης. Κάθε στήλη πληρώνει με τη δική της
 * κλίμακα (European Championship 80/54/38/26/16/8/4, World Cup 40/27/19/13/8/4/2,
 * εθνικό πρωτάθλημα 40/27/19/13/8/4) και μετάλλιο παίρνουν ΜΟΝΟ οι τρεις πρώτες τιμές:
 * 1η θέση → 🏆, 2η → 🥈, 3η → 🥉. Η τέταρτη τιμή της κλίμακας (26 στο EC, 13 στα
 * World Cup και στα εθνικά — ο δεύτερος χαμένος των ημιτελικών) δεν παίρνει μετάλλιο,
 * όπως ούτε η 5η και κάτω.
 */
const PLACE_MEDALS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "🏆", label: "1st place — gold cup" },
  2: { emoji: "🥈", label: "2nd place — silver medal" },
  3: { emoji: "🥉", label: "3rd place — bronze medal" },
};

const medalForPoints = (scale: number[] | undefined, value: number | null) => {
  if (!scale || value === null || value <= 0) return undefined;
  const place = scale.indexOf(value) + 1; // φθίνουσα κλίμακα: index 0 = 1η θέση
  return PLACE_MEDALS[place];
};

/**
 * Χρώμα γραμμής για αποκλεισμένο αθλητή, όπως στο επίσημο φύλλο της CEB:
 * γκρι = 1 χρόνος, κίτρινο = 3 μήνες. Η γραμμή κρατά το δικό της χρώμα και
 * μένει έξω από το ζέβρωμα των υπόλοιπων γραμμών.
 */
const SUSPENSION_ROW_CLASS: Record<CebSuspensionMark, string> = {
  grey: "bg-slate-200/70 text-slate-600",
  yellow: "bg-yellow-100 text-yellow-900",
};

/** Απόχρωση της ημερομηνίας έναρξης του αποκλεισμού μέσα στη γραμμή. */
const SUSPENSION_DATE_CLASS: Record<CebSuspensionMark, string> = {
  grey: "text-slate-500",
  yellow: "text-amber-700",
};

/**
 * Το `percent` είναι η ΤΕΛΕΥΤΑΙΑ στήλη του επίσημου φύλλου της CEB, αλλά ΔΕΝ είναι
 * πόντοι κατάταξης: το φύλλο την τυπώνει ως «overall percentage» (μόνο EC και CEB
 * Grand-Prix· αλλιώς το ποσοστό του τελευταίου NC). Τη συμπληρώνει χειροκίνητα η
 * επιτροπή artistic, οπότε τη δείχνουμε ΑΥΤΟΛΕΞΕΙ όπως τυπώνεται (3 δεκαδικά),
 * ως ξεχωριστή τελευταία στήλη — χωρίς μετάλλια, χρώματα ή ταξινόμηση πάνω της.
 * Λίστες χωρίς `percent` (όλα τα υπόλοιπα CEB/UMB) δεν αποκτούν στήλη.
 */
type CebRowPercent = { percent?: number | null };
type CebPercentMeta = { percentLabel?: string; percentNote?: string };
const DEFAULT_PERCENT_LABEL = "Avg";
const DEFAULT_PERCENT_NOTE =
  "Overall percentage — only EC and CEB Grand Prix, if not available percentage of the last NC";

/** Η τιμή όπως τυπώνεται στο φύλλο: τρία δεκαδικά, τελεία ως υποδιαστολή· κενό όταν λείπει. */
const formatCebPercent = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "";

export function CebRankingContent({
  payload,
  pageSize,
  playerLinks,
  downloadHref,
  embedded = false,
  campaign = "ceb-ranking",
}: Props) {
  // Το «πίσω» στη σελίδα τουρνουά δείχνει από πού ήρθες (τίτλος = το H1 αυτής της σελίδας).
  const backLabel = `${payload.title} — European Ranking`;
  // Το επεξηγηματικό κείμενο («How this list is built») έρχεται από τα δεδομένα της
  // λίστας — ποτέ καρφωτό κείμενο άλλης κατηγορίας (βλ. resolveCebIntro).
  const intro = useMemo(() => resolveCebIntro(payload), [payload]);
  const pointsHeader = intro.pointsHeader?.length ? intro.pointsHeader : CEB_POINTS_HEADER;
  // Η στήλη του μέσου όρου (βλ. CebRowPercent): εμφανίζεται ΜΟΝΟ όταν η λίστα φέρνει
  // `percent` σε τουλάχιστον μία γραμμή — data-driven, ώστε η επόμενη λίστα που θα το
  // αποκτήσει (π.χ. Artistic national teams) να το πάρει χωρίς αλλαγή κώδικα.
  const percentMeta = payload as CebRankingPayload & CebPercentMeta;
  const hasPercent = payload.rows.some(
    (row) => typeof (row as CebRankingRow & CebRowPercent).percent === "number",
  );
  const percentLabel = percentMeta.percentLabel?.trim() || DEFAULT_PERCENT_LABEL;
  const percentNote = percentMeta.percentNote?.trim() || DEFAULT_PERCENT_NOTE;
  const withBack = (href: string) => `${href}${href.includes("?") ? "&" : "?"}back=${encodeURIComponent(backLabel)}`;
  const [query, setQuery] = useState("");
  const [fed, setFed] = useState("");
  const [showSuspended, setShowSuspended] = useState(true);
  const [page, setPage] = useState(1);

  const federationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of payload.rows) counts.set(row.fed, (counts.get(row.fed) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count, label: payload.federations[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payload]);

  // Πόσες γραμμές έχουν σήμανση αποκλεισμού — μετριούνται από τα δεδομένα, ώστε
  // να δουλεύει και με τις δύο μορφές του `suspended` (string ή αντικείμενο).
  const suspendedCount = useMemo(
    () =>
      payload.rows.reduce(
        (count, row) => (normalizeCebSuspension(row.suspended) ? count + 1 : count),
        0,
      ),
    [payload],
  );

  // Ευρετήριο ταυτότητας: το player-links αρχείο είναι keyed με τη θέση, αλλά η σειρά
  // του αλλάζει μαζί με τη λίστα — ο σύνδεσμος αποδίδεται με ΟΝΟΜΑ, όχι με θέση.
  const linkIndex = useMemo(() => buildCebPlayerLinkIndex(playerLinks), [playerLinks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payload.rows.filter((row) => {
      if (!showSuspended && normalizeCebSuspension(row.suspended)) return false;
      if (fed && row.fed !== fed) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [payload, query, fed, showSuspended]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  // Sticky table header: sticks just below the site header (measured 97px at ≥lg on
  // /rankings/ceb/3c-individual) while the page scrolls. Applied to every <th> so each
  // cell carries its own background + stacking context (rows scroll underneath).
  // The wrapper only drops its scroll container at lg (>=1024px), where the table fits,
  // so horizontal scroll still works on narrow viewports.
  const headCell = embedded
    ? "bg-slate-900 sticky top-0 z-20"
    : "bg-slate-900 lg:sticky lg:top-[97px] lg:z-20";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              How this list is built
            </div>
            <ul className="space-y-3 text-sm leading-7 text-slate-600">
              {intro.items.map((item, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  {item.lead ? (
                    <>
                      <span className="font-semibold text-slate-900">{item.lead}</span>
                      {item.body ? " " : null}
                    </>
                  ) : null}
                  {item.body}
                </li>
              ))}
            </ul>
            {intro.pointsRows.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                  How players earn points
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Finish</th>
                        {pointsHeader.map((head) => (
                          <th key={head} className="px-2 py-2 text-center">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {intro.pointsRows.map((row) => (
                        <tr key={row.label} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{row.label}</td>
                          {row.values.map((points, index) => (
                            <td key={index} className="px-2 py-2 text-center tabular-nums text-slate-600">
                              {points ?? "–"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {intro.pointsNote ? (
                  <p className="text-[11px] leading-5 text-slate-500">{intro.pointsNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Counting tournaments
            </div>
            <ol className="space-y-2">
              {payload.events.map((event) => (
                <li
                  key={event.key}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                    {event.key}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-5 text-slate-900">
                      {event.href ? (
                        embedded ? (
                          <a
                            href={withCebAttribution(embedLinkTarget(withBack(event.href), SITE_URL).href, campaign)}
                            target={embedLinkTarget(withBack(event.href), SITE_URL).newTab ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            onClick={() => reportCebEmbedClick(campaign, "tournament", event.name)}
                            className="hover:text-sky-700 hover:underline"
                          >
                            {event.name}
                          </a>
                        ) : (
                          <Link href={withBack(event.href)} className="hover:text-sky-700 hover:underline">
                            {event.name}
                          </Link>
                        )
                      ) : (
                        event.name
                      )}
                    </div>
                    <div className="text-[11px] leading-5 text-slate-500">
                      {[formatCebDate(event.date), `points ${formatScale(event.scale)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {event.href ? (
                    <span className="ml-auto shrink-0 text-[11px] font-semibold text-sky-700">
                      Results
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="list" className="scroll-mt-24 rounded-[32px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 sm:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Standings</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.players.toLocaleString("en-US")} players ·{" "}
              {payload.counts.federations} federations · column points per counting tournament
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setFilter(() => setQuery(event.target.value))}
              placeholder="Search player name…"
              className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
              aria-label="Search player"
            />
            <select
              value={fed}
              onChange={(event) => setFilter(() => setFed(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
              aria-label="Filter by federation"
            >
              <option value="">All federations ({federationOptions.length})</option>
              {federationOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} — {option.count}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFilter(() => setShowSuspended((value) => !value))}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                showSuspended
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Suspended ({suspendedCount}) {showSuspended ? "shown" : "hidden"}
            </button>
            {downloadHref ? (
              <a
                href={downloadHref}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-700 bg-sky-700 px-4 py-2 text-xs font-semibold text-white transition hover:border-sky-800 hover:bg-sky-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download PDF
              </a>
            ) : null}
          </div>
        </div>

        <div className="px-2 pb-2 pt-5 sm:px-4">
          <div className={embedded ? "max-h-[560px] overflow-auto" : "overflow-x-auto lg:overflow-x-clip"}>
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-right tabular-nums">
              <thead>
                <tr className="bg-slate-900 text-[11px] font-semibold uppercase tracking-wide text-white">
                  <th className={`${headCell} w-10 rounded-tl-xl px-1.5 py-2.5 text-right`}>#</th>
                  <th className={`${headCell} px-2 py-2.5 text-left`}>Player</th>
                  <th className={`${headCell} w-12 px-1.5 py-2.5 text-center`}>Fed</th>
                  <th className={`${headCell} w-12 px-1.5 py-2.5 text-right`}>Pts</th>
                  {payload.events.map((event) => (
                    <th
                      key={event.key}
                      className={`${headCell} min-w-[52px] px-1 py-2.5 text-center align-top last:rounded-tr-xl`}
                      title={`${event.name}${event.date ? ` · ${formatCebDate(event.date)}` : ""} · points ${formatScale(event.scale)}`}
                    >
                      <div className="text-[12px] font-bold uppercase leading-tight text-white/90">{event.key}</div>
                      <div className="text-[9px] font-medium normal-case leading-tight tracking-normal text-white/55">
                        {event.short}
                      </div>
                    </th>
                  ))}
                  {hasPercent ? (
                    <th
                      className={`${headCell} min-w-[56px] rounded-tr-xl px-2 py-2.5 text-right align-top`}
                      title={percentNote}
                    >
                      <div className="text-[12px] font-bold uppercase leading-tight whitespace-nowrap text-white/90">
                        {percentLabel}
                      </div>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, rowIndex) => {
                  const flag = getCountryFlagCdnUrl(payload.federations[row.fed] ?? null, 40);
                  const suspension = normalizeCebSuspension(row.suspended);
                  const suspendedOn = formatCebDate(suspension?.since);
                  const link = resolveCebPlayerLink(row, playerLinks, linkIndex);
                  return (
                    <tr
                      key={`${row.rank}-${row.name}`}
                      data-suspension={suspension ? suspension.mark : undefined}
                      className={
                        suspension
                          ? SUSPENSION_ROW_CLASS[suspension.mark]
                          : `${
                              rowIndex % 2 === 1 ? "bg-blue-100" : "bg-blue-50"
                            } hover:bg-sky-200/60`
                      }
                    >
                      <td className="border-b border-slate-100 px-2 py-1.5 text-[13px] text-slate-400">
                        {row.rank}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-left">
                        <span className="flex items-center gap-2">
                          {flag ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={flag}
                              alt=""
                              width={18}
                              height={13}
                              loading="lazy"
                              className="h-[13px] w-[18px] shrink-0 rounded-[2px] object-cover"
                            />
                          ) : null}
                          {link ? (
                            embedded ? (
                              <a
                                href={withCebAttribution(`${SITE_URL}/players/${link.id}-${link.slug}`, campaign)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => reportCebEmbedClick(campaign, "player", link.db)}
                                title={`${link.db} — player profile`}
                                className="truncate text-[13.5px] font-semibold text-slate-900 underline decoration-slate-300 decoration-dotted underline-offset-2 transition hover:text-blue-700 hover:decoration-blue-400"
                              >
                                {row.name}
                              </a>
                            ) : (
                              <Link
                                href={`/players/${link.id}-${link.slug}`}
                                title={`${link.db} — player profile`}
                                className="truncate text-[13.5px] font-semibold text-slate-900 underline decoration-slate-300 decoration-dotted underline-offset-2 transition hover:text-blue-700 hover:decoration-blue-400"
                              >
                                {row.name}
                              </Link>
                            )
                          ) : (
                            <span className="truncate text-[13.5px] font-semibold text-slate-900">
                              {row.name}
                            </span>
                          )}
                          {suspendedOn ? (
                            <span
                              data-suspension={suspension?.mark}
                              className={`shrink-0 text-[10px] font-semibold tabular-nums ${SUSPENSION_DATE_CLASS[suspension?.mark ?? "grey"]}`}
                              title={
                                suspension?.mark === "yellow"
                                  ? `Suspended for 3 months from ${suspendedOn}${
                                      suspension.until ? ` until ${formatCebDate(suspension.until)}` : ""
                                    }`
                                  : `Suspended for 1 year from ${suspendedOn}${
                                      suspension?.tillFurtherNotice ? " and till further notice" : ""
                                    }`
                              }
                            >
                              {suspendedOn}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-center text-[12px] font-semibold text-slate-500">
                        {row.fed}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-[13.5px] font-bold text-slate-900">
                        {row.points}
                      </td>
                      {row.ev.map((value, index) => {
                        const medal = medalForPoints(payload.events[index]?.scale, value);
                        return (
                          <td
                            key={`${row.rank}-${index}`}
                            className={`border-b border-slate-100 px-1 py-1.5 text-center text-[13px] ${
                              value === null ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span>{value === null ? "–" : value}</span>
                              {medal ? (
                                <span
                                  role="img"
                                  aria-label={medal.label}
                                  title={medal.label}
                                  className="text-[11px] leading-none"
                                >
                                  {medal.emoji}
                                </span>
                              ) : null}
                            </span>
                          </td>
                        );
                      })}
                      {hasPercent ? (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-right text-[13px] tabular-nums text-slate-700">
                          {formatCebPercent((row as CebRankingRow & CebRowPercent).percent)}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {suspendedCount > 0 ? (
          <p
            id="ceb-suspension-legend"
            className="px-6 pt-4 text-[11.5px] leading-5 text-slate-500 sm:px-8"
          >
            {CEB_SUSPENSION_LEGEND}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:px-8">
          <span>
            <strong className="font-semibold text-slate-900">{visible.length}</strong> shown ·{" "}
            {filtered.length.toLocaleString("en-US")} match the filters ·{" "}
            {payload.counts.players.toLocaleString("en-US")} ranked players
          </span>
          {pageCount > 1 ? (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
              >
                Prev
              </button>
              {buildPageList(currentPage, pageCount).map((entry, index) =>
                entry === "gap" ? (
                  <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPage(entry)}
                    aria-current={entry === currentPage ? "page" : undefined}
                    className={`min-w-8 rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                      entry === currentPage
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <p className="px-6 pb-6 text-[11.5px] leading-5 text-slate-400 sm:px-8">
          Filters and search work instantly in your browser — no reload. The list itself is a mirror of the
          official CEB ranking and is refreshed when the CEB publishes a new edition (or a corrected one).
          Source:{" "}
          <a
            href={payload.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-sky-700 hover:underline"
          >
            {payload.sourceLabel} — edition {payload.edition} (PDF)
          </a>
          .
        </p>
      </section>
    </div>
  );
}
