"use client";

import Link from "next/link";
import Script from "next/script";
import React from "react";
import {
  playerAccountAuth,
  type PlayerAccountAuthOptions,
  type PlayerAccountEnrollmentPreview,
  type PlayerAccountSummary,
} from "@/lib/player-account-auth";

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export function statusLabel(status: PlayerAccountSummary["status"]) {
  if (status === "active_linked" || status === "active") return "Account verified and linked";
  if (status === "active_pending_player_review") return "Account verified, player review pending";
  if (status === "active_unlinked") return "Account verified, player unlinked";
  if (status === "pending_verification") return "Pending verification";
  if (status === "suspended" || status === "disabled") return "Suspended";
  return "Unknown";
}

export function identityStatusLabel(status?: string | null) {
  if (status === "verified") return "Verified";
  if (status === "pending_review") return "Pending review";
  if (status === "rejected") return "Rejected";
  if (status === "temporary") return "Temporary";
  if (status === "approved") return "Verified";
  if (status === "pending") return "Temporary";
  return status || "Unknown";
}

export function officialVerificationLabel(account: PlayerAccountSummary) {
  if (account.status === "active_linked" || account.player?.documentId || account.isOfficiallyVerified) {
    return "Official player verified";
  }
  if (account.status === "active_pending_player_review") {
    return "Official player review pending";
  }
  if (account.status === "active_unlinked") {
    return "No official player linked";
  }
  if (account.status === "pending_verification") {
    return "Account verification required first";
  }
  return "Official verification unavailable";
}

export function ownershipLabel(account: PlayerAccountSummary) {
  const primaryMethod = account.ownership?.primaryMethod;
  if (primaryMethod === "google") return "Verified by Google";
  if (primaryMethod === "facebook") return "Verified by Facebook";
  if (primaryMethod === "phone") return "Verified by phone OTP";
  if (primaryMethod === "email") return "Verified by email";
  return "Ownership verification pending";
}

export function formatDateTime(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return value;
  }
}

export function usePlayerAccountSession() {
  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      const cached = playerAccountAuth.getAccount();
      if (cached) {
        setAccount(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      try {
        const current = await playerAccountAuth.me();
        if (current) {
          setAccount(current);
        } else if (!cached) {
          setAccount(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  return { account, setAccount, isLoading };
}

export type PlayerAccountSessionState = ReturnType<typeof usePlayerAccountSession>;

export function AccountAccessCard({
  onAuthenticated,
}: {
  onAuthenticated: (account: PlayerAccountSummary) => void | Promise<void>;
}) {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [enrollmentPreview, setEnrollmentPreview] = React.useState<PlayerAccountEnrollmentPreview | null>(null);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = React.useState(false);
  const [hasEditedFullName, setHasEditedFullName] = React.useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = React.useState<string | null>(null);
  const [authOptions, setAuthOptions] = React.useState<PlayerAccountAuthOptions | null>(null);
  const [googleSdkReady, setGoogleSdkReady] = React.useState(false);
  const [facebookSdkReady, setFacebookSdkReady] = React.useState(false);
  const [isSocialPending, setIsSocialPending] = React.useState(false);
  const googleButtonRef = React.useRef<HTMLDivElement | null>(null);
  const googleRenderedModeRef = React.useRef<"login" | "register" | null>(null);

  const finishSocialLogin = React.useCallback(
    async (provider: "google" | "facebook", payload: { idToken?: string | null; accessToken?: string | null }) => {
      setError(null);
      setForgotPasswordNotice(null);
      setIsSocialPending(true);
      try {
        const next = await playerAccountAuth.socialLogin(provider, payload);
        await onAuthenticated(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Social login failed");
      } finally {
        setIsSocialPending(false);
      }
    },
    [onAuthenticated],
  );

  React.useEffect(() => {
    const run = async () => {
      try {
        const next = await playerAccountAuth.getAuthOptions();
        setAuthOptions(next);
      } catch {
        setAuthOptions(null);
      }
    };

    void run();
  }, []);

  React.useEffect(() => {
    if (mode !== "register") return;
    const normalized = email.trim();
    if (!normalized) {
      setEnrollmentPreview(null);
      if (!hasEditedFullName) setFullName("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsCheckingEnrollment(true);
      try {
        const preview = await playerAccountAuth.getEnrollmentPreview(normalized);
        setEnrollmentPreview(preview);
        if (!hasEditedFullName) {
          setFullName(preview?.displayName || preview?.fullName || "");
        }
      } catch {
        setEnrollmentPreview(null);
      } finally {
        setIsCheckingEnrollment(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [email, hasEditedFullName, mode]);

  React.useEffect(() => {
    googleRenderedModeRef.current = null;
  }, [mode]);

  React.useEffect(() => {
    const clientId = authOptions?.socialProviders.google.clientId;
    if (!clientId || !googleSdkReady || !window.google?.accounts?.id || !googleButtonRef.current) return;
    if (googleRenderedModeRef.current === mode) return;

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        void finishSocialLogin("google", { idToken: response?.credential || null });
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: mode === "login" ? "signin_with" : "signup_with",
      width: 320,
    });
    googleRenderedModeRef.current = mode;
  }, [authOptions?.socialProviders.google.clientId, finishSocialLogin, googleSdkReady, mode]);

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
    if (window.FB) {
      initFacebook();
    }
  }, [authOptions?.socialProviders.facebook.appId, authOptions?.socialProviders.facebook.graphVersion]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setForgotPasswordNotice(null);
    try {
      if (mode === "register") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
      }

      const next =
        mode === "login"
          ? await playerAccountAuth.login(email, password)
          : await playerAccountAuth.register({
              email,
              fullName,
              password,
            });
      await onAuthenticated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account Access</h1>
        <p className="mt-3 text-sm text-slate-600">
          Sign in with your account or create one from your enrollment details. Official player verification is a
          separate step.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            {authOptions?.socialProviders.google.enabled && authOptions?.socialProviders.google.clientId ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-full border border-slate-300 bg-white">
                  <div ref={googleButtonRef} className="min-h-[44px]" />
                </div>
                <div className="text-xs text-slate-500">
                  {googleSdkReady ? "Ready to sign in." : "Loading sign-in..."}
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
                  void finishSocialLogin("facebook", { accessToken });
                },
                { scope: "public_profile,email" },
              );
            }}
            disabled={!authOptions?.socialProviders.facebook.enabled || !authOptions?.socialProviders.facebook.appId || isSocialPending}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex min-h-[44px] items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1877f2] text-base font-black leading-none text-white">
                f
              </span>
              <span>Continue with Facebook</span>
            </span>
            <div className="mt-1 text-xs font-normal text-slate-500">
              {authOptions?.socialProviders.facebook.enabled && authOptions?.socialProviders.facebook.appId
                ? facebookSdkReady
                  ? "Ready to sign in."
                  : "Loading sign-in..."
                : "Not configured yet."}
            </div>
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "login" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "register" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          {mode === "login" ? (
            <div className="flex items-center justify-end">
              <Link href="/account/forgot-password" className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
                Forgot password?
              </Link>
            </div>
          ) : null}
          {mode === "register" ? (
            <>
              <input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setHasEditedFullName(true);
                }}
                placeholder="Account name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                If you already enrolled from a scoreboard, use the same email address here to recover that enrollment
                context before creating the account.
                {isCheckingEnrollment ? " Checking enrollment..." : ""}
              </div>
              {enrollmentPreview?.displayName || enrollmentPreview?.fullName ? (
                <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  Temporary enrollment found for{" "}
                  <span className="font-semibold">{enrollmentPreview.displayName || enrollmentPreview.fullName}</span>.
                  You can keep this account name or edit it before creating the account.
                </div>
              ) : null}
            </>
          ) : null}
          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {forgotPasswordNotice ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{forgotPasswordNotice}</div>
          ) : null}
          <button
            type="submit"
            disabled={isSocialPending}
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSocialPending ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

const NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tournaments", label: "Tournaments" },
  { href: "/account/friendly", label: "Friendly Matches" },
  { href: "/account/security", label: "Security" },
  { href: "/account/devices", label: "Devices" },
];

export function PrivateAccountShell({
  account,
  setAccount,
  activeHref,
  variant = "card",
  children,
}: {
  account: PlayerAccountSummary;
  setAccount: React.Dispatch<React.SetStateAction<PlayerAccountSummary | null>>;
  activeHref: string;
  variant?: "card" | "profile";
  children: React.ReactNode;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = React.useState(false);
  const [verificationNotice, setVerificationNotice] = React.useState<string | null>(null);
  const hasOwnershipProof = Boolean(account.ownership?.methods?.length);
  const accountTitle =
    account.fullName ||
    account.player?.fullName ||
    account.enrollmentRequest?.displayName ||
    account.enrollmentRequest?.fullName ||
    account.email ||
    "Player account";

  const signOut = () => {
    playerAccountAuth.logout();
    setAccount(null);
  };

  const navItems = NAV_ITEMS.map((item) => {
    const active = item.href === activeHref;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          active ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"
        }`}
      >
        {item.label}
      </Link>
    );
  });

  const header = (
    <>
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{accountTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">{account.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Sign out
        </button>
      </div>

      {!hasOwnershipProof ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <div className="font-semibold">Account ownership verification pending</div>
          <p className="mt-2">Verify your email or phone to secure account recovery and future account actions.</p>
          <button
            type="button"
            onClick={async () => {
              setVerificationNotice(null);
              setError(null);
              setIsResendingVerification(true);
              try {
                await playerAccountAuth.resendVerificationEmail({ email: account.email });
                setVerificationNotice("Verification email sent.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Verification email resend failed");
              } finally {
                setIsResendingVerification(false);
              }
            }}
            className="mt-3 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900"
          >
            {isResendingVerification ? "Sending..." : "Resend verification email"}
          </button>
          {verificationNotice ? <div className="mt-3 text-sm text-emerald-700">{verificationNotice}</div> : null}
        </div>
      ) : null}

      {hasOwnershipProof && !account.emailVerifiedAt ? (
        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Account ownership is already verified via {ownershipLabel(account).toLowerCase()}. Email verification is
          still recommended as an extra recovery method.
        </div>
      ) : null}

      {account.status === "pending_verification" ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account ownership still needs a verified method. Friendly matches and trusted devices are already
          available, but official player verification remains separate.
        </div>
      ) : null}

      {account.status === "active_unlinked" ? (
        <div className="mt-6 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          Your account ownership is verified. You can use trusted devices and private account recovery, but no
          official player profile is linked yet.
        </div>
      ) : null}

      {account.status === "active_pending_player_review" ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your account ownership is verified. Your official player profile is still pending review.
        </div>
      ) : null}

      {account.status === "active_linked" ? (
        <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your account ownership is verified and an official player profile is linked.
        </div>
      ) : null}

      {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <nav className="mt-6 flex flex-wrap gap-2">
        {navItems}
      </nav>
    </>
  );

  if (variant === "profile") {
    return (
      <main className="min-h-screen bg-[#f4f0e6] text-zinc-950">
        {children}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        {header}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
