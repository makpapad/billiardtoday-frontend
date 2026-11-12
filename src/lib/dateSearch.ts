/**
 * ΗΜΕΡΟΜΗΝΙΑ ΣΤΗΝ ΑΝΑΖΗΤΗΣΗ — καθαρή λογική, χωρίς δίκτυο/βάση.
 *
 * Δέχεται «12/11», «12/11/2026», «2026-11-12», «12.11» και διαστήματα
 * «12/11-14/11», «12/11/2026 - 14/11/2026», «12/11 έως 14/11».
 *
 * Χρησιμοποιείται και στη λίστα τουρνουά (φίλτρο στο Strapi) και μέσα στο
 * Time Table ενός τουρνουά (φίλτρο στις γραμμές του προγράμματος).
 */

export type DateWindow = { from: string; to: string };

export type DateSearch = { windows: DateWindow[]; rest: string };

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toIsoDay = (year: number, month: number, day: number): string | null => {
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const parseDay = (
  raw: string,
  fallbackYear: number | null,
): { year: number | null; month: number; day: number } | null => {
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return toIsoDay(year, month, day) ? { year, month, day } : null;
  }
  const dmy = raw.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
  if (!dmy) return null;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  const yearPart = dmy[3] ? Number(dmy[3]) : fallbackYear;
  const year = yearPart !== null && yearPart < 100 ? 2000 + yearPart : yearPart;
  if (year !== null && !toIsoDay(year, month, day)) return null;
  if (year === null && (month < 1 || month > 12 || day < 1 || day > 31)) return null;
  return { year, month, day };
};

/** Έτη για ημερομηνία χωρίς έτος: φέτος και πέρυσι (οι σεζόν ξεκινούν το φθινόπωρο). */
const defaultYears = (): number[] => {
  const now = new Date().getFullYear();
  return [now, now - 1];
};

const DAY_PATTERN = '(\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{2,4})?|\\d{4}-\\d{1,2}-\\d{1,2})';

export const extractDateSearch = (input: string | null | undefined): DateSearch | null => {
  if (!input) return null;
  const text = String(input).trim();
  if (!text) return null;

  // 1) ΔΙΑΣΤΗΜΑ
  const range = text.match(
    new RegExp(`${DAY_PATTERN}\\s*(?:-|–|έως|to|\\.\\.)\\s*${DAY_PATTERN}`, 'i'),
  );
  if (range) {
    const left = parseDay(range[1], null);
    const right = parseDay(range[2], null);
    const fromYear = left?.year ?? right?.year ?? null;
    const start = left ? (left.year === null ? { ...left, year: fromYear } : left) : null;
    const end = right ? (right.year === null ? { ...right, year: fromYear } : right) : null;
    if (start && end) {
      const years = start.year !== null ? [start.year] : defaultYears();
      const windows: DateWindow[] = [];
      for (const year of years) {
        const from = toIsoDay(year, start.month, start.day);
        const to = toIsoDay(year, end.month, end.day);
        if (from && to) windows.push({ from, to });
      }
      if (windows.length) return { windows, rest: text.replace(range[0], ' ').trim() };
    }
  }

  // 2) ΜΙΑ ΜΕΡΑ
  const single = text.match(new RegExp(DAY_PATTERN));
  if (single) {
    const day = parseDay(single[1], null);
    if (day) {
      const years = day.year !== null ? [day.year] : defaultYears();
      const windows: DateWindow[] = [];
      for (const year of years) {
        const iso = toIsoDay(year, day.month, day.day);
        if (iso) windows.push({ from: iso, to: iso });
      }
      if (windows.length) return { windows, rest: text.replace(single[0], ' ').trim() };
    }
  }

  return null;
};

/** Η μέρα (YYYY-MM-DD) ενός slot/αγώνα, από `date` ή `dateTime`. */
export const isoDayOf = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

/** Πέφτει η μέρα μέσα σε κάποιο από τα παράθυρα; */
export const dayInWindows = (day: string | null, windows: DateWindow[]): boolean => {
  if (!day) return false;
  return windows.some((window) => day >= window.from && day <= window.to);
};

/** Γράφει τα όρια ημερομηνίας στο query του Strapi (επικάλυψη με το διάστημα του τουρνουά). */
export const applyDateSearch = (
  params: URLSearchParams,
  andIndex: number,
  windows: DateWindow[],
): number => {
  if (windows.length === 0) return andIndex;
  windows.forEach((window, index) => {
    params.set(`filters[$and][${andIndex}][$or][${index}][start_date][$lte]`, `${window.to}T23:59:59`);
    params.set(`filters[$and][${andIndex}][$or][${index}][end_date][$gte]`, `${window.from}T00:00:00`);
  });
  return andIndex + 1;
};
