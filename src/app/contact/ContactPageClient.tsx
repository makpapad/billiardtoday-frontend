"use client";

import Link from "next/link";
import Script from "next/script";
import React from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function ContactPageClient() {
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [isTurnstileReady, setIsTurnstileReady] = React.useState(false);
  const widgetIdRef = React.useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  React.useEffect(() => {
    if (!siteKey) return;

    const renderWidget = () => {
      if (!window.turnstile || widgetIdRef.current) return;
      const container = document.getElementById("contact-turnstile");
      if (!container) return;

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => {
          setTurnstileToken(token);
          setError(null);
        },
        "expired-callback": () => {
          setTurnstileToken("");
        },
        "error-callback": () => {
          setTurnstileToken("");
        },
      });
      setIsTurnstileReady(true);
    };

    window.onTurnstileLoad = renderWidget;
    renderWidget();

    return () => {
      window.onTurnstileLoad = undefined;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  return (
    <main className="flex-1 bg-[linear-gradient(180deg,#f8fafc_0%,#e0f2fe_32%,#fefce8_100%)] px-4 py-10 text-slate-950">
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad"
          strategy="afterInteractive"
        />
      ) : null}
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#082f49_42%,#164e63_100%)] p-8 text-white shadow-[0_30px_100px_rgba(8,47,73,0.28)]">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Billiard Today</div>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Contact the team behind the platform.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-cyan-50/84 sm:text-base">
            Use this form for partnerships, club onboarding, tournament coverage, platform support, or general
            questions. Messages are delivered directly to the team inbox.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Best for</div>
              <p className="mt-3 text-sm leading-6 text-white/85">
                Club registrations, event publishing, ranking updates, sponsorship interest, and support requests.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">Response</div>
              <p className="mt-3 text-sm leading-6 text-white/85">
                Send us your message and we will get back to you as soon as possible at the email you provide.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-white/80">
            <Link
              href="/"
              className="rounded-full border border-white/15 px-4 py-2 font-medium transition hover:bg-white/10"
            >
              Back to home
            </Link>
            <Link
              href="/clubs"
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-medium transition hover:bg-cyan-300/20"
            >
              Browse clubs
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Contact form</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Send a message</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Fill in the fields below and the message will be sent to the configured inbox.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setNotice(null);
              setIsSubmitting(true);

              try {
                if (!siteKey) {
                  throw new Error("Contact form verification is not configured yet.");
                }
                if (!turnstileToken) {
                  throw new Error("Please complete the verification before sending your message.");
                }

                const response = await fetch("/api/contact", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    ...form,
                    turnstileToken,
                  }),
                });

                const json = await response.json().catch(() => ({}));
                if (!response.ok) {
                  throw new Error(
                    typeof json?.error === "string" ? json.error : "Unable to send your message right now.",
                  );
                }

                setNotice("Your message has been sent. We will get back to you by email.");
                setForm(INITIAL_FORM);
                setTurnstileToken("");
                if (widgetIdRef.current && window.turnstile) {
                  window.turnstile.reset(widgetIdRef.current);
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to send your message right now.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
              <input
                value={form.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                placeholder="What is this about?"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <label className="hidden" aria-hidden="true">
              <span>Website</span>
              <input
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Message</span>
              <textarea
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder="Tell us what you need."
                rows={8}
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </label>

            <div className="space-y-2">
              <div id="contact-turnstile" className="min-h-[65px]" />
              {!siteKey ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Verification is not configured yet for this form.
                </div>
              ) : null}
              {siteKey && !isTurnstileReady ? (
                <div className="text-sm text-slate-500">Loading verification...</div>
              ) : null}
            </div>

            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {notice ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !siteKey || !turnstileToken}
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
