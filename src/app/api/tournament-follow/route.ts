import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

/**
 * Εγγραφή σε ειδοποιήσεις ΜΙΑΣ διοργάνωσης («Follow this tournament»).
 *
 * Η φόρμα στέλνει εδώ: email, eventDocumentId, ποια γεγονότα θέλει και (προαιρετικά)
 * τον αθλητή που δηλώνει ότι αγωνίζεται, ώστε να παίρνει και «ο επόμενος αγώνας μου».
 *
 * Η αποθήκευση (Strapi `tournament-subscription` + double opt-in email μέσω Resend)
 * μπαίνει στο επόμενο βήμα· μέχρι τότε το route ελέγχει πλήρως την είσοδο και
 * απαντά `NOT_CONFIGURED` ώστε η φόρμα να δείχνει καθαρό μήνυμα αντί για σφάλμα.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ALLOWED_EVENTS = new Set([
  "draw", // κλήρωση / πρόγραμμα
  "daily", // σύνοψη ημέρας
  "final", // τελική κατάταξη
  "nextMatch", // ο επόμενος αγώνας του αθλητή
]);

type FollowPayload = {
  email?: unknown;
  eventDocumentId?: unknown;
  playerDocumentId?: unknown;
  events?: unknown;
  consent?: unknown;
  pushSubscription?: unknown;
};

function readPushSubscription(value: unknown): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const endpoint = typeof record.endpoint === "string" ? record.endpoint.trim() : "";
  const keys =
    record.keys && typeof record.keys === "object"
      ? (record.keys as Record<string, unknown>)
      : null;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export async function POST(request: Request) {
  let body: FollowPayload;
  try {
    body = (await request.json()) as FollowPayload;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const eventDocumentId =
    typeof body.eventDocumentId === "string" ? body.eventDocumentId.trim() : "";
  const playerDocumentId =
    typeof body.playerDocumentId === "string" && body.playerDocumentId.trim()
      ? body.playerDocumentId.trim()
      : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }
  if (!eventDocumentId) {
    return NextResponse.json({ error: "MISSING_TOURNAMENT" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  }

  const requested = Array.isArray(body.events)
    ? body.events.filter((value): value is string => typeof value === "string")
    : [];
  const events = requested.filter((value) => ALLOWED_EVENTS.has(value));

  if (events.length === 0) {
    return NextResponse.json({ error: "NO_EVENTS_SELECTED" }, { status: 400 });
  }
  // Το «επόμενος αγώνας» χωρίς δηλωμένο αθλητή δεν έχει νόημα — το κόβουμε αντί να
  // αποθηκεύσουμε εγγραφή που δεν θα στείλει ποτέ τίποτα.
  if (events.includes("nextMatch") && !playerDocumentId) {
    return NextResponse.json({ error: "NEXT_MATCH_NEEDS_PLAYER" }, { status: 400 });
  }

  try {
    const pushSubscription = readPushSubscription(body.pushSubscription);
    const response = await fetch(`${SERVER_API_URL}/api/tournament-subscriptions/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        eventDocumentId,
        playerDocumentId,
        events,
        source: "tournament_page",
        ...(pushSubscription ? { pushSubscription } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      error?: { message?: string } | string;
    };

    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message || payload.message;
      return NextResponse.json(
        { ok: false, error: "SUBSCRIBE_FAILED", message: message || "Sign-up failed." },
        { status: response.status === 404 ? 404 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: payload.status ?? "pending",
      message: payload.message ?? "Check your inbox to confirm.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "NETWORK", message: "Network error. Please try again." },
      { status: 502 },
    );
  }
}
