"use client";

import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import React from "react";
import {
  playerAccountAuth,
  type PlayerAccountAuthOptions,
  type PlayerAccountClaimInfo,
  type PlayerAccountSummary,
} from "@/lib/player-account-auth";

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

function friendlyStatus(status: string | null) {
  if (status === "verified") return "Verified";
  if (status === "pending_review") return "Pending review";
  if (status === "temporary") return "Temporary";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  if (status === "merged") return "Merged";
  return status || "Unknown";
}

function claimDisplayName(claimInfo: PlayerAccountClaimInfo | null) {
  return (
    claimInfo?.fullNameSubmitted?.trim() ||
    claimInfo?.displayName?.trim() ||
    claimInfo?.fullName?.trim() ||
    ""
  );
}

export default function CompleteProfilePage() {
  const searchParams = useSearchParams();
  const claimToken = searchParams?.get("claim")?.trim() || "";

  const [claimInfo, setClaimInfo] = React.useState<PlayerAccountClaimInfo | null>(null);
  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [authOptions, setAuthOptions] = React.useState<PlayerAccountAuthOptions | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSocialPending, setIsSocialPending] = React.useState(false);
  const [googleSdkReady, setGoogleSdkReady] = React.useState(false);
  const [facebookSdkReady, setFacebookSdkReady] = React.useState(false);
  const googleButtonRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);

      if (!claimToken) {
        setClaimInfo(null);
        setIsLoading(false);
        return;
      }

      try {
        const next = await playerAccountAuth.getClaimInfo(claimToken);
        setClaimInfo(next);
        setEmail(next.email || "");
        setFullName(claimDisplayName(next));
      } catch (err) {
        setClaimInfo(null);
        setError(err instanceof Error ? err.message : "Claim lookup failed");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [claimToken]);

  React.useEffect(() => {
    const run = async () => {
      try {
        setAuthOptions(await playerAccountAuth.getAuthOptions());
      } catch {
        setAuthOptions(null);
      }
    };

    void run();
  }, []);

  const handleSocialLogin = React.useCallback(
    async (provider: "google" | "facebook", payload: { idToken?: string | null; accessToken?: string | null }) => {
      if (!claimToken) {
        setError("Missing claim token");
        return;
      }
      setError(null);
      setIsSocialPending(true);
      try {
        const next = await playerAccountAuth.socialLogin(provider, {
          ...payload,
          claimToken,
        });
        setAccount(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Social sign-in failed");
      } finally {
        setIsSocialPending(false);
      }
    },
    [claimToken],
  );

  React.useEffect(() => {
    const clientId = authOptions?.socialProviders.google.clientId;
    if (!clientId || !googleSdkReady || !window.google?.accounts?.id || !googleButtonRef.current) return;

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        void handleSocialLogin("google", { idToken: response?.credential || null });
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signup_with",
      width: 320,
    });
  }, [authOptions?.socialProviders.google.clientId, googleSdkReady, handleSocialLogin]);

  React.useEffect(() => {
    const facebookAppId = authOptions?.socialProviders.facebook.appId;
    const graphVersion = authOptions?.socialProviders.facebook.graphVersion || "v21.0";
    if (!facebookAppId) return;

    const initFacebook = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: facebookAppId,
        cookie: false,
        xfbml: false,
        version: graphVersion,
      });
      setFacebookSdkReady(true);
    };

    window.fbAsyncInit = initFacebook;
    if (window.FB) initFacebook();
  }, [authOptions?.socialProviders.facebook.appId, authOptions?.socialProviders.facebook.graphVersion]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claimToken) {
      setError("Missing claim token");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const next = await playerAccountAuth.completeClaim({ claimToken, email, password, fullName });
      setAccount(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          Loading profile completion...
        </div>
      </main>
    );
  }

  if (account) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account created</h1>
          <p className="mt-3 text-sm text-slate-600">
            Your private account was created. Email verification secures account ownership, while official player
            verification remains a separate step.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current identity</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">
              {account.player?.fullName ||
                account.enrollmentRequest?.displayName ||
                account.enrollmentRequest?.fullName ||
                account.player?.documentId ||
                "Temporary player"}
            </div>
          </div>
          {!account.emailVerifiedAt ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Check your email to verify account ownership before relying on recovery and full account access. A phone
              OTP can also be added later from the security section.
            </div>
          ) : null}
          <div className="mt-6">
            <Link
              href="/account"
              className="inline-flex rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Open account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      {authOptions?.socialProviders.google.clientId ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleSdkReady(true)}
        />
      ) : null}
      {authOptions?.socialProviders.facebook.appId ? (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={() => {
            if (window.fbAsyncInit) window.fbAsyncInit();
          }}
        />
      ) : null}
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="mt-3 text-sm text-slate-600">
          Finish your account setup to access your private player area later from any device.
        </p>

        {!claimToken ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Missing claim token. Open this page from the profile completion link.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {claimInfo ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Temporary identity</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {claimInfo.displayName || claimInfo.fullName || "Temporary player"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Identity status</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {friendlyStatus(claimInfo.identityStatus || claimInfo.status)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Club</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{claimInfo.clubName || "Not provided"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Country</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{claimInfo.country || "Not provided"}</div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            {authOptions?.socialProviders.google.enabled && authOptions?.socialProviders.google.clientId ? (
              <div className="space-y-2">
                <div ref={googleButtonRef} className="min-h-[44px]" />
                <div className="text-xs text-slate-500">
                  {googleSdkReady ? "Google sign-in is ready." : "Loading Google sign-in..."}
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-700">Google login is not configured yet.</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!window.FB || !facebookSdkReady) {
                setError("Facebook login is not ready yet.");
                return;
              }
              window.FB.login(
                (response: { authResponse?: { accessToken?: string } }) => {
                  const accessToken = response?.authResponse?.accessToken;
                  if (!accessToken) {
                    setError("Facebook login was cancelled or not authorized.");
                    return;
                  }
                  void handleSocialLogin("facebook", { accessToken });
                },
                { scope: "public_profile,email" },
              );
            }}
            disabled={!authOptions?.socialProviders.facebook.enabled || !authOptions?.socialProviders.facebook.appId || isSocialPending}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Facebook
            <div className="mt-1 text-xs font-normal text-slate-500">
              {authOptions?.socialProviders.facebook.enabled && authOptions?.socialProviders.facebook.appId
                ? facebookSdkReady
                  ? "Facebook sign-in is ready."
                  : "Loading Facebook sign-in..."
                : "Not configured yet."}
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Account name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <div className="text-xs text-slate-500">
            Use at least 8 characters. This creates account access only. Official player verification happens later.
          </div>
          <button
            type="submit"
            disabled={!claimToken || isSubmitting}
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
