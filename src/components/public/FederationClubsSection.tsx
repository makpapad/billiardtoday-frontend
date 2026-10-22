import Link from "next/link";
import { CountryFlag, SectionHeading } from "@/components/public/PresentationBlocks";
import type { Federation } from "@/lib/directory";

/**
 * Οι σύλλογοι μιας ομοσπονδίας — μόνο το τμήμα, χωρίς δικό του container: τον
 * χώρο τον δίνει ο καλών (το hero της σελίδας ομοσποδίας ή η καρτέλα
 * «Affiliated Clubs»), ώστε η διάταξη να μένει ίδια και στις δύο θέσεις.
 */

const buildClubHref = (slug?: string | null, documentId?: string | null, embedded = false) => {
  const target = slug || documentId;
  return target ? `${embedded ? "/embed" : ""}/clubs/${target}` : "#";
};

type Props = {
  federation: Federation;
  embedded?: boolean;
};

export function FederationClubsSection({ federation, embedded = false }: Props) {
  const clubs = Array.isArray(federation.clubs) ? federation.clubs : [];

  return (
    <section>
      <SectionHeading
        eyebrow="Club network"
        title="Affiliated clubs"
        description="Browse the clubs directly connected to this federation."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clubs.length > 0 ? (
          clubs.map((club) => (
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
  );
}
