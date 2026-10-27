"use client";

/**
 * Modal «Αθλητές ομάδας» για την καρτέλα Participations/Συμμετοχές της ομαδικής
 * σελίδας: κλικ σε μια ομάδα → ποιοι αθλητές συμμετέχουν σε αυτήν.
 *
 * Πηγή δεδομένων: `team-member` του BT (team + player + season), όχι τα boards των
 * αγώνων — γι' αυτό φαίνεται και αθλητής που δεν έχει παίξει ακόμη.
 */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { playerProfileHref, pickPlayerName, type NameVariant } from "@/lib/playerNameVariant";
import type { TeamRosterMember } from "@/lib/teamTournaments";

type Props = {
  teamName: string;
  members: TeamRosterMember[];
  nameVariant?: NameVariant;
  onClose: () => void;
};

/** captain → Αρχηγός · substitute → Αναπλ. · player → Αθλητής (ο κανόνας). */
const roleLabel = (member: TeamRosterMember): string => {
  if (member.isCaptain || member.role === "captain") return "Αρχηγός";
  if (member.role === "substitute") return "Αναπλ.";
  return "Αθλητής";
};

const sortMembers = (members: TeamRosterMember[], variant: NameVariant): TeamRosterMember[] =>
  [...members].sort((a, b) => {
    const captainDiff = Number(roleLabel(b) === "Αρχηγός") - Number(roleLabel(a) === "Αρχηγός");
    if (captainDiff) return captainDiff;
    return pickPlayerName(a, variant).localeCompare(pickPlayerName(b, variant), "el");
  });

export function TeamRosterModal({ teamName, members, nameVariant = "international", onClose }: Props) {
  const ranked = useMemo(() => sortMembers(members, nameVariant), [members, nameVariant]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Αθλητές ${teamName}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-950">{teamName}</h3>
            <p className="mt-0.5 text-[11.5px] text-slate-500">
              {ranked.length} {ranked.length === 1 ? "αθλητής" : "αθλητές"} στη δήλωση της ομάδας
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="ml-auto shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 overflow-auto">
          {ranked.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-slate-500">
              Δεν υπάρχει δηλωμένο ρόστερ για αυτή την ομάδα.
            </p>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-slate-50">
                  <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                  <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">Αθλητής</th>
                  <th
                    title="Ρόλος στη δήλωση: αρχηγός, αναπληρωματικός ή αθλητής"
                    className="w-24 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]"
                  >
                    Ρόλος
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((member, index) => {
                  const name = pickPlayerName(member, nameVariant) || "—";
                  const href = playerProfileHref({ id: member.id, documentId: member.documentId }, name);
                  const role = roleLabel(member);
                  return (
                    <tr key={member.documentId ?? `${name}-${index}`} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-center text-slate-400">{index + 1}</td>
                      <th scope="row" className="max-w-[280px] px-2 py-2 text-left text-[12px] font-bold text-slate-900">
                        {href ? (
                          <Link
                            href={href}
                            className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </th>
                      <td className="px-2 py-2 text-left text-[11px] text-slate-500">{role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-2 text-[11px] text-slate-500">
          Όσοι δηλώθηκαν στην ομάδα — ανεξάρτητα από το αν έχουν παίξει αγώνα. Άνοιγμα προφίλ με κλικ στο όνομα.
        </div>
      </div>
    </div>
  );
}
