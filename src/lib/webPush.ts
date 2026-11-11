"use client";

/**
 * Web Push για τις ειδοποιήσεις διοργάνωσης.
 *
 * Κανόνες:
 * - Η άδεια ζητείται ΠΑΝΤΑ με απευθείας κλικ του χρήστη (το Safari απορρίπτει
 *   το prompt αν μεσολαβήσει await). Γι' αυτό η ενεργοποίηση γίνεται στο checkbox,
 *   όχι στο submit της φόρμας.
 * - Χωρίς `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (build-time) δεν επιχειρούμε καθόλου —
 *   αλλιώς ο browser πετά σφάλμα «applicationServerKey is not valid».
 */

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushEnableResult =
  | { ok: true; subscription: PushSubscriptionPayload }
  | { ok: false; reason: "unsupported" | "denied" | "error" };

export async function enablePushAlerts(): Promise<PushEnableResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return { ok: false, reason: "error" };

    return { ok: true, subscription: { endpoint, keys: { p256dh, auth } } };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function disablePushAlerts() {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    /* αγνοείται: μόνο τοπικός καθαρισμός */
  }
}
