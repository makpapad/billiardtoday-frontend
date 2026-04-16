import { SERVER_API_URL } from "@/lib/api";

export interface PresenceEntry {
  screenId: string;
  screenName: string | null;
  keyboardMode: "1" | "2" | "3" | "4" | null;
  lastSeen: number | null;
  version: string | null;
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

function unwrapNode(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const node = value as Record<string, unknown>;
  if (node.data) return unwrapNode(node.data);
  if (node.attributes) return unwrapNode(node.attributes);
  return node;
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
    screenName: asString(row.screenName),
    keyboardMode:
      row.keyboardMode === "1" ||
      row.keyboardMode === "2" ||
      row.keyboardMode === "3" ||
      row.keyboardMode === "4"
        ? row.keyboardMode
        : null,
    lastSeen: asNumber(row.lastSeen),
    version: asString(row.version),
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

async function fetchScreenNameMap(
  screenIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(
    new Set(screenIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (uniqueIds.length === 0) return new Map();

  const params = new URLSearchParams();
  uniqueIds.forEach((screenId, index) => {
    params.set(`filters[$or][${index}][identifier][$eq]`, screenId);
  });
  params.set("pagination[pageSize]", String(uniqueIds.length));
  params.append("fields[0]", "identifier");
  params.append("fields[1]", "name");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = process.env.STRAPI_API_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${SERVER_API_URL}/api/screens?${params.toString()}`,
    {
      cache: "no-store",
      headers,
    },
  );
  if (!response.ok) return new Map();

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  const result = new Map<string, string>();

  rows.forEach((row: unknown) => {
    const node = unwrapNode(row) ?? {};
    const identifier = asString(node.identifier);
    const name = asString(node.name);
    if (identifier && name) {
      result.set(identifier, name);
    }
  });

  return result;
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

  const entries = json
    .map((entry) => normalizePresenceEntry(entry))
    .filter((entry): entry is PresenceEntry => entry !== null)
    .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
  const screenNameMap = await fetchScreenNameMap(
    entries.map((entry) => entry.screenId),
  );

  return entries.map((entry) => ({
    ...entry,
    screenName: screenNameMap.get(entry.screenId) ?? entry.screenName,
  }));
}
