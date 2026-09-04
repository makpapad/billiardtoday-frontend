import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";
import {
  buildTournamentDateRangeLabel,
  buildTournamentLocationLabel,
  buildTournamentTitle,
} from "@/lib/tournamentSeo";
import { resolveTournamentEventSummary } from "@/lib/tournaments";
import {
  buildGroupStandings,
  buildStageMatchGroups,
  computeStageCountryStats,
  formatDateRange,
  formatRecord,
  getMatchOutcome,
  normalizeEntity,
  normalizeGroup,
  toNumber,
  toRelationArray,
  type StageCountryStatRow,
} from "@/app/tournaments/events/utils";
import type {
  GroupStanding,
  NormalizedEventStage,
  NormalizedGroupMatch,
} from "@/app/tournaments/events/types";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

// Node.js runtime (not edge): the OG render fetches the (large) event-data
// payload with `next: { revalidate: 300 }`; the fetch data cache only works
// on the Node runtime. On edge every request re-fetches ~6s of JSON, blowing
// past Facebook's image-fetch timeout. Node keeps repeat renders ~1-2s.


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

// The event-data payload is ~6MB and takes ~5-6s to build on the Strapi side.
// Next 16 dropped implicit fetch caching, so memoize it explicitly — an OG
// render must stay well under Facebook's image-fetch timeout.
const fetchEventPayloadCached = unstable_cache(
  async (documentId: string) => {
    const response = await fetch(
      `${SITE_URL}/event-data/${encodeURIComponent(documentId)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return response.json().catch(() => null);
  },
  ["og-event-data-payload"],
  { revalidate: 300 },
);

// Summary resolution paginates the Strapi bt-events list (500/page) before
// fetching the event by id — several seconds per call. Cache the whole
// resolution; the OG route then only pays for the satori render (~1-2s).
const resolveSummaryCached = unstable_cache(
  async (slugOrLegacy: string) => resolveTournamentEventSummary(slugOrLegacy),
  ["og-event-summary"],
  { revalidate: 300 },
);

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
const MAX_TABLE_ROWS = 8;

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
            padding: "6px 20px",
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
        padding: "28px 56px 22px",
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
          width={150}
          height={52}
          style={{ width: 150, height: 52, objectFit: "contain" }}
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
          marginTop: 14,
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

      <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
        <StatTable rows={rows} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Group-results layout (a single round-robin group's standings)       */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Group share card — dark v6 (approved sample): logo + centered big   */
/* title on top, per-match blocks with a shared date, roomy columns,   */
/* standings table below. Every wrapper is an explicit flex so satori  */
/* never trips on a multi-child block element.                         */
/* ------------------------------------------------------------------ */

const PLAYER_COL_WIDTH = 240;
const WL_COL_WIDTH = 24;
const STAT_COL_WIDTH = 80;
const AVG_COL_WIDTH = 96;
const ROW_GAP = 20;
const S_POS_WIDTH = 20;
const S_STAT_WIDTH = 62;
const S_AVG_WIDTH = 72;
const S_WIDE_WIDTH = 74;
const S_GAP = 10;

const pad2 = (value: number) => String(value).padStart(2, "0");

const greekDayLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return day && month ? `${day}/${month}` : null;
};

const greekTimeLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  return hour || minute ? `${hour}:${minute}` : null;
};

const playerAverage = (
  points: number | null,
  innings: number | null,
): string => {
  if (points === null || innings === null || innings <= 0) return "–";
  return (points / innings).toFixed(3);
};

const GroupResultsContent = ({
  title,
  stageLabel,
  groupLabel,
  standings,
  matches,
}: {
  title: string;
  stageLabel: string;
  groupLabel: string;
  standings: GroupStanding[];
  matches: NormalizedGroupMatch[];
}) => {
  const columnCount =
    matches.length > 8 ? 3 : matches.length > 4 ? 2 : 1;
  const multi = columnCount > 1;
  const playerWidth = multi ? 178 : PLAYER_COL_WIDTH;
  const rowGap = multi ? 12 : ROW_GAP;
  const statWidth = multi ? 56 : STAT_COL_WIDTH;
  const avgWidth = multi ? 70 : AVG_COL_WIDTH;

  const matchColumns: NormalizedGroupMatch[][] = [];
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    matchColumns.push(
      matches.filter((_, index) => index % columnCount === columnIndex),
    );
  }

  // One shared date for the whole card when every match falls on the same
  // day; otherwise each match header carries its own day.
  const dayLabels = Array.from(
    new Set(
      matches
        .map((match) => greekDayLabel(match.dateTime))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const sharedDay = dayLabels.length === 1 ? dayLabels[0] : null;

  const renderFlag = (
    flagUrl: string | null,
    width: number,
    height: number,
  ) =>
    flagUrl ? (
      <img
        src={flagUrl}
        alt=""
        width={width}
        height={height}
        style={{
          width,
          height,
          borderRadius: 2,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    ) : (
      <div
        style={{
          display: "flex",
          width,
          height,
          borderRadius: 2,
          background: "rgba(255, 255, 255, 0.16)",
          flexShrink: 0,
        }}
      />
    );

  const renderMatchRow = (
    match: NormalizedGroupMatch,
    side: "player1" | "player2",
  ) => {
    const player = match[side];
    const opponent = match[side === "player1" ? "player2" : "player1"];
    const outcome = getMatchOutcome(player, opponent);
    const played = outcome !== null;
    const isWin = outcome === "W";
    const isLoss = outcome === "L";
    const flagUrl = getCountryFlagCdnUrl(player.country ?? null, 40);

    return (
      <div
        key={`${match.id}-${side}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: rowGap,
          padding: "3.5px 16px",
          background: played
            ? isWin
              ? "rgba(21, 128, 61, 0.45)"
              : isLoss
                ? "rgba(190, 18, 60, 0.35)"
                : "rgba(255, 255, 255, 0.03)"
            : "rgba(255, 255, 255, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: playerWidth,
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          {renderFlag(flagUrl, 20, 14)}
          <span
            style={{
              fontSize: multi ? 12.5 : 13.5,
              fontWeight: 700,
              color: "#ffffff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {truncate(player.name?.trim() || "–", multi ? 20 : 26)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            width: WL_COL_WIDTH,
            flexShrink: 0,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: played
                ? isWin
                  ? "#86efac"
                  : isLoss
                    ? "#fda4af"
                    : "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.35)",
            }}
          >
            {played ? (isWin ? "W" : isLoss ? "L" : "–") : "–"}
          </span>
        </div>
        {[player.matchPoints, player.points, player.innings].map(
          (value, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                width: statWidth,
                flexShrink: 0,
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: multi ? 12.5 : 13.5,
                  fontWeight: 700,
                  color:
                    value === null || value === 0
                      ? "rgba(255, 255, 255, 0.4)"
                      : "#ffffff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {value ?? "–"}
              </span>
            </div>
          ),
        )}
        <div
          style={{
            display: "flex",
            width: avgWidth,
            flexShrink: 0,
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: multi ? 12.5 : 13.5,
              fontWeight: 700,
              color: "#fcd34d",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {playerAverage(player.points, player.innings)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            width: statWidth,
            flexShrink: 0,
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: multi ? 12.5 : 13.5,
              fontWeight: 700,
              color:
                player.highRun === null || player.highRun === 0
                  ? "rgba(255, 255, 255, 0.4)"
                  : "#ffffff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {player.highRun ?? "–"}
          </span>
        </div>
      </div>
    );
  };

  const renderMatchBlock = (match: NormalizedGroupMatch) => {
    const matchNumber = match.matchNumber !== null ? `M${match.matchNumber}` : null;
    const day = greekDayLabel(match.dateTime);
    const time = greekTimeLabel(match.dateTime);
    const when =
      sharedDay && time
        ? time
        : [day, time].filter(Boolean).join(" · ");
    const heading = [matchNumber, when].filter(Boolean).join("  ·  ");

    return (
      <div
        key={match.id}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          borderRadius: 9,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          background: "rgba(10, 22, 40, 0.85)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: rowGap,
            padding: "3px 16px",
            background: "rgba(255, 255, 255, 0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: playerWidth,
              flexShrink: 0,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: multi ? 9.5 : 10.5,
                fontWeight: 800,
                letterSpacing: 0.6,
                color: "#6ee7d8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {heading || "Group match"}
            </span>
          </div>
          <span
            style={{
              display: "flex",
              width: WL_COL_WIDTH,
              flexShrink: 0,
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            W/L
          </span>
          {["MP", "PTS", "INNS"].map((label) => (
            <span
              key={label}
              style={{
                display: "flex",
                width: statWidth,
                flexShrink: 0,
                justifyContent: "flex-end",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.4,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {label}
            </span>
          ))}
          <span
            style={{
              display: "flex",
              width: avgWidth,
              flexShrink: 0,
              justifyContent: "flex-end",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: "#fcd34d",
            }}
          >
            AVG
          </span>
          <span
            style={{
              display: "flex",
              width: statWidth,
              flexShrink: 0,
              justifyContent: "flex-end",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            HR
          </span>
        </div>
        {renderMatchRow(match, "player1")}
        <div style={{ display: "flex", width: "100%", height: 1, background: "rgba(255,255,255,0.08)" }} />
        {renderMatchRow(match, "player2")}
      </div>
    );
  };

  const sectionLabel = (text: string) => (
    <span
      style={{
        display: "flex",
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        color: "rgba(255, 255, 255, 0.85)",
        marginBottom: 6,
      }}
    >
      {text}
    </span>
  );

  const standingsColumnLabel = (text: string, width: number, color: string) => (
    <span
      style={{
        display: "flex",
        width,
        flexShrink: 0,
        justifyContent: "flex-end",
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 0.6,
        color,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "14px 48px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 860,
          alignSelf: "center",
          minHeight: 0,
        }}
      >
        {/* Top: brand logo + centered tournament title + stage/group meta */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <img
            src={BRAND_LOGO_URL}
            alt=""
            width={120}
            height={32}
            style={{ width: 120, height: 32, objectFit: "contain" }}
          />
          <div
            style={{
              display: "flex",
              width: "100%",
              marginTop: 3,
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: title.length > 46 ? 21 : 25,
                lineHeight: 1.15,
                fontWeight: 900,
                letterSpacing: 0.3,
                color: "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 860,
              }}
            >
              {truncate(title, 74)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: "#6ee7d8",
              }}
            >
              {truncate(stageLabel, 30)}
            </span>
            <span style={{ display: "flex", fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
              ·
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: "#6ee7d8",
              }}
            >
              {truncate(groupLabel, 30)}
            </span>
            {sharedDay ? (
              <>
                <span style={{ display: "flex", fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
                  ·
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    color: "rgba(255, 255, 255, 0.85)",
                  }}
                >
                  {sharedDay}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Matches — one rounded block per pairing */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 12,
          }}
        >
          {sectionLabel(
            matches.length === 1 ? "Group match" : "Group matches",
          )}
          {columnCount === 1 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {matches.map(renderMatchBlock)}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                borderRadius: 9,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                background: "rgba(10, 22, 40, 0.85)",
              }}
            >
              {matchColumns.map((columnMatches, columnIndex) => (
                <div
                  key={columnIndex}
                  style={{
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    gap: 9,
                    padding: "9px 10px",
                    borderLeft:
                      columnIndex > 0
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : "none",
                  }}
                >
                  {columnMatches.map(renderMatchBlock)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Final standings */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            marginTop: 13,
          }}
        >
          {sectionLabel("Final standings")}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              borderRadius: 9,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              background: "rgba(10, 22, 40, 0.85)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: S_GAP,
                padding: "4px 16px",
                background: "rgba(20, 83, 45, 0.95)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: playerWidth,
                  flexShrink: 0,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: 0.6,
                    color: "#ffffff",
                  }}
                >
                  PLAYER
                </span>
              </div>
              <span
                style={{
                  display: "flex",
                  width: S_POS_WIDTH,
                  flexShrink: 0,
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  color: "#ffffff",
                }}
              >
                #
              </span>
              {standingsColumnLabel("RECORD", S_WIDE_WIDTH, "#ffffff")}
              {standingsColumnLabel("MP", S_STAT_WIDTH, "#ffffff")}
              {standingsColumnLabel("PTS", S_STAT_WIDTH, "#ffffff")}
              {standingsColumnLabel("INNS", S_STAT_WIDTH, "#ffffff")}
              {standingsColumnLabel("AVG", S_AVG_WIDTH, "#fcd34d")}
              {standingsColumnLabel("HR", S_STAT_WIDTH, "#ffffff")}
              {standingsColumnLabel("BEST", S_WIDE_WIDTH, "#ffffff")}
            </div>

            {standings.map((standing, index) => {
              const flagUrl = getCountryFlagCdnUrl(standing.playerCountry, 40);
              return (
                <div
                  key={standing.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: S_GAP,
                    padding: "3px 16px",
                    borderBottom:
                      index < standings.length - 1
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      width: playerWidth,
                      flexShrink: 0,
                      minWidth: 0,
                    }}
                  >
                    {renderFlag(flagUrl, 20, 14)}
                    <span
                      style={{
                        fontSize: multi ? 12 : 13,
                        fontWeight: 700,
                        color: "#ffffff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {truncate(standing.playerName, multi ? 20 : 26)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: S_POS_WIDTH,
                      flexShrink: 0,
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#6ee7d8",
                      }}
                    >
                      {standing.place}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: S_WIDE_WIDTH,
                      flexShrink: 0,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: multi ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: "rgba(255, 255, 255, 0.95)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatRecord(standing.record)}
                    </span>
                  </div>
                  {[standing.totalMatchPoints, standing.totalPoints, standing.totalInnings].map(
                    (value, statIndex) => (
                      <div
                        key={statIndex}
                        style={{
                          display: "flex",
                          width: S_STAT_WIDTH,
                          flexShrink: 0,
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontSize: multi ? 11.5 : 12.5,
                            fontWeight: 700,
                            color: "#ffffff",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ),
                  )}
                  <div
                    style={{
                      display: "flex",
                      width: S_AVG_WIDTH,
                      flexShrink: 0,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: multi ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: "#fcd34d",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {standing.average !== null &&
                      Number.isFinite(standing.average)
                        ? standing.average.toFixed(3)
                        : "–"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: S_STAT_WIDTH,
                      flexShrink: 0,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: multi ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: "#ffffff",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {standing.highRun ?? "–"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: S_WIDE_WIDTH,
                      flexShrink: 0,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: multi ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: "rgba(255, 255, 255, 0.9)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {standing.bestAverage !== null &&
                      Number.isFinite(standing.bestAverage)
                        ? standing.bestAverage.toFixed(3)
                        : "–"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const summary = await resolveSummaryCached(slug);

  if (!summary) {
    return new Response("Tournament not found", { status: 404 });
  }

  const title = buildTournamentTitle(summary);
  const requestUrl = new URL(request.url);
  const preferredStageDocumentId = requestUrl.searchParams.get("stage");
  const groupParam = requestUrl.searchParams.get("group");

  let statsRows: StageCountryStatRow[] = [];
  let statsStage: NormalizedEventStage | null = null;
  let groupStandings: GroupStanding[] = [];
  let groupStage: NormalizedEventStage | null = null;
  let groupMatchesList: NormalizedGroupMatch[] = [];
  let groupDisplayLabel = groupParam ? `Group ${groupParam}` : "";

  const eventPayload = await fetchEventPayloadCached(summary.documentId);
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

    // A single round-robin group: filter the stage's raw group matches by
    // group label (preferred) or group number, then compute its standings.
    if (groupParam) {
      const targetStages = preferredStageDocumentId
        ? stages.filter((stage) => stage.documentId === preferredStageDocumentId)
        : stages;
      const numericGroup = Number(groupParam);
      for (const stage of targetStages) {
        const groupMatches: NormalizedGroupMatch[] = stage.groups.filter(
          (match) =>
            (match.label !== null && match.label === groupParam) ||
            (!Number.isNaN(numericGroup) && match.number === numericGroup),
        );
        if (groupMatches.length === 0) continue;
        const builtGroups = buildStageMatchGroups(groupMatches);
        const allMatches = builtGroups.flatMap((group) => group.matches);
        if (allMatches.length === 0) continue;
        const standings = buildGroupStandings(allMatches, {
          artistic: false,
          suppressBestAverage: false,
        });
        if (standings.length > 0) {
          groupStandings = standings;
          groupStage = stage;
          groupMatchesList = [...groupMatches].sort(
            (a, b) =>
              (a.dateTime ?? "").localeCompare(b.dateTime ?? "") ||
              (a.matchNumber ?? Number.MAX_SAFE_INTEGER) -
                (b.matchNumber ?? Number.MAX_SAFE_INTEGER),
          );
          if (groupMatches[0]?.label) {
            groupDisplayLabel = `Group ${groupMatches[0].label}`;
          }
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
      "linear-gradient(135deg, #0a1c3d 0%, #0d3a55 30%, #0d6b66 62%, #17947f 100%)",
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
    groupStandings.length > 0 && groupStage ? (
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
            opacity: 0.12,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(3, 8, 20, 0.66) 0%, rgba(3, 8, 20, 0.18) 40%, rgba(3, 8, 20, 0.26) 60%, rgba(3, 8, 20, 0.6) 100%)",
          }}
        />
        <GroupResultsContent
          title={title}
          stageLabel={groupStage.title || `Stage ${groupStage.order ?? ""}`.trim()}
          groupLabel={groupDisplayLabel}
          standings={groupStandings}
          matches={groupMatchesList}
        />
      </div>
    ) : statsRows.length > 0 && statsStage ? (
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
