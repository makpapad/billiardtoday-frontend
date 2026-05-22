const UMB_VIDEO_EVENT_IDS = new Set([
  "ac6fd1dd-487b-409d-9424-606d8b683ed8",
]);

export const buildExternalLiveTablesHref = (
  eventId: string | null | undefined,
  options?: { table?: string | number | null },
) => {
  const normalizedEventId = String(eventId || "").trim();
  if (!UMB_VIDEO_EVENT_IDS.has(normalizedEventId)) return null;

  const params = new URLSearchParams();
  params.set("table", String(options?.table ?? 1));
  return `/tournaments/live/soop?${params.toString()}`;
};

export const getExternalLiveTablesCompetitionIdx = (
  _eventId?: string | null,
) => null;
