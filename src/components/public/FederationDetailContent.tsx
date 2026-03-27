import Link from "next/link";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { Federation } from "@/lib/directory";

type Props = {
  federation: Federation;
  embedded?: boolean;
};

const resolveLogoUrl = (value: Federation["logo"]): string | null => {
  if (!value?.url) return null;
  return value.url.startsWith("http")
    ? value.url
    : `https://app.billiardtoday.com${value.url.startsWith("/") ? value.url : `/${value.url}`}`;
};

const buildClubHref = (slug?: string | null, documentId?: string | null, embedded = false) => {
  const target = slug || documentId;
  return target ? `${embedded ? "/embed" : ""}/clubs/${target}` : "#";
};

const buildFederationHref = (slug?: string | null, documentId?: string | null, embedded = false) => {
  const target = slug || documentId;
  return target ? `${embedded ? "/embed" : ""}/federations/${target}` : "#";
};

export function FederationDetailContent({ federation, embedded = false }: Props) {
  const logoUrl = resolveLogoUrl(federation.logo);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Federation"
        title={federation.name}
        description={`Discover official billiard tournaments, affiliated clubs, and the competitive presence of ${federation.name} through a public page designed for visibility, trust, and search.`}
        actions={[]}
        aside={
          <div className="flex flex-col gap-4">
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={federation.logo?.name || `${federation.name} logo`}
                  className="max-h-28 w-auto object-contain"
                />
              ) : (
                <div className="text-center text-sm font-medium text-white/70">No logo available</div>
              )}
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/25 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CountryFlag country={federation.country || null} className="h-6 w-9 rounded-md object-cover" />
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Country</div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {federation.country || "Country pending"}
              </div>
              <div className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Connected clubs</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-white">{federation.clubCount || 0}</div>
            </div>
          </div>
        }
      />

      {federation.level === "national" ? (
        <section>
          <SectionHeading
            eyebrow="Club network"
            title="Affiliated clubs"
            description="Browse the clubs directly connected to this federation."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.isArray(federation.clubs) && federation.clubs.length > 0 ? (
              federation.clubs.map((club) => (
                <Link
                  key={club.documentId}
                  href={buildClubHref(club.slug, club.documentId, embedded)}
                  className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                >
                  <div className="flex items-center gap-3">
                    <CountryFlag country={federation.country || null} />
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{federation.country}</div>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{club.name}</h3>
                  <div className="mt-2 text-sm text-slate-500">{club.city || club.address || "Club venue"}</div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No clubs connected to this federation yet.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section>
          <SectionHeading
            eyebrow="Federation network"
            title="Child federations"
            description="Browse the federations that sit directly under this organization."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.isArray(federation.children) && federation.children.length > 0 ? (
              federation.children.map((child) => (
                <Link
                  key={child.documentId}
                  href={buildFederationHref(child.slug, child.documentId, embedded)}
                  className="rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {child.level || "federation"}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{child.name}</h3>
                  <div className="mt-2 text-sm text-slate-500">{child.country || "Country pending"}</div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No child federations connected yet.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
