export type LiveVideoEntry = {
  id: string;
  videoId: string;
  provider: string;
  url: string | null;
  title: string | null;
  label: string | null;
  youtubeUrl: string | null;
  isPrimary: boolean;
  sortOrder: number | null;
};

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePlaybackUrl = (provider: string, rawUrl: string): string => {
  if (provider !== "mediamtx" && provider !== "webrtc") return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "rtsp:") return rawUrl;

    const path = url.pathname && url.pathname !== "/" ? url.pathname : "/btdroitcamera";
    return `https://${url.hostname}${path.replace(/\/?$/, "/")}`;
  } catch {
    return rawUrl;
  }
};

export function extractYouTubeVideoId(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  if (YOUTUBE_ID_PATTERN.test(raw)) return raw;

  try {
    const candidate = raw.includes("://") ? raw : `https://${raw}`;
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_PATTERN.test(shortId) ? shortId : null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      const watchId = asTrimmedString(url.searchParams.get("v"));
      if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) return watchId;

      const pathSegments = url.pathname.split("/").filter(Boolean);
      const embedId =
        pathSegments[0] === "embed" || pathSegments[0] === "shorts"
          ? pathSegments[1] ?? ""
          : "";
      if (YOUTUBE_ID_PATTERN.test(embedId)) return embedId;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeLiveVideoEntries(rawValue: unknown): LiveVideoEntry[] {
  const items = Array.isArray(rawValue)
    ? rawValue
    : rawValue && typeof rawValue === "object" && Array.isArray((rawValue as { items?: unknown[] }).items)
      ? (rawValue as { items: unknown[] }).items
      : asTrimmedString(rawValue)
        ? [rawValue]
        : [];

  const normalized = items
    .map((entry, index): LiveVideoEntry | null => {
      if (typeof entry === "string") {
        const videoId = extractYouTubeVideoId(entry);
        if (!videoId) return null;
        return {
          id: `${videoId}-${index}`,
          videoId,
          provider: "youtube",
          url: null,
          title: null,
          label: null,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          isPrimary: index === 0,
          sortOrder: index,
        };
      }

      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const provider = asTrimmedString(record.provider)?.toLowerCase() ?? "youtube";
      const streamUrl = asTrimmedString(
        record.url ??
          record.streamUrl ??
          record.webrtcUrl ??
          record.hlsUrl ??
          record.embedUrl,
      );
      const sortOrder = toFiniteNumber(record.sortOrder ?? record.order ?? index);

      if (provider !== "youtube") {
        if (!streamUrl) return null;
        const playbackUrl = normalizePlaybackUrl(provider, streamUrl);
        const id =
          asTrimmedString(record.id) ??
          asTrimmedString(record.key) ??
          `${provider}-${sortOrder ?? index}`;
        return {
          id,
          videoId: playbackUrl,
          provider,
          url: playbackUrl,
          title: asTrimmedString(record.title),
          label: asTrimmedString(record.label),
          youtubeUrl: null,
          isPrimary:
            record.isPrimary === true ||
            record.primary === true ||
            sortOrder === 0 ||
            index === 0,
          sortOrder,
        };
      }

      const rawVideoId =
        record.videoId ??
        record.youtubeVideoId ??
        record.youtubeId ??
        record.url ??
        record.youtubeUrl;
      const videoId = extractYouTubeVideoId(rawVideoId);
      if (!videoId) return null;

      return {
        id:
          asTrimmedString(record.id) ??
          asTrimmedString(record.key) ??
          `${videoId}-${sortOrder ?? index}`,
        videoId,
        provider: "youtube",
        url: null,
        title: asTrimmedString(record.title),
        label: asTrimmedString(record.label),
        youtubeUrl:
          asTrimmedString(record.youtubeUrl) ??
          asTrimmedString(record.url) ??
          `https://www.youtube.com/watch?v=${videoId}`,
        isPrimary:
          record.isPrimary === true ||
          record.primary === true ||
          sortOrder === 0 ||
          index === 0,
        sortOrder,
      };
    })
    .filter((entry): entry is LiveVideoEntry => Boolean(entry));

  return normalized.sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return left.videoId.localeCompare(right.videoId);
  });
}
