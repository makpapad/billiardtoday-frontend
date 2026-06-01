export type KeyboardMode = string;

export function normalizeKeyboardMode(value: unknown): KeyboardMode | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
}
