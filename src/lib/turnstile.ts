import { getServerEnv } from "@/lib/serverEnv";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

function getRequiredEnv(key: string) {
  const value = getServerEnv(key);
  if (!value) {
    throw new Error(`Missing required server env: ${key}`);
  }
  return value;
}

export async function verifyTurnstileToken(token: string, remoteip?: string | null) {
  const secret = getRequiredEnv("TURNSTILE_SECRET_KEY");

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: remoteip || undefined,
      idempotency_key: crypto.randomUUID(),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Turnstile verification failed: ${response.status} ${text}`);
  }

  const result = (await response.json()) as TurnstileVerifyResponse;
  return {
    success: result.success === true,
    hostname: typeof result.hostname === "string" ? result.hostname : null,
    errorCodes: Array.isArray(result["error-codes"]) ? result["error-codes"] : [],
  };
}
