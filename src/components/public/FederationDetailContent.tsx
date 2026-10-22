import type { ReactNode } from "react";
import { CountryFlag, PresentationHero } from "@/components/public/PresentationBlocks";
import { FederationClubsSection } from "@/components/public/FederationClubsSection";
import type { Federation } from "@/lib/directory";
import { resolveMediaUrl } from "@/lib/mediaUrl";

type Props = {
  federation: Federation;
  embedded?: boolean;
  /** Κουμπιά-σύνδεσμοι στο hero (π.χ. «UMB rankings» → /rankings/umb). */
  actions?: Array<{ label: string; href: string; variant?: "primary" | "secondary"; newTab?: boolean }>;
  /**
   * Οι σύλλογοι. Στη σελίδα ομοσπονδίας μπαίνουν σε δική τους καρτέλα
   * (`showClubs={false}`)· στα embeds μένουν κάτω από το hero.
   */
  showClubs?: boolean;
  /**
   * Μενού καρτελών ΜΕΣΑ στο hero (π.χ. Affiliated Clubs · Rankings · Individual ·
   * Team). Τα περιεχόμενα των καρτελών αποδίδονται ξεχωριστά, κάτω από το hero.
   */
  heroMenu?: ReactNode;
};

const resolveLogoUrl = (value: Federation["logo"]): string | null => {
  if (!value?.url) return null;
  return resolveMediaUrl(value.url);
};

export function FederationDetailContent({
  federation,
  embedded = false,
  actions = [],
  showClubs = true,
  heroMenu,
}: Props) {
  const logoUrl = resolveLogoUrl(federation.logo);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Federation"
        title={federation.name}
        description={`Discover official billiard tournaments, affiliated clubs, and the competitive presence of ${federation.name} through a public page designed for visibility, trust, and search.`}
        actions={actions}
        actionSlot={heroMenu}
        aside={
          <div className="flex flex-col gap-4">
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={federation.logo?.name || `${federation.name} logo`}
                  className="max-h-36 max-w-full w-auto object-contain"
                />
              ) : (
                <div className="text-center text-sm font-medium text-white/70">No logo available</div>
              )}
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/25 p-6 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-3">
                <CountryFlag country={federation.country || null} className="h-6 w-9 rounded-md object-cover" />
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Country</div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {federation.country || "Country pending"}
              </div>
            </div>
          </div>
        }
      />

      {showClubs && federation.level === "national" ? (
        <FederationClubsSection federation={federation} embedded={embedded} />
      ) : null}
    </div>
  );
}

