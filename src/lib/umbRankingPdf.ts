import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatUmbDate, type UmbRankingPayload, type UmbRankingRow } from "@/lib/umbRanking";

/**
 * Server-only PDF export of a UMB Events Ranking edition.
 *
 * Same generator as the CEB one (`cebRankingPdf.ts`), tuned for the UMB list:
 * 11 counting columns (A = World Championship, B–K = the ten most recent World
 * Cups), negative cells = absence penalties, and the UMB 11-zone points table in
 * the legend. The ranked players and their official points are never recomputed —
 * the PDF renders exactly the JSON the site table shows.
 *
 * Layout: A4 portrait, 40pt margins, Helvetica/Helvetica-Bold (standard fonts, no
 * font file embedded), a repeating table header, a footer with "Page x / y" and the
 * source on every page. Page 1 also carries the "Where the points come from" legend.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 515.28
const FOOTER_HEIGHT = 28;
const BOTTOM_LIMIT = MARGIN + FOOTER_HEIGHT;

const ROW_HEIGHT = 14;
const TABLE_HEADER_HEIGHT = 18;

// First-page header block steps (title / edition / published / gap).
const HEADER_BLOCK = 22 + 15 + 14 + 12;

// Legend block on page 1 (title / header row / one row per event / note / gap).
const LEGEND_ROW_HEIGHT = 10.5;
const LEGEND_HEADER_HEIGHT = 12;
const legendHeight = (eventCount: number): number =>
  15 + LEGEND_HEADER_HEIGHT + eventCount * LEGEND_ROW_HEIGHT + 8 + 18 + 8;
const firstTableTop = (eventCount: number): number =>
  PAGE_HEIGHT - MARGIN - HEADER_BLOCK - legendHeight(eventCount);
const OTHER_TABLE_TOP = PAGE_HEIGHT - MARGIN; // ~801.89

// Players table: Rank | Player | Nat | Points | A…K
const COL_RANK_W = 28;
const COL_FED_W = 24;
const COL_POINTS_W = 32;
const EVENT_COUNT = 11;
const EVENT_COL_W = 22;
const COL_PLAYER_W =
  CONTENT_WIDTH - COL_RANK_W - COL_FED_W - COL_POINTS_W - EVENT_COL_W * EVENT_COUNT; // 189.28

const RANK_X = MARGIN;
const PLAYER_X = RANK_X + COL_RANK_W;
const FED_X = PLAYER_X + COL_PLAYER_W;
// Η στήλη Points μπαίνει αμέσως μετά το Nat (federation)· οι στήλες των events
// (A…K) ακολουθούν, με το RIGHT_EDGE στην άκρη της τελευταίας στήλης event.
const POINTS_X = FED_X + COL_FED_W;
const EVENTS_X = POINTS_X + COL_POINTS_W;
const RIGHT_EDGE = EVENTS_X + EVENT_COL_W * EVENT_COUNT;

// Legend columns: Col | Counting event | Venue | Date | 11 point bands
const LEG_COL_W = 18;
const LEG_EVENT_W = 150;
const LEG_WHERE_W = 70;
const LEG_DATE_W = 40;
/** Οι 11 ζώνες τερματισμού της UMB (ίδιες σε World Cup και Παγκόσμιο). */
const POSITION_BANDS: string[] = [
  "1",
  "2",
  "3-4",
  "5-8",
  "9-16",
  "17-24",
  "25-32",
  "33-53",
  "54-85",
  "86-117",
  "118+",
];
const LEG_BAND_W =
  (CONTENT_WIDTH - LEG_COL_W - LEG_EVENT_W - LEG_WHERE_W - LEG_DATE_W) / POSITION_BANDS.length;

const COLOR_HEADER_BG = rgb(0.059, 0.09, 0.165); // slate-900 #0f172a
const COLOR_ZEBRA = rgb(0.937, 0.965, 1); // blue-50 #eff6ff
const COLOR_SUSPENDED_BG = rgb(0.898, 0.91, 0.929); // slate-200
const COLOR_LEGEND_BG = rgb(0.972, 0.98, 0.992); // slate-50
const COLOR_LEGEND_HEAD = rgb(0.886, 0.91, 0.941); // slate-200
const COLOR_RULE = rgb(0.886, 0.91, 0.941); // slate-200
const COLOR_TEXT = rgb(0.059, 0.09, 0.165);
const COLOR_MUTED = rgb(0.39, 0.45, 0.55);
const COLOR_NEGATIVE = rgb(0.72, 0.11, 0.11); // κόκκινο για ποινή
const COLOR_WHITE = rgb(1, 1, 1);

type Align = "left" | "right" | "center";

/**
 * pdf-lib standard fonts only encode WinAnsi. Replace every character outside
 * printable ASCII + the Latin-1 supplement with a safe fallback, so a stray
 * emoji / CJK / smart quote in a name can never make the export throw.
 */
const WINANSI_FALLBACKS: Record<string, string> = {
  "İ": "I",
  "ı": "i",
  "Ğ": "G", "ğ": "g", "Ş": "S", "ş": "s", "Ţ": "T", "ţ": "t",
  "–": "-", "—": "-", "−": "-",
  "‘": "'", "’": "'", "‚": ",", "“": '"', "”": '"', "„": '"',
  "…": "...", "€": "EUR", "•": "*", "\u00a0": " ",
};

export const toWinAnsi = (input: string | null | undefined): string => {
  if (!input) return "";
  let out = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 63;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += char;
    } else {
      out += WINANSI_FALLBACKS[char] ?? "?";
    }
  }
  return out;
};

/** Κόβει το κείμενο ώστε να χωράει στο δοσμένο πλάτος (με "..." αν χρειαστεί). */
const fitText = (text: string, font: PDFFont, size: number, maxWidth: number): string => {
  const value = toWinAnsi(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 0 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
};

/** Χωρίζει τις γραμμές σε σελίδες· η κεφαλίδα του πίνακα επαναλαμβάνεται σε κάθε σελίδα. */
const paginate = (rows: UmbRankingRow[], firstTop: number): UmbRankingRow[][] => {
  const pages: UmbRankingRow[][] = [];
  let current: UmbRankingRow[] = [];
  let cursor = firstTop - TABLE_HEADER_HEIGHT;

  for (const row of rows) {
    if (cursor - ROW_HEIGHT < BOTTOM_LIMIT) {
      pages.push(current);
      current = [];
      cursor = OTHER_TABLE_TOP - TABLE_HEADER_HEIGHT;
    }
    current.push(row);
    cursor -= ROW_HEIGHT;
  }
  pages.push(current);
  return pages;
};

const drawCell = (
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  align: Align,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  baselineY: number,
) => {
  const value = toWinAnsi(text);
  const textWidth = font.widthOfTextAtSize(value, size);
  let drawX = x;
  if (align === "right") drawX = x + width - textWidth;
  else if (align === "center") drawX = x + (width - textWidth) / 2;
  page.drawText(value, { x: drawX, y: baselineY, size, font, color });
};

const drawLegend = (
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  payload: UmbRankingPayload,
  topY: number,
) => {
  const events = payload.events;

  drawCell(page, "Where the points come from", MARGIN, CONTENT_WIDTH, "left", bold, 10, COLOR_TEXT, topY);

  const headerTop = topY - 15;
  page.drawRectangle({
    x: MARGIN,
    y: headerTop - LEGEND_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: LEGEND_HEADER_HEIGHT,
    color: COLOR_LEGEND_HEAD,
  });
  const headerBaseline = headerTop - LEGEND_HEADER_HEIGHT + 4;
  drawCell(page, "Col", MARGIN, LEG_COL_W, "center", bold, 7, COLOR_TEXT, headerBaseline);
  drawCell(page, "Counting event", MARGIN + LEG_COL_W + 4, LEG_EVENT_W, "left", bold, 7, COLOR_TEXT, headerBaseline);
  drawCell(page, "Venue", MARGIN + LEG_COL_W + LEG_EVENT_W, LEG_WHERE_W, "left", bold, 7, COLOR_TEXT, headerBaseline);
  drawCell(
    page,
    "Date",
    MARGIN + LEG_COL_W + LEG_EVENT_W + LEG_WHERE_W,
    LEG_DATE_W,
    "left",
    bold,
    7,
    COLOR_TEXT,
    headerBaseline,
  );
  const bandsX = MARGIN + LEG_COL_W + LEG_EVENT_W + LEG_WHERE_W + LEG_DATE_W;
  POSITION_BANDS.forEach((band, index) => {
    drawCell(page, band, bandsX + LEG_BAND_W * index, LEG_BAND_W, "center", bold, 6, COLOR_TEXT, headerBaseline);
  });

  let cursor = headerTop - LEGEND_HEADER_HEIGHT;
  events.forEach((event, index) => {
    const rowBottom = cursor - LEGEND_ROW_HEIGHT;
    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: rowBottom,
        width: CONTENT_WIDTH,
        height: LEGEND_ROW_HEIGHT,
        color: COLOR_LEGEND_BG,
      });
    }
    const baseline = rowBottom + 3.2;
    const xCol = MARGIN;
    const xEvent = MARGIN + LEG_COL_W;
    const xWhere = xEvent + LEG_EVENT_W;
    const xDate = xWhere + LEG_WHERE_W;
    const xScale = xDate + LEG_DATE_W;

    drawCell(page, event.key, xCol, LEG_COL_W, "center", bold, 8, COLOR_HEADER_BG, baseline);
    drawCell(
      page,
      fitText(event.name, font, 7.5, LEG_EVENT_W - 6),
      xEvent + 4,
      LEG_EVENT_W - 6,
      "left",
      font,
      7.5,
      COLOR_TEXT,
      baseline,
    );
    drawCell(page, event.city ?? "-", xWhere, LEG_WHERE_W - 4, "left", font, 6.5, COLOR_MUTED, baseline);
    drawCell(page, formatUmbDate(event.date) ?? "-", xDate, LEG_DATE_W - 4, "left", font, 6.5, COLOR_MUTED, baseline);
    POSITION_BANDS.forEach((_band, bandIndex) => {
      const value = event.scale?.[bandIndex];
      if (value === undefined || value === null) return;
      drawCell(page, String(value), xScale + LEG_BAND_W * bandIndex, LEG_BAND_W, "center", font, 7, COLOR_TEXT, baseline);
    });
    cursor = rowBottom;
  });

  const noteBaseline = cursor - 8;
  drawCell(
    page,
    "Points by finishing place, as in the official UMB list:  1 · 2 · 3-4 · 5-8 · 9-16 · 17-24 · 25-32 · 33-53 · 54-85 · 86-117 · 118+",
    MARGIN,
    CONTENT_WIDTH,
    "left",
    font,
    6.5,
    COLOR_MUTED,
    noteBaseline,
  );
  drawCell(
    page,
    "Column A is the World Championship · columns B-K are the ten most recent World Cups · negative cells are absence penalties (-8 not entered, -16 entered but did not play)",
    MARGIN,
    CONTENT_WIDTH,
    "left",
    font,
    6.5,
    COLOR_MUTED,
    noteBaseline - 8,
  );

  return noteBaseline;
};

const drawTableHeader = (page: PDFPage, tableTop: number, bold: PDFFont, payload: UmbRankingPayload) => {
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - TABLE_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: TABLE_HEADER_HEIGHT,
    color: COLOR_HEADER_BG,
  });
  const baseline = tableTop - TABLE_HEADER_HEIGHT + 5.5;
  drawCell(page, "Rank", RANK_X, COL_RANK_W, "center", bold, 8, COLOR_WHITE, baseline);
  drawCell(page, "Player", PLAYER_X + 4, COL_PLAYER_W - 4, "left", bold, 9, COLOR_WHITE, baseline);
  drawCell(page, "Nat", FED_X, COL_FED_W, "center", bold, 8, COLOR_WHITE, baseline);
  drawCell(page, "Points", POINTS_X, COL_POINTS_W, "center", bold, 8, COLOR_WHITE, baseline);
  payload.events.forEach((event, index) => {
    const x = EVENTS_X + EVENT_COL_W * index;
    drawCell(page, event.key, x, EVENT_COL_W, "center", bold, 8, COLOR_WHITE, baseline);
    page.drawLine({
      start: { x, y: tableTop - TABLE_HEADER_HEIGHT + 3 },
      end: { x, y: tableTop - 3 },
      thickness: 0.3,
      color: rgb(0.35, 0.42, 0.55),
    });
  });
};

const drawFooter = (page: PDFPage, font: PDFFont, pageLabel: string, sourceLabel: string) => {
  const baseline = MARGIN - 14;
  page.drawLine({
    start: { x: MARGIN, y: MARGIN - 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: MARGIN - 4 },
    thickness: 0.5,
    color: COLOR_RULE,
  });
  drawCell(page, sourceLabel, MARGIN, CONTENT_WIDTH - 90, "left", font, 8, COLOR_MUTED, baseline);
  drawCell(page, pageLabel, MARGIN, CONTENT_WIDTH, "right", font, 8, COLOR_MUTED, baseline);
};

const drawFirstPageHeader = (
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  payload: UmbRankingPayload,
  createdLabel: string,
) => {
  const updated = formatUmbDate(payload.updatedAt) ?? "-";
  drawCell(page, "UMB Events Ranking", MARGIN, CONTENT_WIDTH, "left", bold, 18, COLOR_TEXT, PAGE_HEIGHT - MARGIN);
  drawCell(
    page,
    `${payload.title} · Edition ${payload.edition} · updated ${updated}`,
    MARGIN,
    CONTENT_WIDTH,
    "left",
    font,
    11,
    COLOR_MUTED,
    PAGE_HEIGHT - MARGIN - 22,
  );
  drawCell(
    page,
    `Published by UMB · Brought to you by BilliardToday · generated ${createdLabel}`,
    MARGIN,
    CONTENT_WIDTH,
    "left",
    font,
    9.5,
    COLOR_MUTED,
    PAGE_HEIGHT - MARGIN - 22 - 15,
  );
};

export type UmbRankingPdfInput = {
  payload: UmbRankingPayload;
  /** Ημερομηνία δημιουργίας του αρχείου (προεπιλογή: τώρα). */
  createdAt?: Date;
};

/** Φτιάχνει το PDF της έκδοσης· επιστρέφει τα bytes. */
export const renderUmbRankingPdf = async ({
  payload,
  createdAt = new Date(),
}: UmbRankingPdfInput): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.setTitle(`UMB Events Ranking — edition ${payload.edition}`);
  doc.setAuthor("BilliardToday");
  doc.setSubject(`UMB official Events Ranking, edition ${payload.edition}`);
  doc.setCreationDate(createdAt);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const createdLabel =
    createdAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }) || "-";

  const pages = paginate(payload.rows, firstTableTop(payload.events.length));
  const sourceLabel = `Source: UMB — ${payload.sourceLabel} · edition ${payload.edition}`;

  pages.forEach((rows, pageIndex) => {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const isFirst = pageIndex === 0;
    const tableTop = isFirst ? firstTableTop(payload.events.length) : OTHER_TABLE_TOP;

    if (isFirst) {
      drawFirstPageHeader(page, font, bold, payload, createdLabel);
      drawLegend(page, font, bold, payload, PAGE_HEIGHT - MARGIN - HEADER_BLOCK);
    }
    drawTableHeader(page, tableTop, bold, payload);

    let cursor = tableTop - TABLE_HEADER_HEIGHT;
    rows.forEach((row, rowIndex) => {
      const rowBottom = cursor - ROW_HEIGHT;

      if (row.suspended) {
        page.drawRectangle({
          x: MARGIN,
          y: rowBottom,
          width: CONTENT_WIDTH,
          height: ROW_HEIGHT,
          color: COLOR_SUSPENDED_BG,
        });
      } else if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: rowBottom,
          width: CONTENT_WIDTH,
          height: ROW_HEIGHT,
          color: COLOR_ZEBRA,
        });
      }

      page.drawLine({
        start: { x: MARGIN, y: rowBottom },
        end: { x: RIGHT_EDGE, y: rowBottom },
        thickness: 0.4,
        color: COLOR_RULE,
      });

      const textColor = row.suspended ? COLOR_MUTED : COLOR_TEXT;
      const baseline = rowBottom + 4;
      drawCell(page, String(row.rank), RANK_X, COL_RANK_W, "center", font, 8, COLOR_MUTED, baseline);
      drawCell(
        page,
        fitText(row.name ?? "", bold, 8, COL_PLAYER_W - 8),
        PLAYER_X + 4,
        COL_PLAYER_W - 8,
        "left",
        bold,
        8,
        textColor,
        baseline,
      );
      drawCell(page, row.fed ?? "", FED_X, COL_FED_W, "center", font, 8, COLOR_MUTED, baseline);

      drawCell(page, String(row.points), POINTS_X, COL_POINTS_W - 2, "right", bold, 9, row.points < 0 ? COLOR_NEGATIVE : textColor, baseline);

      payload.events.forEach((_event, index) => {
        const value = row.ev?.[index] ?? null;
        if (value === null || value === 0) return;
        const x = EVENTS_X + EVENT_COL_W * index;
        drawCell(
          page,
          String(value),
          x,
          EVENT_COL_W,
          "center",
          font,
          8,
          value < 0 ? COLOR_NEGATIVE : COLOR_TEXT,
          baseline,
        );
      });

      cursor = rowBottom;
    });

    drawFooter(
      page,
      font,
      `${isFirst ? "" : "Columns A-K: page 1 · "}Page ${pageIndex + 1} / ${pages.length}`,
      sourceLabel,
    );
  });

  return doc.save();
};
