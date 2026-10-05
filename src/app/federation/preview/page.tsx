import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { FederationSubmissionPreview } from "./FederationSubmissionPreview";
import data from "./players-gr.json";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "National ranking submission — federation preview",
    description:
      "Preview of the federation page where national federations submit the finishing positions of their national championship, so BilliardToday can turn them into CEB ranking points.",
    path: "/federation/preview",
  }),
  robots: { index: false, follow: false },
};

type Row = {
  rank: number | null;
  name: string;
  umb: string | null;
  note: string;
  points?: number | null;
};

type Season = { key?: string; season: string; label: string; scale?: number[] };

export default function FederationPreviewPage() {
  const rows = data.rows as Row[];
  const seasons = data.seasons as Season[];
  const withId = rows.filter((row) => row.umb).length;

  return (
    <div className="fedmock-page">
      <div className="fedmock-notice">
        <div>
          <b>Preview</b> — this is how the federation page will look inside the site. Nothing is saved and the
          positions shown are a demo; the player list is real (Greece, from the current CEB list).
        </div>
        <div className="fedmock-notice-meta">
          {data.federationName} ({data.federation}) · edition {data.edition} · {rows.length} players, {withId}{" "}
          with a UMB ID
        </div>
      </div>

      <FederationSubmissionPreview
        federation={data.federation}
        federationName={data.federationName}
        edition={data.edition}
        defaultSeason={data.season}
        seasons={seasons}
        players={rows}
      />
    </div>
  );
}
