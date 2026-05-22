export const buildExternalLiveTablesHref = (
  eventId: string | null | undefined,
  options?: { table?: string | number | null },
) => {
  if (!eventId) return null;

  const params = new URLSearchParams();
  params.set("table", String(options?.table ?? 1));
  return `/tournaments/live/soop?${params.toString()}`;
};

export const getExternalLiveTablesCompetitionIdx = (
  _eventId?: string | null,
) => null;
