import type { Metadata } from "next";
import Link from "next/link";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { SERVER_API_URL } from "@/lib/api";

/**
 * Σελίδα επιβεβαίωσης εγγραφής σε ειδοποιήσεις διοργάνωσης.
 *
 * Ο χρήστης φτάνει εδώ από το email (double opt-in). Το token περνά στη Strapi,
 * η οποία κάνει την αλλαγή — η σελίδα μόνο δείχνει το αποτέλεσμα.
 */

export const metadata: Metadata = {
  title: "Tournament alerts confirmed",
  description: "Your tournament alerts are active.",
  robots: { index: false, follow: false },
};

type ConfirmPayload = {
  status?: string;
  tournamentTitle?: string | null;
  tournamentUrl?: string | null;
  playerName?: string | null;
  error?: { message?: string } | string;
};

async function confirm(token: string): Promise<{ ok: boolean; data: ConfirmPayload | null; message?: string }> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/api/tournament-subscriptions/confirm?t=${encodeURIComponent(token)}`,
      { cache: "no-store", signal: AbortSignal.timeout(12000) },
    );
    const payload = (await response.json().catch(() => ({}))) as ConfirmPayload;
    if (!response.ok) {
      const message =
        typeof payload.error === "string" ? payload.error : payload.error?.message;
      return { ok: false, data: null, message: message || "This link is not valid any more." };
    }
    return { ok: true, data: payload };
  } catch {
    return { ok: false, data: null, message: "We could not reach the server. Try again in a moment." };
  }
}

export default async function TournamentAlertsConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = (params.t ?? "").trim();
  const result = token
    ? await confirm(token)
    : { ok: false, data: null, message: "This link is missing its code." };

  const tournamentTitle = result.data?.tournamentTitle ?? null;
  const tournamentUrl = result.data?.tournamentUrl ?? "/tournaments";

  return (
    <AppSiteShell>
      <section className="mx-auto w-full max-w-[560px] px-4 py-16 sm:py-24">
        <div className="rounded-[26px] border border-[#E7EBF0] bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] ${
              result.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
            aria-hidden
          >
            {result.ok ? "✓" : "!"}
          </span>

          {result.ok ? (
            <>
              <h1 className="mt-5 text-[22px] font-semibold text-[#1F2937]">
                Alerts are on
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#64748B]">
                You will now receive tournament alerts
                {tournamentTitle ? (
                  <>
                    {" "}
                    for <strong className="text-[#1F2937]">{tournamentTitle}</strong>
                  </>
                ) : null}
                .
                {result.data?.playerName ? (
                  <>
                    {" "}
                    Match alerts are set for{" "}
                    <strong className="text-[#1F2937]">{result.data.playerName}</strong>.
                  </>
                ) : null}
              </p>
              <Link
                href={tournamentUrl}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0284C7] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0369A1]"
              >
                Open the tournament
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-[22px] font-semibold text-[#1F2937]">
                We could not confirm this link
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#64748B]">
                {result.message}
              </p>
              <Link
                href="/tournaments"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-[#E7EBF0] px-6 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-50"
              >
                Browse tournaments
              </Link>
            </>
          )}

          <p className="mt-6 text-[12px] leading-relaxed text-[#94A3B8]">
            Every email has a one-click unsubscribe. You can stop alerts for this tournament at any time.
          </p>
        </div>
      </section>
    </AppSiteShell>
  );
}
