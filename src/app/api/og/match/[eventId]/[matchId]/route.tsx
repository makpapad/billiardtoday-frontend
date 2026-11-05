import { ImageResponse } from "next/og";

/**
 * Κάρτα αγώνα για share (1080×1350, rendered 2x).
 *
 * Δεδομένα: το ίδιο normalized payload της δημόσιας σελίδας
 * (`/api/events/<eventId>`), ώστε η κάρτα να δείχνει ό,τι ακριβώς δείχνει
 * και ο πίνακας αγώνων. Χρησιμοποιείται από το κουμπί «Share» κάθε αγώνα.
 */

export const runtime = "nodejs";
export const revalidate = 60;

const SCALE = 2;
const CARD = { width: 1080, height: 1350 };
const SIZE = { width: CARD.width * SCALE, height: CARD.height * SCALE };
// Οριζόντια κάρτα (1.90:1) για προεπισκοπήσεις συνδέσμων: το Facebook/WhatsApp
// κόβουν την κάθετη 4:5, οπότε το og:image θέλει landscape.
const WIDE = { width: 1200, height: 630 };
const WIDE_SIZE = { width: WIDE.width * SCALE, height: WIDE.height * SCALE };
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";
/** Το λευκό λογότυπο (το loading είναι σκούρο). */
const WHITE_LOGO_URL = `${SITE_URL}/logo-billiardtoday.png`;

const s = (value: number) => Math.round(value * SCALE);

const toNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const formatNumber = (value: number | null, digits = 0): string => {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const average = (points: number | null, innings: number | null): string => {
  if (points === null || innings === null || innings <= 0) return "—";
  return (points / innings).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
};

const flagUrl = (country: string | null): string | null => {
  const code = (country || "").trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;
  return `https://flagcdn.com/w160/${code}.png`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

type PlayerView = {
  name: string;
  country: string;
  flag: string | null;
  points: number | null;
  innings: number | null;
  highRun: number | null;
  matchPoints: number | null;
  average: string;
};

type MatchView = {
  eventTitle: string;
  stageTitle: string;
  groupLabel: string;
  matchNumber: number | null;
  targetPoints: number | null;
  dateTime: string | null;
  player1: PlayerView;
  player2: PlayerView;
  hasResult: boolean;
};

/** Ημερομηνία/ώρα σε ώρα Βελγίου (το venue), για την κάρτα πριν τον αγώνα. */
const formatMatchDateTime = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .toUpperCase();
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${day} · ${time}`;
};

const buildPlayer = (raw: any, prefix: "player1" | "player2"): PlayerView => {
  const relation = raw?.[prefix] ?? null;
  const name =
    text(relation?.full_name) ||
    text(relation?.full_name_en) ||
    text(raw?.[`${prefix}_local_name`]) ||
    `${prefix === "player1" ? "Player" : "Player"} 2`;
  const country =
    text(relation?.country) || text(raw?.[`${prefix}_local_country`]);
  const points = toNumber(raw?.[`${prefix}_points`]);
  const innings = toNumber(raw?.[`${prefix}_innings`]);
  const highRun = toNumber(raw?.[`${prefix}_high_run`]);
  const matchPoints = toNumber(raw?.[`${prefix}_match_points`]);
  return {
    name,
    country: country.toUpperCase(),
    flag: flagUrl(country),
    points,
    innings,
    highRun,
    matchPoints,
    average: average(points, innings),
  };
};

const findMatch = (event: any, matchId: string): MatchView | null => {
  const stages = Array.isArray(event?.event_stages)
    ? event.event_stages
    : Array.isArray(event?.stages)
      ? event.stages
      : [];
  for (const stage of stages) {
    const rows = Array.isArray(stage?.groups) ? stage.groups : [];
    const hit = rows.find(
      (row: any) =>
        String(row?.documentId ?? row?.id ?? "") === String(matchId),
    );
    if (!hit) continue;
    const player1 = buildPlayer(hit, "player1");
    const player2 = buildPlayer(hit, "player2");
    const hasResult =
      (player1.points ?? 0) > 0 ||
      (player2.points ?? 0) > 0 ||
      (player1.matchPoints ?? 0) > 0 ||
      (player2.matchPoints ?? 0) > 0;
    return {
      eventTitle: text(event?.title) || "Billiard Today",
      stageTitle:
        text(stage?.title) ||
        (text(stage?.stage_type) ? text(stage.stage_type).toUpperCase() : ""),
      groupLabel: text(hit?.group_label),
      matchNumber: toNumber(hit?.match_number),
      targetPoints:
        toNumber(stage?.target_points) || toNumber(event?.target_points) || null,
      dateTime: text(hit?.date_time) || null,
      player1,
      player2,
      hasResult,
    };
  }
  return null;
};

const formatSeason = (event: any): string => {
  const season = toNumber(event?.season);
  return season ? String(season) : "";
};

const fallbackCard = (message: string) =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg,#0f172a 0%,#12263f 46%,#1d4ed8 100%)",
          color: "#ffffff",
          fontSize: s(44),
          fontWeight: 700,
          padding: s(80),
          textAlign: "center",
        }}
      >
        {message}
      </div>
    ),
    SIZE,
  );

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string; matchId: string }> },
) {
  const { eventId, matchId } = await context.params;

  let event: any = null;
  try {
    const res = await fetch(`${SITE_URL}/api/events/${encodeURIComponent(eventId)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const payload = await res.json();
      event = payload?.data ?? null;
    }
  } catch {
    event = null;
  }

  const match = event ? findMatch(event, matchId) : null;
  if (!match) {
    return fallbackCard("Match not found");
  }

  const winner =
    (match.player1.points ?? 0) > (match.player2.points ?? 0)
      ? 1
      : (match.player2.points ?? 0) > (match.player1.points ?? 0)
        ? 2
        : 0;

  const subtitleBits = [
    "3 Cushion",
    match.hasResult
      ? match.player1.innings !== null
        ? `${formatNumber(match.player1.innings)} innings`
        : null
      : formatMatchDateTime(match.dateTime),
    match.targetPoints ? `first to ${formatNumber(match.targetPoints)} points` : null,
  ].filter(Boolean) as string[];

  const chip = [match.groupLabel, match.matchNumber ? `Match ${match.matchNumber}` : null]
    .filter(Boolean)
    .join(" · ");

  const statsRows = [
    { label: match.player1.name, ...match.player1 },
    { label: match.player2.name, ...match.player2 },
  ];

  const cell = (value: string) => (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        fontSize: s(34),
        fontWeight: 800,
        color: "#ffffff",
      }}
    >
      {value}
    </div>
  );

  const requestUrl = new URL(_request.url);
  const isWide = requestUrl.searchParams.get("format") === "wide";

  const nameBlock = (player: PlayerView, align: "left" | "right") => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        width: s(330),
        gap: s(10),
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: s(46),
          fontWeight: 900,
          lineHeight: 1.05,
          textAlign: align,
          color: "#ffffff",
        }}
      >
        {player.name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: s(22),
          fontWeight: 700,
          letterSpacing: s(2),
          color: "rgba(255,255,255,0.65)",
        }}
      >
        {player.country ?? ""}
      </div>
    </div>
  );

  const statLine = (player: PlayerView) =>
    [
      player.average ? `AVG ${player.average}` : null,
      player.highRun !== null ? `HR ${formatNumber(player.highRun)}` : null,
      player.innings !== null ? `INN ${formatNumber(player.innings)}` : null,
      player.matchPoints !== null ? `MP ${formatNumber(player.matchPoints)}` : null,
    ]
      .filter(Boolean)
      .join("   ·   ");

  const renderWide = () =>
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            padding: `${s(46)}px ${s(58)}px`,
            background:
              "linear-gradient(150deg, #0b1220 0%, #133055 55%, #1d4ed8 100%)",
            color: "#ffffff",
          }}
        >
          <img
            src={WHITE_LOGO_URL}
            alt=""
            width={s(520)}
            style={{
              position: "absolute",
              left: s(340),
              top: s(96),
              opacity: 0.06,
              objectFit: "contain",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(26),
                fontWeight: 800,
                letterSpacing: s(2),
                color: "rgba(255,255,255,0.8)",
                maxWidth: s(760),
              }}
            >
              {match.eventTitle}
            </div>
            {chip ? (
              <div
                style={{
                  display: "flex",
                  fontSize: s(22),
                  fontWeight: 700,
                  letterSpacing: s(1),
                  color: "rgba(255,255,255,0.85)",
                  border: `${s(1)}px solid rgba(255,255,255,0.3)`,
                  borderRadius: s(999),
                  padding: `${s(7)}px ${s(20)}px`,
                }}
              >
                {chip}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            {nameBlock(match.player1, "right")}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: s(22),
                flex: 1,
              }}
            >
              {match.hasResult ? (
                <div style={{ display: "flex", alignItems: "center", gap: s(22) }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: s(150),
                      fontWeight: 900,
                      lineHeight: 0.85,
                      color: winner === 2 ? "rgba(255,255,255,0.5)" : "#ffffff",
                    }}
                  >
                    {formatNumber(match.player1.points)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: s(80),
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    :
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: s(150),
                      fontWeight: 900,
                      lineHeight: 0.85,
                      color: winner === 1 ? "rgba(255,255,255,0.5)" : "#ffffff",
                    }}
                  >
                    {formatNumber(match.player2.points)}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: s(96),
                    fontWeight: 900,
                    letterSpacing: s(8),
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  VS
                </div>
              )}
            </div>
            {nameBlock(match.player2, "left")}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: s(8),
              borderTop: `${s(1)}px solid rgba(255,255,255,0.18)`,
              paddingTop: s(18),
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: s(24),
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              <div style={{ display: "flex" }}>
                {match.hasResult ? statLine(match.player1) : subtitleBits.join("  ·  ")}
              </div>
              <div style={{ display: "flex" }}>
                {match.hasResult ? statLine(match.player2) : ""}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: s(10),
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: s(24),
                  fontWeight: 700,
                  letterSpacing: s(2),
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                BILLIARD TODAY
              </div>
              <img
                src={WHITE_LOGO_URL}
                alt=""
                width={s(230)}
                style={{ objectFit: "contain", opacity: 0.95 }}
              />
            </div>
          </div>
        </div>
      ),
      WIDE_SIZE,
    );

  const tallCard = () => new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: `${s(64)}px ${s(72)}px ${s(56)}px`,
          color: "#ffffff",
          background:
            "linear-gradient(150deg,#0f172a 0%,#12263f 46%,#1d4ed8 100%)",
        }}
      >
        {/* αχνό λογότυπο στο φόντο */}
        <img
          src={WHITE_LOGO_URL}
          alt=""
          width={s(800)}
          style={{
            position: "absolute",
            left: s(140),
            top: s(520),
            opacity: 0.08,
            objectFit: "contain",
          }}
        />

        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(22),
              fontWeight: 700,
              letterSpacing: s(5),
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.62)",
              maxWidth: s(620),
            }}
          >
            {match.eventTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(20),
              fontWeight: 800,
              letterSpacing: s(3.5),
              textTransform: "uppercase",
              padding: `${s(12)}px ${s(22)}px`,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.22)",
              backgroundColor: "rgba(255,255,255,0.09)",
            }}
          >
            {chip || match.stageTitle}
          </div>
        </div>

        {/* players */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: s(120),
          }}
        >
          {[match.player1, match.player2].map((player, index) => (
            <div
              key={`${player.name}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: s(400),
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: s(50),
                  fontWeight: 800,
                  lineHeight: 1.08,
                  textAlign: "center",
                }}
              >
                {player.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s(10),
                  marginTop: s(26),
                  fontSize: s(22),
                  fontWeight: 700,
                  letterSpacing: s(2),
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {player.flag ? (
                  <img
                    src={player.flag}
                    alt=""
                    width={s(44)}
                    height={s(29)}
                    style={{ borderRadius: s(5), objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: s(44),
                      height: s(29),
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: s(5),
                      backgroundColor: "rgba(255,255,255,0.16)",
                      fontSize: s(14),
                    }}
                  >
                    {initials(player.name)}
                  </div>
                )}
                <div style={{ display: "flex" }}>{player.country || "—"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* result — πριν τον αγώνα δείχνει VS αντί για σκορ */}
        {match.hasResult ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: s(34),
              marginTop: s(80),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(190),
                fontWeight: 900,
                lineHeight: 0.86,
                color: winner === 2 ? "rgba(255,255,255,0.55)" : "#ffffff",
              }}
            >
              {formatNumber(match.player1.points)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(110),
                fontWeight: 800,
                color: "rgba(255,255,255,0.35)",
              }}
            >
              :
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(190),
                fontWeight: 900,
                lineHeight: 0.86,
                color: winner === 1 ? "rgba(255,255,255,0.55)" : "#ffffff",
              }}
            >
              {formatNumber(match.player2.points)}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: s(96),
              fontSize: s(120),
              fontWeight: 900,
              letterSpacing: s(10),
              color: "rgba(255,255,255,0.55)",
            }}
          >
            VS
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: s(16),
            fontSize: s(24),
            fontWeight: 700,
            letterSpacing: s(3.4),
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {subtitleBits.join(" · ")}
        </div>

        {/* statistics — μόνο όταν υπάρχει αποτέλεσμα */}
        {match.hasResult ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(56),
            borderRadius: s(28),
            border: "1px solid rgba(255,255,255,0.16)",
            backgroundColor: "rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              padding: `${s(22)}px ${s(18)}px`,
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 2.4,
                paddingLeft: s(14),
                fontSize: s(19),
                fontWeight: 800,
                letterSpacing: s(3),
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Player
            </div>
            {["Avg", "HR", "Inn", "MP"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flex: 1,
                  justifyContent: "center",
                  fontSize: s(19),
                  fontWeight: 800,
                  letterSpacing: s(3),
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          {statsRows.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: `${s(22)}px ${s(18)}px`,
                borderTop:
                  index === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: 2.4,
                  paddingLeft: s(14),
                  fontSize: s(26),
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                {row.name}
              </div>
              {cell(row.average)}
              {cell(formatNumber(row.highRun))}
              {cell(formatNumber(row.innings))}
              {cell(formatNumber(row.matchPoints))}
            </div>
          ))}
        </div>
        ) : null}

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: s(40),
            borderTop: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: s(24),
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <div style={{ display: "flex" }}>
              {text(event?.location) || "Billiard Today"}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: s(8),
                fontSize: s(18),
                letterSpacing: s(4),
                textTransform: "uppercase",
                fontWeight: 800,
                color: "rgba(255,255,255,0.42)",
              }}
            >
              billiardtoday.com{formatSeason(event) ? ` · ${formatSeason(event)}` : ""}
            </div>
          </div>
          <img
            src={WHITE_LOGO_URL}
            alt="Billiard Today"
            width={s(280)}
            style={{ objectFit: "contain", opacity: 0.95 }}
          />
        </div>
      </div>
    ),
    SIZE,
  );

  const imageResponse = isWide ? renderWide() : tallCard();

  // Το Facebook δεν δέχεται WebP ως og:image· JPEG είναι μικρότερο από PNG και
  // 100% αποδεκτό από Facebook / X / WhatsApp / LinkedIn.
  const pngBuffer = new Uint8Array(await imageResponse.arrayBuffer());
  try {
    const sharpModule = (await import("sharp")).default;
    const jpegBuffer = new Uint8Array(
      await sharpModule(Buffer.from(pngBuffer))
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer(),
    );
    return new Response(jpegBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=900, s-maxage=900",
      },
    });
  } catch {
    return new Response(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=900, s-maxage=900",
      },
    });
  }
}
