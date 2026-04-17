"use client";

const TRUSTED_DEVICE_TOKEN_KEY = "bt.trustedDeviceToken";
const TRUSTED_DEVICE_PLAYER_KEY = "bt.trustedDevicePlayer";

export type TrustedDevicePlayer = {
  id?: number | null;
  documentId?: string | null;
  displayName?: string | null;
  fullName?: string | null;
  officialPlayerName?: string | null;
  country?: string | null;
  photoUrl?: string | null;
  enrollmentRequestId?: string | null;
  mobile?: string | null;
  email?: string | null;
  isTemporary?: boolean;
  identityStatus?: string | null;
};

export function getTrustedDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setTrustedDeviceToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, token);
  } catch {}
}

export function clearTrustedDeviceToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TRUSTED_DEVICE_TOKEN_KEY);
    window.localStorage.removeItem(TRUSTED_DEVICE_PLAYER_KEY);
  } catch {}
}

export function getTrustedDevicePlayer(): TrustedDevicePlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRUSTED_DEVICE_PLAYER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrustedDevicePlayer;
  } catch {
    return null;
  }
}

export function setTrustedDevicePlayer(player: TrustedDevicePlayer) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRUSTED_DEVICE_PLAYER_KEY, JSON.stringify(player));
  } catch {}
}
