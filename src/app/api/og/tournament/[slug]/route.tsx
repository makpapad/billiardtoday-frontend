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
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";
const BACKGROUND_IMAGE_URL = `${SITE_URL}/img/og/tournament-default.png`;
const BRAND_LOGO_URL = `${SITE_URL}/logo-billiardtoday.png`;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

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

const formatQualPct = (row: StageCountryStatRow): string =>
  row.entered > 0 ? `${Math.round((row.qualified / row.entered) * 100)}%` : "–";

const formatStageAverage = (row: StageCountryStatRow): string =>
  row.average !== null && Number.isFinite(row.average)
    ? row.average.toFixed(2)
    : "–";

const COLUMN_WIDTHS = { entered: 100, qualified: 104, qualPct: 100, avg: 140 };
const COLUMN_LABELS: Array<{ key: keyof typeof COLUMN_WIDTHS; label: string }> = [
  { key: "entered", label: "ENTERED" },
  { key: "qualified", label: "QUALIFIED" },
  { key: "qualPct", label: "QUAL %" },
  { key: "avg", label: "G.AVG" },
];
const MAX_TABLE_ROWS = 10;

/* Every div below carries an explicit display so satori never trips on a
   multi-child block element. */
const StatTable = ({ rows }: { rows: StageCountryStatRow[] }) => {
  const visibleRows = rows.slice(0, MAX_TABLE_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: 16,
        background: "rgba(4, 12, 24, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 20px",
          background: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2,
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            COUNTRY
          </span>
        </div>
        {COLUMN_LABELS.map((column) => (
          <div
            key={column.key}
            style={{
              display: "flex",
              width: COLUMN_WIDTHS[column.key],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 1.4,
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              {column.label}
            </span>
          </div>
        ))}
      </div>

      {visibleRows.map((row, index) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "7px 20px",
            borderBottom:
              index < visibleRows.length - 1
                ? "1px solid rgba(255, 255, 255, 0.07)"
                : "none",
          }}
        >
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 12 }}>
            {row.flagUrl ? (
              <img
                src={row.flagUrl}
                alt=""
                width={34}
                height={22}
                style={{ width: 34, height: 22, borderRadius: 3, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 34,
                  height: 22,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.18)",
                }}
              />
            )}
            <span
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {truncate(row.label, 28)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: COLUMN_WIDTHS.entered,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
              {row.entered}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: COLUMN_WIDTHS.qualified,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#5eead4" }}>
              {row.qualified}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: COLUMN_WIDTHS.qualPct,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
              {formatQualPct(row)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: COLUMN_WIDTHS.avg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#bae6fd" }}>
              {formatStageAverage(row)}
            </span>
          </div>
        </div>
      ))}

      {hiddenCount > 0 ? (
        <div
          style={{
            display: "flex",
            padding: "6px 20px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.55)",
              fontStyle: "italic",
            }}
          >
            {`... and ${hiddenCount} more ${hiddenCount === 1 ? "country" : "countries"}`}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const StatsContent = ({
  title,
  stageLabel,
  stageDateLabel,
  rows,
}: {
  title: string;
  stageLabel: string;
  stageDateLabel: string;
  rows: StageCountryStatRow[];
}) => {
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
        padding: "32px 56px 30px",
      }}
    >
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
          alt=""
          width={164}
          height={56}
          style={{ width: 164, height: 56, objectFit: "contain" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(7, 17, 31, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: 1,
            }}
          >
            {truncate(stageLabel, 36)}
          </span>
          {stageDateLabel ? (
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.66)",
              }}
            >
              {`· ${truncate(stageDateLabel, 28)}`}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 18,
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontSize: title.length > 62 ? 34 : 40,
            lineHeight: 1.08,
            fontWeight: 800,
            letterSpacing: -0.6,
            color: "#ffffff",
            textShadow: "0 14px 34px rgba(0, 0, 0, 0.3)",
          }}
        >
          {truncate(title, 110)}
        </span>
        <span
          style={{
            marginTop: 6,
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.72)",
          }}
        >
          {`${totalEntered} players · ${rows.length} countries · ${totalQualified} advanced to the next round`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
        <StatTable rows={rows} />
      </div>
    </div>
  );
};

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

  const rootStyle = {
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

  const dateLabel = buildTournamentDateRangeLabel(
    summary.startDate,
    summary.endDate,
  );
  const locationLabel = buildTournamentLocationLabel(summary);
  const stageLabel =
    summary.stages.length > 0
      ? `${summary.stages.length} stage${summary.stages.length === 1 ? "" : "s"}`
      : "Tournament";

  const legacyContent = (
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
              {[
                summary.gameType || "Billiards",
                dateLabel,
                locationLabel,
                stageLabel,
              ]
                .filter((part): part is string => Boolean(part))
                .slice(0, 4)
                .map((part) => (
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
                    <span style={{ fontSize: 25 }}>{truncate(part, 34)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return new ImageResponse(
    statsRows.length > 0 && statsStage ? (
      <div style={rootStyle}>
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
        <StatsContent
          title={title}
          stageLabel={statsStage.title || `Stage ${statsStage.order ?? ""}`.trim()}
          stageDateLabel={formatDateRange(statsStage.startDate, statsStage.endDate) || ""}
          rows={statsRows}
        />
      </div>
    ) : (
      <div style={rootStyle}>
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
        {legacyContent}
      </div>
    ),
    SIZE,
  );
}
