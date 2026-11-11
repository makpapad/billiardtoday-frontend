import { NextResponse } from "next/server";

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
};

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

  return NextResponse.json(
    {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Tournament alerts are not live yet.",
    },
    { status: 503 },
  );
}
