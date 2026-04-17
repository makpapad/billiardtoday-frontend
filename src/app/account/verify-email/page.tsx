import Link from "next/link";

type VerifyResult = {
  data?: {
    email?: string | null;
    status?: string | null;
    player?: {
      documentId?: string | null;
    } | null;
  } | null;
  error?: {
    message?: string;
  } | null;
};

function getStrapiUrl() {
  return (process.env.STRAPI_API_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337").replace(
    /\/$/,
    "",
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] || "" : rawToken || "";

  let isSuccess = false;
  let message = "Missing verification token.";
  let verifiedEmail: string | null = null;
  let verifiedStatus: string | null = null;
  let verifiedPlayerId: string | null = null;

  if (token) {
    const query = new URLSearchParams({ token });
    const res = await fetch(`${getStrapiUrl()}/api/player-accounts/verify-email?${query.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as VerifyResult | null;

    if (res.ok) {
      isSuccess = true;
      verifiedEmail = json?.data?.email || null;
      verifiedStatus = json?.data?.status || null;
      verifiedPlayerId = json?.data?.player?.documentId || null;
    } else {
      message = json?.error?.message || "Email verification failed.";
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Email verification</h1>

        {isSuccess ? (
          <>
            <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Your email is now verified{verifiedEmail ? ` for ${verifiedEmail}` : ""}.
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {verifiedPlayerId
                ? `Account ownership is verified and your official player profile is linked as ${verifiedPlayerId}.`
                : verifiedStatus === "active_pending_player_review"
                  ? "Account ownership is verified. Your official player profile is still pending review."
                  : "Account ownership is verified. Phone OTP and social login can strengthen recovery later, but official player verification remains a separate step."}
            </div>
            <div className="mt-6">
              <Link
                href="/account"
                className="inline-flex rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Open account
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
        )}
      </div>
    </main>
  );
}
