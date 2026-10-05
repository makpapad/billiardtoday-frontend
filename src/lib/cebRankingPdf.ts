import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  formatCebDate,
  type CebRankingPayload,
  type CebRankingRow,
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
const FIRST_TABLE_TOP = PAGE_HEIGHT - MARGIN - HEADER_BLOCK; // ~738.89
const OTHER_TABLE_TOP = PAGE_HEIGHT - MARGIN; // ~801.89

const COL_RANK_W = 46;
const COL_FED_W = 64;
const COL_POINTS_W = 62;
const COL_PLAYER_W = CONTENT_WIDTH - COL_RANK_W - COL_FED_W - COL_POINTS_W; // 343.28

const RANK_X = MARGIN;
const PLAYER_X = RANK_X + COL_RANK_W;
const FED_X = PLAYER_X + COL_PLAYER_W;
const POINTS_X = FED_X + COL_FED_W;
const RIGHT_EDGE = POINTS_X + COL_POINTS_W;

const COLOR_HEADER_BG = rgb(0.059, 0.09, 0.165); // slate-900 #0f172a
const COLOR_ZEBRA = rgb(0.937, 0.965, 1); // blue-50 #eff6ff
const COLOR_SUSPENDED_BG = rgb(0.898, 0.91, 0.929); // slate-200
const COLOR_RULE = rgb(0.886, 0.91, 0.941); // slate-200
const COLOR_TEXT = rgb(0.059, 0.09, 0.165);
const COLOR_MUTED = rgb(0.39, 0.45, 0.55);
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

/** Χωρίζει τις γραμμές σε σελίδες· η κεφαλίδα του πίνακα επαναλαμβάνεται σε κάθε σελίδα. */
const paginate = (rows: CebRankingRow[]): CebRankingRow[][] => {
  const pages: CebRankingRow[][] = [];
  let current: CebRankingRow[] = [];
  let top = FIRST_TABLE_TOP;
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

const drawTableHeader = (
  page: import("pdf-lib").PDFPage,
  tableTop: number,
  bold: import("pdf-lib").PDFFont,
) => {
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - TABLE_HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: TABLE_HEADER_HEIGHT,
    color: COLOR_HEADER_BG,
  });
  const baseline = tableTop - TABLE_HEADER_HEIGHT + 5.5;
  drawCell(page, "Rank", RANK_X + 6, COL_RANK_W - 6, "right", bold, 9, COLOR_WHITE, baseline);
  drawCell(page, "Player", PLAYER_X + 4, COL_PLAYER_W - 4, "left", bold, 9, COLOR_WHITE, baseline);
  drawCell(page, "Federation", FED_X, COL_FED_W, "center", bold, 9, COLOR_WHITE, baseline);
  drawCell(page, "Points", POINTS_X, COL_POINTS_W - 6, "right", bold, 9, COLOR_WHITE, baseline);
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

  const pages = paginate(payload.rows);
  const sourceLabel = `Source: CEB — ${payload.sourceLabel} · edition ${payload.edition}`;

  pages.forEach((rows, pageIndex) => {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const isFirst = pageIndex === 0;
    const tableTop = isFirst ? FIRST_TABLE_TOP : OTHER_TABLE_TOP;

    if (isFirst) {
      drawFirstPageHeader(page, font, bold, payload, createdLabel);
    }
    drawTableHeader(page, tableTop, bold);

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
      drawCell(page, String(row.rank), RANK_X + 6, COL_RANK_W - 6, "right", font, 9, COLOR_MUTED, baseline);
      drawCell(page, row.name, PLAYER_X + 4, COL_PLAYER_W - 4, "left", bold, 9, textColor, baseline);
      drawCell(page, row.fed, FED_X, COL_FED_W, "center", font, 9, COLOR_MUTED, baseline);
      drawCell(page, String(row.points), POINTS_X, COL_POINTS_W - 6, "right", bold, 9, textColor, baseline);

      cursor = rowBottom;
    });

    drawFooter(page, font, `Page ${pageIndex + 1} / ${pages.length}`, sourceLabel);
  });

  return doc.save();
};
