import { ImageResponse } from "next/og";
import {
  buildTournamentDateRangeLabel,
  buildTournamentLocationLabel,
  buildTournamentTitle,
} from "@/lib/tournamentSeo";
import { resolveTournamentEventSummary } from "@/lib/tournaments";
import {
  computeStageCountryStats,
  formatDateRange,
  normalizeEntity,
  normalizeGroup,
  toNumber,
  toRelationArray,
  type StageCountryStatRow,
} from "@/app/tournaments/events/utils";
import type { NormalizedEventStage } from "@/app/tournaments/events/types";

export const runtime = "edge";

const SIZE = {
  width: 1200,
  height: 630,
};
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";
const BACKGROUND_IMAGE_URL = `${SITE_URL}/img/og/tournament-default.png`;
const BRAND_LOGO_URL = `${SITE_URL}/logo-billiardtoday.png`;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

const MAX_TABLE_ROWS = 10;
const COLUMN_WIDTHS = { entered: 104, qualified: 108, qualPct: 110, avg: 148 };

/* ------------------------------------------------------------------ */
/* Stage normalization (mirrors TournamentEventsContent eventStages)   */
/* ------------------------------------------------------------------ */

const normalizeEventStages = (
  rawStages: unknown,
): NormalizedEventStage[] => {
  const stagesArray = toRelationArray(rawStages);
  return stagesArray
    .map((stage, index) => {
      const normalizedStage = normalizeEntity(stage, `stage-${index}`);
      const title =
        typeof normalizedStage.title === "string"
          ? normalizedStage.title.trim()
          : "";
      const startDate =
        typeof normalizedStage.start_date === "string"
          ? normalizedStage.start_date
          : null;
      const endDate =
        typeof normalizedStage.end_date === "string"
          ? normalizedStage.end_date
          : null;
      const order = toNumber(normalizedStage.order);
      const isFinal = Boolean(normalizedStage.is_final);
      const stageType =
        typeof normalizedStage.stage_type === "string"
          ? normalizedStage.stage_type.trim().toLowerCase()
          : null;

      const groups = toRelationArray(normalizedStage.groups)
        .map((group, groupIndex) =>
          normalizeGroup(group, `${normalizedStage.id}-group-${groupIndex}`),
        )
        .sort((a, b) => {
          if (a.number !== null && b.number !== null) return a.number - b.number;
          if (a.number !== null) return -1;
          if (b.number !== null) return 1;
          return a.id.localeCompare(b.id);
        });

      return {
        id: normalizedStage.id,
        documentId: normalizedStage.documentId,
        title,
        startDate,
        endDate,
        order,
        isFinal,
        stageType,
        timetableConfig: null,
        groups,
        results: [],
      };
    })
    .sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.id.localeCompare(b.id);
    });
};

const fetchEventPayload = async (documentId: string): Promise<unknown> => {
  const response = await fetch(
    `${SITE_URL}/event-data/${encodeURIComponent(documentId)}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    },
  );
  if (!response.ok) return null;
  return response.json().catch(() => null);
};

const formatStageDateLabel = (stage: NormalizedEventStage): string =>
  formatDateRange(stage.startDate, stage.endDate) || "";

const formatQualPct = (row: StageCountryStatRow): string =>
  row.entered > 0 ? `${Math.round((row.qualified / row.entered) * 100)}%` : "–";

const formatAvg = (row: StageCountryStatRow): string =>
  row.average !== null && Number.isFinite(row.average)
    ? row.average.toFixed(2)
    : "–";

/* ------------------------------------------------------------------ */
/* Legacy layout (no country stats available)                          */
/* ------------------------------------------------------------------ */

type LegacyDetails = {
  gameType: string | null;
  dateLabel: string | null;
  locationLabel: string | null;
  stageLabel: string;
};

function LegacyContent({
  title,
  details,
}: {
  title: string;
  details: LegacyDetails;
}) {
  const detailParts = [
    details.gameType || "Billiards",
    details.dateLabel,
    details.locationLabel,
    details.stageLabel,
  ].filter((part): part is string => Boolean(part));

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "58px 70px",
      }}
    >
      <div
        style={{
          width: 690,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 14,
              padding: "12px 16px",
              borderRadius: 22,
              background: "rgba(7, 17, 31, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.64)",
                textTransform: "uppercase",
                letterSpacing: 1.6,
              }}
            >
              Powered by
            </span>
            <img
              src={BRAND_LOGO_URL}
              alt=""
              width={188}
              height={64}
              style={{ width: 188, height: 64, objectFit: "contain" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontSize: title.length > 52 ? 56 : 64,
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: -1,
                textShadow: "0 18px 40px rgba(0, 0, 0, 0.32)",
              }}
            >
              {truncate(title, 88)}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                fontSize: 25,
                color: "rgba(255, 255, 255, 0.78)",
              }}
            >
              {detailParts.slice(0, 4).map((part) => (
                <div
                  key={part}
                  style={{
                    display: "flex",
                    padding: "10px 16px",
                    borderRadius: 999,
                    background: "rgba(255, 255, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                  }}
                >
                  {truncate(part, 34)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Country-stats layout                                                */
/* ------------------------------------------------------------------ */

const COL_LABELS: Array<{ key: keyof typeof COLUMN_WIDTHS; label: string }> = [
  { key: "entered", label: "Entered" },
  { key: "qualified", label: "Qualified" },
  { key: "qualPct", label: "Qual %" },
  { key: "avg", label: "G. AVG" },
];

function StatTable({ rows }: { rows: StageCountryStatRow[] }) {
  const visibleRows = rows.slice(0, MAX_TABLE_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        background: "rgba(4, 12, 24, 0.62)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 22px",
          background: "rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 2,
            color: "rgba(255, 255, 255, 0.62)",
            textTransform: "uppercase",
          }}
        >
          Country
        </div>
        {COL_LABELS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              width: COLUMN_WIDTHS[key],
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 1.6,
              color: "rgba(255, 255, 255, 0.62)",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {visibleRows.map((row, index) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 22px",
            borderBottom:
              index < visibleRows.length - 1
                ? "1px solid rgba(255, 255, 255, 0.08)"
                : "none",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            {row.flagUrl ? (
              <img
                src={row.flagUrl}
                alt=""
                width={36}
                height={24}
                style={{ width: 36, height: 24, borderRadius: 3, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 24,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.18)",
                }}
              />
            )}
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                whiteSpace: "nowrap",
              }}
            >
              {truncate(row.label, 30)}
            </div>
          </div>
          <div
            style={{
              width: COLUMN_WIDTHS.entered,
              fontSize: 19,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.entered}
          </div>
          <div
            style={{
              width: COLUMN_WIDTHS.qualified,
              fontSize: 19,
              fontWeight: 700,
              color: "#5eead4",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.qualified}
          </div>
          <div
            style={{
              width: COLUMN_WIDTHS.qualPct,
              fontSize: 19,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatQualPct(row)}
          </div>
          <div
            style={{
              width: COLUMN_WIDTHS.avg,
              fontSize: 19,
              fontWeight: 700,
              color: "rgba(186, 230, 253, 0.95)",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatAvg(row)}
          </div>
        </div>
      ))}

      {hiddenCount > 0 ? (
        <div
          style={{
            padding: "8px 22px",
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.55)",
            fontStyle: "italic",
          }}
        >
          … and {hiddenCount} more {hiddenCount === 1 ? "country" : "countries"}
        </div>
      ) : null}
    </div>
  );
}

function StatsContent({
  title,
  stageLabel,
  stageDateLabel,
  rows,
}: {
  title: string;
  stageLabel: string;
  stageDateLabel: string;
  rows: StageCountryStatRow[];
}) {
  const totalEntered = rows.reduce((sum, row) => sum + row.entered, 0);
  const totalQualified = rows.reduce((sum, row) => sum + row.qualified, 0);

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "36px 56px 34px",
      }}
    >
      {/* Top row: logo + stage badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <img
          src={BRAND_LOGO_URL}
          alt="Billiard Today"
          width={168}
          height={58}
          style={{ width: 168, height: 58, objectFit: "contain" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "9px 18px",
            borderRadius: 999,
            background: "rgba(7, 17, 31, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <span
            style={{
              fontSize: 19,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: 1.2,
            }}
          >
            {truncate(stageLabel, 40)}
          </span>
          {stageDateLabel ? (
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.66)",
              }}
            >
              · {truncate(stageDateLabel, 30)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: 22,
          fontSize: title.length > 64 ? 34 : 40,
          lineHeight: 1.08,
          fontWeight: 800,
          letterSpacing: -0.6,
          color: "#ffffff",
          textShadow: "0 14px 34px rgba(0, 0, 0, 0.3)",
        }}
      >
        {truncate(title, 110)}
      </div>

      {/* Summary line */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 17,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        <span>{totalEntered} players</span>
        <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
        <span>{rows.length} countries</span>
        <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
        <span style={{ color: "#5eead4" }}>{totalQualified} advanced</span>
      </div>

      {/* Table */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
        <StatTable rows={rows} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    return new Response("Tournament not found", { status: 404 });
  }

  const title = buildTournamentTitle(summary);
  const requestUrl = new URL(request.url);
  const preferredStageDocumentId = requestUrl.searchParams.get("stage");

  let statsRows: StageCountryStatRow[] = [];
  let statsStage: NormalizedEventStage | null = null;

  const eventPayload = await fetchEventPayload(summary.documentId);
  const rawStages =
    (eventPayload as { data?: { event_stages?: unknown } } | null)?.data
      ?.event_stages ?? null;

  if (rawStages) {
    const stages = normalizeEventStages(rawStages);
    if (preferredStageDocumentId) {
      const index = stages.findIndex(
        (stage) => stage.documentId === preferredStageDocumentId,
      );
      if (index >= 0) {
        statsRows = computeStageCountryStats(stages[index], stages[index + 1]);
        if (statsRows.length > 0) statsStage = stages[index];
      }
    }
    if (statsRows.length === 0) {
      // Last fully-played round-robin stage that feeds a next stage.
      for (let index = stages.length - 2; index >= 0; index -= 1) {
        const rows = computeStageCountryStats(stages[index], stages[index + 1]);
        if (rows.length > 0) {
          statsRows = rows;
          statsStage = stages[index];
          break;
        }
      }
    }
  }

  const sharedStyle = {
    width: "100%" as const,
    height: "100%" as const,
    display: "flex" as const,
    position: "relative" as const,
    overflow: "hidden" as const,
    background:
      "linear-gradient(135deg, #07111f 0%, #10263c 44%, #0f766e 100%)",
    color: "white",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const backgroundLayers = (
    <>
      <img
        src={BACKGROUND_IMAGE_URL}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.62,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(90deg, rgba(7, 17, 31, 0.96) 0%, rgba(7, 17, 31, 0.82) 48%, rgba(7, 17, 31, 0.22) 100%), radial-gradient(circle at 82% 22%, rgba(45, 212, 191, 0.24), transparent 28%)",
        }}
      />
    </>
  );

  if (statsRows.length > 0 && statsStage) {
    return new ImageResponse(
      (
        <div style={sharedStyle}>
          {backgroundLayers}
          <StatsContent
            title={title}
            stageLabel={statsStage.title || `Stage ${statsStage.order ?? ""}`.trim()}
            stageDateLabel={formatStageDateLabel(statsStage)}
            rows={statsRows}
          />
        </div>
      ),
      SIZE,
    );
  }

  const dateLabel = buildTournamentDateRangeLabel(
    summary.startDate,
    summary.endDate,
  );
  const locationLabel = buildTournamentLocationLabel(summary);
  const stageLabel =
    summary.stages.length > 0
      ? `${summary.stages.length} stage${summary.stages.length === 1 ? "" : "s"}`
      : "Tournament";

  return new ImageResponse(
    (
      <div style={sharedStyle}>
        {backgroundLayers}
        <LegacyContent
          title={title}
          details={{ gameType: summary.gameType, dateLabel, locationLabel, stageLabel }}
        />
      </div>
    ),
    SIZE,
  );
}
