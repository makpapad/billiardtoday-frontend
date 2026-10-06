"use client";

/**
 * Πελάτης της πύλης ομοσπονδίας (browser).
 *
 * Το JWT και το πλαίσιο (χώρα, ομοσπονδία, ρόλος) μένουν στο localStorage — ίδιο
 * μοτίβο με τους λογαριασμούς παικτών. Οι κλήσεις περνούν από `/api/federation-access/*`.
 */

export type FederationContext = {
  email: string | null;
  fullName: string | null;
  roles: string[];
  accessRole: string | null;
  countryCode: string;
  countryName: string;
  federation: { id: number; documentId: string | null; name: string | null; slug: string | null };
};

export type PortalSeason = { key: string; season: string; label: string; scale: number[] };

export type PortalCategory = {
  slug: string;
  title: string;
  categoryLabel: string;
  seasons: PortalSeason[];
};

export type PortalEdition = {
  edition: string;
  updatedAt: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
  categories: PortalCategory[];
};

export type PortalPlayer = {
  rank: number | null;
  name: string;
  umbId: string | null;
  playerDocumentId: string | null;
  matchedName: string | null;
  nationalPoints: number | null;
  suspended: string | null;
};

export type PortalPlayers = {
  slug: string;
  season: string | null;
  scale: number[] | null;
  edition: string;
  categoryLabel: string | null;
  count: number;
  withUmbId: number;
  players: PortalPlayer[];
};

export type CheckedRow = {
  position: number;
  name: string;
  umbId: string | null;
  points: number | null;
  matchStatus: "matched" | "ambiguous" | "not-found" | "manual";
  note: string | null;
  player: number | null;
};

export type CheckResult = {
  rows: CheckedRow[];
  problems: string[];
  counts: { rows: number; matched: number; ambiguous: number; notFound: number; manual?: number };
  outsideEdition: boolean;
  scale: number[] | null;
};

export type PortalSubmission = {
  documentId: string;
  status: string;
  slug: string;
  categoryLabel: string | null;
  season: string;
  seasonLabel: string | null;
  editionLabel: string | null;
  seasonOutsideEdition: boolean;
  rowCount: number | null;
  matchedCount: number | null;
  submittedAt: string | null;
  resubmittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

const TOKEN_KEY = "federation_portal_jwt";
const CONTEXT_KEY = "federation_portal_context";

export function saveSession(token: string, context: FederationContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(CONTEXT_KEY);
}

export function readSession(): { token: string | null; context: FederationContext | null } {
  if (typeof window === "undefined") return { token: null, context: null };
  const token = window.localStorage.getItem(TOKEN_KEY);
  const raw = window.localStorage.getItem(CONTEXT_KEY);
  let context: FederationContext | null = null;
  if (raw) {
    try {
      context = JSON.parse(raw) as FederationContext;
    } catch {
      context = null;
    }
  }
  return { token, context };
}

export type PortalResult<T> = { ok: boolean; status: number; data?: T; meta?: any; error?: string };

export async function portalFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<PortalResult<T>> {
  const { method = "GET", body } = options;
  const { token } = readSession();

  try {
    const res = await fetch(`/api/federation-access/${path}`, {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        (res.status === 401 ? "Session expired — sign in again" : `Request failed (${res.status})`);
      return { ok: false, status: res.status, error: message };
    }

    return { ok: true, status: res.status, data: payload?.data as T, meta: payload?.meta };
  } catch {
    return { ok: false, status: 0, error: "Network error — check your connection" };
  }
}

/**
 * Θέσεις -> πόντοι: 1, 2, 3-4, 5-8, 9-16, 17-32… (διπλασιασμός ζώνης), όσες τιμές
 * έχει η κλίμακα της σεζόν — ίδιο σχήμα με τον server (positionBands).
 */
export function pointsForPosition(position: number, scale: number[] | null | undefined): number {
  if (!Number.isFinite(position) || position < 1 || !Array.isArray(scale) || scale.length === 0) return 0;
  const bands: Array<[number, number]> = [
    [1, 1],
    [2, 2],
  ];
  let from = 3;
  let size = 2;
  while (bands.length < scale.length) {
    bands.push([from, from + size - 1]);
    from += size;
    size *= 2;
  }
  for (let i = 0; i < bands.length; i += 1) {
    const [start, end] = bands[i];
    if (position >= start && position <= end) return Number(scale[i] ?? 0) || 0;
  }
  // Πάνω από την τελευταία ζώνη (π.χ. 33ος σε κλίμακα 6 τιμών) παίρνει την
  // τελευταία τιμή — ίδιο με τη μηχανή της κατάταξης (cebRankingEngine).
  return Number(scale[scale.length - 1] ?? 0) || 0;
}

export function scaleText(scale: number[] | null | undefined): string {
  if (!Array.isArray(scale) || scale.length === 0) return "";
  const bands = ["1", "2", "3-4", "5-8", "9-16", "17-32", "33-64", "65-128"];
  return scale
    .map((value, index) => `${bands[index] ?? "—"} → ${value}`)
    .slice(0, scale.length)
    .join(" · ");
}

export function normaliseName(value: string): string {
  return (value || "")
    .toUpperCase()
    .replace(/Ø/g, "O")
    .replace(/Æ/g, "AE")
    .replace(/Å/g, "A")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/ß/g, "SS")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9A-Z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function statusLabel(status: string | null | undefined): { text: string; tone: "ok" | "warn" | "bad" | "plain" } {
  switch (status) {
    case "in-review":
      return { text: "In review", tone: "warn" };
    case "approved":
      return { text: "Approved", tone: "ok" };
    case "published":
      return { text: "Published", tone: "ok" };
    case "withdrawn":
      return { text: "Withdrawn", tone: "plain" };
    case "rejected":
      return { text: "Needs changes", tone: "bad" };
    default:
      return { text: status || "Draft", tone: "plain" };
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
