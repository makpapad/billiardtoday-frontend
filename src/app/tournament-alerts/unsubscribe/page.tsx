import type { Metadata } from "next";
import Link from "next/link";
import { AppSiteShell } from "@/components/site/AppSiteShell";
import { SERVER_API_URL } from "@/lib/api";

/**
 * Σελίδα διαγραφής από τις ειδοποιήσεις ΜΙΑΣ διοργάνωσης (σύνδεσμος σε κάθε email).
 */

export const metadata: Metadata = {
  title: "Tournament alerts stopped",
  description: "You have been removed from the tournament alerts list.",
  robots: { index: false, follow: false },
};

type UnsubscribePayload = {
  status?: string;
  tournamentTitle?: string | null;
  email?: string | null;
  error?: { message?: string } | string;
};

async function unsubscribe(token: string) {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/api/tournament-subscriptions/unsubscribe?t=${encodeURIComponent(token)}`,
      { cache: "no-store", signal: AbortSignal.timeout(12000) },
    );
    const payload = (await response.json().catch(() => ({}))) as UnsubscribePayload;
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

export default async function TournamentAlertsUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = (params.t ?? "").trim();
  const result = token
    ? await unsubscribe(token)
    : { ok: false, data: null, message: "This link is missing its code." };

  const tournamentTitle = result.data?.tournamentTitle ?? null;

  return (
    <AppSiteShell>
      <section className="mx-auto w-full max-w-[560px] px-4 py-16 sm:py-24">
        <div className="rounded-[26px] border border-[#E7EBF0] bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] ${
              result.ok ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-500"
            }`}
            aria-hidden
          >
            {result.ok ? "✓" : "!"}
          </span>

          {result.ok ? (
            <>
              <h1 className="mt-5 text-[22px] font-semibold text-[#1F2937]">
                You are unsubscribed
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#64748B]">
                We will not send you any more alerts
                {tournamentTitle ? (
                  <>
                    {" "}
                    for <strong className="text-[#1F2937]">{tournamentTitle}</strong>
                  </>
                ) : null}
                . Your account and everything else on Billiard Today stay exactly as they are.
              </p>
              <Link
                href="/tournaments"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-[#E7EBF0] px-6 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-50"
              >
                Browse tournaments
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-[22px] font-semibold text-[#1F2937]">
                This link did not work
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
        </div>
      </section>
    </AppSiteShell>
  );
}
