"use client";

import type { TournamentEventSummary } from "@/lib/tournaments";

/**
 * Κάρτα «Event Info» διοργάνωσης: χάρτης τοποθεσίας πάνω, δομημένες ενότητες
 * (`event_info`) από κάτω, και τέλος τα πεδία που έρχονται από τη βάση.
 *
 * Ο χάρτης χτίζεται από τη ΔΙΕΥΘΥΝΣΗ του venue (όχι από συντεταγμένες), ώστε
 * να μη χρειάζεται API key: `google.com/maps?q=<address>&output=embed`.
 * Αν το venue δεν έχει διεύθυνση, δοκιμάζουμε όνομα + πόλη + χώρα.
 */

const buildMapEmbedSrc = (summary: TournamentEventSummary): string | null => {
  const address = summary.venueAddress?.trim();
  const nameAndPlace = [summary.venueName, summary.venueCity, summary.venueCountry]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const query = address || nameAndPlace;
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
};

const buildMapLink = (summary: TournamentEventSummary): string | null => {
  if (summary.venueMapUrl) return summary.venueMapUrl;
  const address = summary.venueAddress?.trim();
  const nameAndPlace = [summary.venueName, summary.venueCity, summary.venueCountry]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const query = address || nameAndPlace;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export function TournamentInfoPanel({ summary }: { summary: TournamentEventSummary }) {
  const mapSrc = buildMapEmbedSrc(summary);
  const mapLink = buildMapLink(summary);
  const sections = summary.eventInfo?.sections ?? [];
  const venueLine = [summary.venueName, summary.venueAddress, summary.venueCity, summary.venueCountry]
    .map((part) => part?.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {mapSrc ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <iframe
            src={mapSrc}
            title={
              summary.venueName
                ? `${summary.venueName} — map`
                : "Tournament location map"
            }
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-[240px] w-full border-0 sm:h-[320px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0">
              {summary.venueName ? (
                <div className="truncate text-sm font-semibold text-slate-950">
                  {summary.venueName}
                </div>
              ) : null}
              {venueLine.length > 1 ? (
                <div className="mt-0.5 text-xs text-slate-500">
                  {venueLine.slice(1).join(" · ")}
                </div>
              ) : null}
            </div>
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
              >
                Open in Google Maps
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                {section.lines.map((line, index) => (
                  <li key={`${section.title}-${index}`} className="flex gap-2">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
