"use client";

const TRUSTED_DEVICE_TOKEN_KEY = "bt.trustedDeviceToken";
const TRUSTED_DEVICE_PLAYER_KEY = "bt.trustedDevicePlayer";

export type TrustedDevicePlayer = {
  id?: number | null;
  documentId?: string | null;
  fullName?: string | null;
  country?: string | null;
  photoUrl?: string | null;
  enrollmentRequestId?: string | null;
  mobile?: string | null;
  email?: string | null;
  isTemporary?: boolean;
};

export function getTrustedDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY);
  return raw && raw.trim() ? raw.trim() : null;
}

export function setTrustedDeviceToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, token);
}

export function clearTrustedDeviceToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TRUSTED_DEVICE_TOKEN_KEY);
  window.localStorage.removeItem(TRUSTED_DEVICE_PLAYER_KEY);
}

export function getTrustedDevicePlayer(): TrustedDevicePlayer | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRUSTED_DEVICE_PLAYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrustedDevicePlayer;
  } catch {
    return null;
  }
}

export function setTrustedDevicePlayer(player: TrustedDevicePlayer) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRUSTED_DEVICE_PLAYER_KEY, JSON.stringify(player));
}
