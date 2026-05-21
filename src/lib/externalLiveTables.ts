const TEMP_COMPETITION_BY_EVENT_ID: Record<string, string> = {
  "ac6fd1dd-487b-409d-9424-606d8b683ed8": "204",
};

export const getExternalLiveTablesCompetitionIdx = (
  eventId: string | null | undefined,
) => {
  const key = String(eventId || "").trim();
  return key ? TEMP_COMPETITION_BY_EVENT_ID[key] ?? null : null;
};

export const buildExternalLiveTablesHref = (
  eventId: string | null | undefined,
  options?: { table?: string | number | null },
) => {
  const competitionIdx = getExternalLiveTablesCompetitionIdx(eventId);
  if (!competitionIdx || !eventId) return null;

  const params = new URLSearchParams();
  params.set("eventId", eventId);
  params.set("competitionIdx", competitionIdx);
  params.set("table", String(options?.table ?? 1));
  return `/tournaments/live/soop?${params.toString()}`;
};
