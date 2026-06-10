import { ImageResponse } from "next/og";
import {
  buildTournamentDateRangeLabel,
  buildTournamentLocationLabel,
  buildTournamentTitle,
} from "@/lib/tournamentSeo";
import { resolveTournamentEventSummary } from "@/lib/tournaments";
import { resolveMediaUrl } from "@/lib/mediaUrl";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    return new Response("Tournament not found", { status: 404 });
  }

  const title = buildTournamentTitle(summary);
  const dateLabel = buildTournamentDateRangeLabel(summary.startDate, summary.endDate);
  const locationLabel = buildTournamentLocationLabel(summary);
  const organizerLogoUrl = resolveMediaUrl(summary.organizerLogoUrl);
  const stageLabel =
    summary.stages.length > 0
      ? `${summary.stages.length} stage${summary.stages.length === 1 ? "" : "s"}`
      : "Tournament";
  const detailParts = [
    summary.gameType || "Billiards",
    dateLabel,
    locationLabel,
    stageLabel,
  ].filter((part): part is string => Boolean(part));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #07111f 0%, #10263c 44%, #0f766e 100%)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
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
                  style={{
                    width: 188,
                    height: 64,
                    objectFit: "contain",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              {organizerLogoUrl ? (
                <img
                  src={organizerLogoUrl}
                  alt=""
                  width={82}
                  height={82}
                  style={{
                    width: 82,
                    height: 82,
                    objectFit: "contain",
                    borderRadius: 18,
                    background: "rgba(255, 255, 255, 0.92)",
                    padding: 10,
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    ),
    SIZE,
  );
}
