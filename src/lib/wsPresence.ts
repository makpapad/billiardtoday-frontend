export interface PresenceEntry {
  screenId: string;
  lastSeen: number | null;
  version: string | null;
  venue: string | null;
  ip: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}

const DEFAULT_WS_URL = "wss://ws.billiardtoday.com/ws";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getPresenceEndpoint(): string {
  const rawUrl =
    process.env.WS_PRESENCE_URL ||
    process.env.NEXT_PUBLIC_WS_ENDPOINT ||
    process.env.NEXT_PUBLIC_WS_URL ||
    DEFAULT_WS_URL;
  const url = new URL(rawUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  url.pathname = "/presence";
  url.search = "";

  return url.toString();
}

export function normalizePresenceEntry(raw: unknown): PresenceEntry | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const screenId = asString(row.screenId);
  if (!screenId) return null;

  return {
    screenId,
    lastSeen: asNumber(row.lastSeen),
    version: asString(row.version),
    venue: asString(row.venue),
    ip: asString(row.ip),
    isp: asString(row.isp),
    org: asString(row.org),
    asn: asString(row.asn),
    country: asString(row.country),
    countryCode: asString(row.countryCode),
    region: asString(row.region),
    city: asString(row.city),
  };
}

export async function fetchPresenceEntries(): Promise<PresenceEntry[]> {
  const response = await fetch(getPresenceEndpoint(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Presence request failed with status ${response.status}`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) return [];

  return json
    .map((entry) => normalizePresenceEntry(entry))
    .filter((entry): entry is PresenceEntry => entry !== null)
    .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
}
