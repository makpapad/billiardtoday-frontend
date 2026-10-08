import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  formatCebDate,
  resolveCebUnits,
  type CebRankingPayload,
  type CebRankingRow,
  type CebRankingUnits,
} from "@/lib/cebRanking";

/**
 * Server-only PDF export of a CEB ranking edition.
 *
 * The list is rendered as a real PDF (not a browser print view) so the file that
 * goes out by email matches the table on the site — every ranked player, in the
 * official order, with the official numbers untouched.
 *
 * Layout: A4 portrait, 40pt margins, Helvetica/Helvetica-Bold (the pdf-lib
 * standard fonts, no font file is embedded), a repeating table header, a footer
 * with "Page x / y" and the source on every page.
 *
 * Page 1 also carries the "Where the points come from" legend: one row per
 * counting event (column letter, event, venue, date, points scale, how many
 * athletes scored there), so a printed copy explains its own columns.
 * The per-event columns (A…J) hold the points each athlete picked up in that
 * event, so the total is reproducible column by column.
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
/**
 * Ύψος του πινακάκιου «Where the points come from»: τίτλος (15), κεφαλίδα (12),
 * μία γραμμή ανά event (10,5), κενό + υποσημείωση (8 + 10) και κενό πριν τον πίνακα (8).
 * Βγαίνει από τον αριθμό των events, ώστε το πινακάκι να μην πέφτει ποτέ πάνω
 * στις πρώτες γραμμές της κατάταξης.
 */
const legendHeight = (eventCount: number): number =>
  15 + LEGEND_HEADER_HEIGHT + eventCount * LEGEND_ROW_HEIGHT + 8 + 18 + 8;
/** Πού ξεκινά ο πίνακας της 1ης σελίδας (κάτω από το πινακάκι). */
const firstTableTop = (eventCount: number): number =>
  PAGE_HEIGHT - MARGIN - HEADER_BLOCK - legendHeight(eventCount);
const OTHER_TABLE_TOP = PAGE_HEIGHT - MARGIN; // ~801.89

// Players table: Rank | Player | Nat | Points | A…J
const COL_RANK_W = 28;
const COL_FED_W = 24;
const COL_POINTS_W = 32;
const EVENT_COL_W = 24;
const COL_PLAYER_W =
  CONTENT_WIDTH - COL_RANK_W - COL_FED_W - COL_POINTS_W - EVENT_COL_W * 10; // 191.28

const RANK_X = MARGIN;
const PLAYER_X = RANK_X + COL_RANK_W;
const FED_X = PLAYER_X + COL_PLAYER_W;
// Η στήλη Points μπαίνει αμέσως μετά το Nat (federation)· οι στήλες των events
// (A…J) ακολουθούν, με το RIGHT_EDGE στην άκρη της τελευταίας στήλης event.
const POINTS_X = FED_X + COL_FED_W;
const EVENTS_X = POINTS_X + COL_POINTS_W;
const RIGHT_EDGE = EVENTS_X + EVENT_COL_W * 10;

/**
 * Η διάταξη των στηλών του πίνακα. Λίστες όπου κάθε γραμμή ΕΙΝΑΙ ομοσπονδία (εθνικές
 * ομάδες) δεν έχουν στήλη «Nat»: το πλάτος της δίνεται στη στήλη του ονόματος, οπότε τα
 * x των στηλών Points και A…J μένουν ΑΚΡΙΒΩΣ τα ίδια (κανένα iota μετατόπιση).
 */
type TableLayout = {
  /** x της στήλης Nat — `null` όταν η λίστα δεν έχει (εθνικές ομάδες). */
  fedX: number | null;
  fedW: number;
  playerW: number;
};

const layoutFor = (units: CebRankingUnits): TableLayout =>
  units.federationIsRow
    ? { fedX: null, fedW: 0, playerW: COL_PLAYER_W + COL_FED_W }
    : { fedX: FED_X, fedW: COL_FED_W, playerW: COL_PLAYER_W };

// Προαιρετική τελευταία στήλη «μέσος όρος» (`percent`): υπάρχει ΜΟΝΟ σε λίστες που το
// φύλλο της CEB τυπώνει (σήμερα Artistic). Μπαίνει ΜΕΤΑ τις στήλες των events και
// τερματίζει στο RIGHT_EDGE, ώστε τα x των στηλών Rank/Player/Nat/Points/A…J να μένουν
// ΑΜΕΤΑΒΛΗΤΑ — οι λίστες χωρίς `percent` δεν αποκτούν στήλη ούτε αλλάζουν κατά ένα iota.
const PERCENT_COL_MIN_W = 24;
/** Ετικέτα της στήλης όταν το payload δεν δίνει δική του (`percentLabel`). */
const DEFAULT_PERCENT_LABEL = "Avg";
type CebRowPercent = { percent?: number | null };
type CebPercentMeta = { percentLabel?: string; percentNote?: string };
/** Η τιμή όπως τυπώνεται στο φύλλο: τρία δεκαδικά, τελεία ως υποδιαστολή· κενό όταν λείπει. */
const formatCebPercent = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "";

/** Η προαιρετική στήλη μέσου όρου: ετικέτα + x/πλάτος, στοιχεία που υπολογίζονται μία φορά. */
type PercentColumn = { label: string; x: number; width: number };

// Legend columns: Col | Counting event | Venue | Date | 1 | 2 | 3-4 | 5-8 | 9-16 | 17-32 | **
// Οι στήλες των θέσεων είναι όπως στο επίσημο PDF της CEB: μία στήλη ανά ζώνη θέσεων,
// ώστε να φαίνεται τι πόντοι δίνονται σε κάθε θέση κι όχι μόνο η σειρά 80/54/38/…
const LEG_COL_W = 22;
const LEG_EVENT_W = 168;
const LEG_WHERE_W = 86;
const LEG_DATE_W = 46;
const POSITION_BANDS: string[] = ["1", "2", "3-4", "5-8", "9-16", "17-32", "**"];
const LEG_BAND_W =
  (CONTENT_WIDTH - LEG_COL_W - LEG_EVENT_W - LEG_WHERE_W - LEG_DATE_W) /
  POSITION_BANDS.length; // ~27.7

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
 * printable ASCII + the Latin-1 supplement (which WinAnsi covers 1:1) with "?",
 * so a stray emoji / CJK / smart quote in a name can never make the export throw.
 */
const WINANSI_FALLBACKS: Record<string, string> = {
  "İ": "I", // τουρκικό κεφαλαίο I με τελεία (GAYRET İ…)
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
const fitText = (
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number,
): string => {
  const value = toWinAnsi(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 0 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
};

/** Χωρίζει τις γραμμές σε σελίδες· η κεφαλίδα του πίνακα επαναλαμβάνεται σε κάθε σελίδα. */
const paginate = (rows: CebRankingRow[], firstTop: number): CebRankingRow[][] => {
  const pages: CebRankingRow[][] = [];
  let current: CebRankingRow[] = [];
  let top = firstTop;
  let cursor = top - TABLE_HEADER_HEIGHT;

  for (const row of rows) {
    if (cursor - ROW_HEIGHT < BOTTOM_LIMIT) {
      pages.push(current);
      current = [];
      top = OTHER_TABLE_TOP;
      cursor = top - TABLE_HEADER_HEIGHT;
    }
    current.push(row);
    cursor -= ROW_HEIGHT;
  }
  pages.push(current);
  return pages;
};

const drawCell = (
  page: import("pdf-lib").PDFPage,
  text: string,
  x: number,
  width: number,
  align: Align,
  font: import("pdf-lib").PDFFont,
  size: number,
  color: import("pdf-lib").RGB,
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
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  bold: import("pdf-lib").PDFFont,
  payload: CebRankingPayload,
  topY: number,
) => {
  const events = payload.events;
  // Λίστες χωρίς σταθερή κλίμακα (`scale: []` — εθνικές ομάδες: οι πόντοι βγαίνουν από τη
  // μορφή κάθε έκδοσης): οι στήλες θέσεων και τα σχόλια περί κλίμακας δεν έχουν περιεχόμενο,
  // οπότε παραλείπονται ολόκληρα αντί να τυπώνονται κενά.
  const hasScale = events.some((event) => (event.scale?.length ?? 0) > 0);

  drawCell(
    page,
    "Where the points come from",
    MARGIN,
    CONTENT_WIDTH,
    "left",
    bold,
    10,
    COLOR_TEXT,
    topY,
  );

  // Κεφαλίδα του πινακακιού.
  const headerTop = topY - 15;
  page.drawRectangle({
    x: MARGIN,
    y: headerTop - LEGEND_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: LEGEND_HEADER_HEIGHT,
    color: COLOR_LEGEND_HEAD,
  });
  const headerBaseline = headerTop - LEGEND_HEADER_HEIGHT + 4;
  drawCell(page, "Col", MARGIN, LEG_COL_W, "center", bold, 7.5, COLOR_TEXT, headerBaseline);
  drawCell(page, "Counting event", MARGIN + LEG_COL_W + 4, LEG_EVENT_W, "left", bold, 7.5, COLOR_TEXT, headerBaseline);
  drawCell(page, "Venue", MARGIN + LEG_COL_W + LEG_EVENT_W, LEG_WHERE_W, "left", bold, 7.5, COLOR_TEXT, headerBaseline);
  drawCell(
    page,
    "Date",
    MARGIN + LEG_COL_W + LEG_EVENT_W + LEG_WHERE_W,
    LEG_DATE_W,
    "left",
    bold,
    7.5,
    COLOR_TEXT,
    headerBaseline,
  );
  const bandsX = MARGIN + LEG_COL_W + LEG_EVENT_W + LEG_WHERE_W + LEG_DATE_W;
  if (hasScale) {
    POSITION_BANDS.forEach((band, index) => {
      drawCell(
        page,
        band,
        bandsX + LEG_BAND_W * index,
        LEG_BAND_W,
        "center",
        bold,
        7.5,
        COLOR_TEXT,
        headerBaseline,
      );
    });
  }

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
      fitText(`${event.name}${event.ours ? " *" : ""}`, font, 7.5, LEG_EVENT_W - 6),
      xEvent + 4,
      LEG_EVENT_W - 6,
      "left",
      font,
      7.5,
      COLOR_TEXT,
      baseline,
    );
    drawCell(page, event.city ?? "-", xWhere, LEG_WHERE_W - 4, "left", font, 7, COLOR_MUTED, baseline);
    drawCell(
      page,
      formatCebDate(event.date) ?? "-",
      xDate,
      LEG_DATE_W - 4,
      "left",
      font,
      7,
      COLOR_MUTED,
      baseline,
    );
    POSITION_BANDS.forEach((_band, bandIndex) => {
      if (!hasScale) return;
      const value = event.scale?.[bandIndex];
      if (value === undefined || value === null) return;
      drawCell(
        page,
        String(value),
        xScale + LEG_BAND_W * bandIndex,
        LEG_BAND_W,
        "center",
        font,
        7.5,
        COLOR_TEXT,
        baseline,
      );
    });
    cursor = rowBottom;
  });

  const noteBaseline = cursor - 8;
  // Χωρίς κλίμακα δεν υπάρχουν σχόλια κλίμακας: ούτε οι θέσεις, ούτε η υποσημείωση για
  // τις στήλες B-D (τις συμπληρώνουν οι εθνικές ομοσπονδίες — δεν αφορά λίστες ομάδων).
  if (!hasScale) return noteBaseline;
  drawCell(
    page,
    "Points by finishing place, as in the official CEB list:  1 · 2 · 3-4 · 5-8 · 9-16 · 17-32 · ** = 33rd and below",
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
    "* traced by BilliardToday from the tournament results · columns B-D are reported to CEB by the national federations",
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

const drawTableHeader = (
  page: import("pdf-lib").PDFPage,
  tableTop: number,
  bold: import("pdf-lib").PDFFont,
  payload: CebRankingPayload,
  percent: PercentColumn | null,
  layout: TableLayout,
  units: CebRankingUnits,
) => {
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - TABLE_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: TABLE_HEADER_HEIGHT,
    color: COLOR_HEADER_BG,
  });
  const baseline = tableTop - TABLE_HEADER_HEIGHT + 5.5;
  drawCell(page, "Rank", RANK_X, COL_RANK_W, "center", bold, 8, COLOR_WHITE, baseline);
  drawCell(page, units.row, PLAYER_X + 4, layout.playerW - 4, "left", bold, 9, COLOR_WHITE, baseline);
  // Η στήλη «Nat» λείπει όταν κάθε γραμμή είναι ομοσπονδία (εθνικές ομάδες).
  if (layout.fedX !== null) {
    drawCell(page, "Nat", layout.fedX, layout.fedW, "center", bold, 8, COLOR_WHITE, baseline);
  }
  drawCell(page, "Points", POINTS_X, COL_POINTS_W, "center", bold, 8, COLOR_WHITE, baseline);
  payload.events.forEach((event, index) => {
    const x = EVENTS_X + EVENT_COL_W * index;
    drawCell(page, event.key, x, EVENT_COL_W, "center", bold, 8, COLOR_WHITE, baseline);
    // Λεπτό διαχωριστικό ανάμεσα στις στήλες των events.
    page.drawLine({
      start: { x, y: tableTop - TABLE_HEADER_HEIGHT + 3 },
      end: { x, y: tableTop - 3 },
      thickness: 0.3,
      color: rgb(0.35, 0.42, 0.55),
    });
  });
  // Στήλη μέσου όρου (μόνο όταν υπάρχει): διαχωριστικό + ετικέτα δεξιά, στο RIGHT_EDGE.
  if (percent) {
    page.drawLine({
      start: { x: percent.x, y: tableTop - TABLE_HEADER_HEIGHT + 3 },
      end: { x: percent.x, y: tableTop - 3 },
      thickness: 0.3,
      color: rgb(0.35, 0.42, 0.55),
    });
    drawCell(page, percent.label, percent.x, percent.width, "right", bold, 8, COLOR_WHITE, baseline);
  }
};

const drawFooter = (
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  pageLabel: string,
  sourceLabel: string,
) => {
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
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  bold: import("pdf-lib").PDFFont,
  payload: CebRankingPayload,
  createdLabel: string,
) => {
  const title = `CEB ${payload.title} Ranking`;
  const updated = formatCebDate(payload.updatedAt) ?? "-";
  drawCell(page, title, MARGIN, CONTENT_WIDTH, "left", bold, 18, COLOR_TEXT, PAGE_HEIGHT - MARGIN);
  drawCell(
    page,
    `Edition ${payload.edition} · updated ${updated}`,
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
    `Published by CEB · Brought to you by BilliardToday · generated ${createdLabel}`,
    MARGIN,
    CONTENT_WIDTH,
    "left",
    font,
    9.5,
    COLOR_MUTED,
    PAGE_HEIGHT - MARGIN - 22 - 15,
  );
};

export type CebRankingPdfInput = {
  payload: CebRankingPayload;
  /** Ημερομηνία δημιουργίας του αρχείου (προεπιλογή: τώρα). */
  createdAt?: Date;
};

/** Φτιάχνει το PDF της έκδοσης· επιστρέφει τα bytes. */
export const renderCebRankingPdf = async ({
  payload,
  createdAt = new Date(),
}: CebRankingPdfInput): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.setTitle(`CEB ${payload.title} Ranking — edition ${payload.edition}`);
  doc.setAuthor("BilliardToday");
  doc.setSubject(`CEB official ranking, edition ${payload.edition}`);
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
  const sourceLabel = `Source: CEB — ${payload.sourceLabel} · edition ${payload.edition}`;
  // Οι ετικέτες/μονάδες της λίστας (data-driven· προεπιλογές = οι λίστες αθλητών, byte-identical)
  // και η διάταξη των στηλών που βγαίνει από αυτές (χωρίς στήλη Nat για λίστες ομάδων).
  const units = resolveCebUnits(payload);
  const layout = layoutFor(units);

  // Στήλη μέσου όρου: μόνο όταν η λίστα φέρνει `percent` και χωρά μετά τις στήλες των
  // events (τερματίζει στο RIGHT_EDGE, μέσα στα περιθώρια). Αλλιώς `null` — καμία αλλαγή.
  const percentX = EVENTS_X + EVENT_COL_W * payload.events.length;
  const percentWidth = RIGHT_EDGE - percentX;
  const showPercent =
    payload.rows.some((row) => typeof (row as CebRowPercent).percent === "number") &&
    percentWidth >= PERCENT_COL_MIN_W;
  const percentLabel =
    ((payload as CebRankingPayload & CebPercentMeta).percentLabel ?? "").trim() ||
    DEFAULT_PERCENT_LABEL;
  const percentColumn: PercentColumn | null = showPercent
    ? { label: percentLabel, x: percentX, width: percentWidth }
    : null;

  pages.forEach((rows, pageIndex) => {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const isFirst = pageIndex === 0;
    const tableTop = isFirst ? firstTableTop(payload.events.length) : OTHER_TABLE_TOP;

    if (isFirst) {
      drawFirstPageHeader(page, font, bold, payload, createdLabel);
      drawLegend(page, font, bold, payload, PAGE_HEIGHT - MARGIN - HEADER_BLOCK);
    }
    drawTableHeader(page, tableTop, bold, payload, percentColumn, layout, units);

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
        fitText(row.name ?? "", bold, 8, layout.playerW - 8),
        PLAYER_X + 4,
        layout.playerW - 8,
        "left",
        bold,
        8,
        textColor,
        baseline,
      );
      if (layout.fedX !== null) {
        drawCell(page, row.fed ?? "", layout.fedX, layout.fedW, "center", font, 8, COLOR_MUTED, baseline);
      }

      drawCell(
        page,
        String(row.points),
        POINTS_X,
        COL_POINTS_W - 2,
        "right",
        bold,
        9,
        textColor,
        baseline,
      );

      payload.events.forEach((_event, index) => {
        const value = row.ev?.[index] ?? 0;
        if (value === 0) return;
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

      // Μέσος όρος (non-pointing trailing column): όπως τυπώνεται, 3 δεκαδικά· κενό όταν λείπει.
      if (percentColumn) {
        const percentValue = (row as CebRankingRow & CebRowPercent).percent;
        if (percentValue !== null && percentValue !== undefined) {
          drawCell(
            page,
            formatCebPercent(percentValue),
            percentColumn.x,
            percentColumn.width,
            "right",
            font,
            8,
            textColor,
            baseline,
          );
        }
      }

      cursor = rowBottom;
    });

    drawFooter(
      page,
      font,
      `${isFirst ? "" : "Columns A-J: page 1 · "}Page ${pageIndex + 1} / ${pages.length}`,
      sourceLabel,
    );
  });

  return doc.save();
};
