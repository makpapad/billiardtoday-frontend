import { NextRequest, NextResponse } from "next/server";

export const PLAYER_REVIEWER_IDENTITY_HEADER = "x-player-reviewer-identity";
export const PLAYER_VERIFICATION_SECRET_HEADER = "x-player-verification-secret";

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getPlayerVerificationSecret(): string | null {
  return asText(process.env.PLAYER_VERIFICATION_SECRET);
}

export function getReviewerIdentity(req: Request | NextRequest): string | null {
  return asText(req.headers.get(PLAYER_REVIEWER_IDENTITY_HEADER));
}

export function buildVerificationProxyHeaders(req: Request | NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const reviewerIdentity = getReviewerIdentity(req);
  const verificationSecret = getPlayerVerificationSecret();

  if (reviewerIdentity) {
    headers[PLAYER_REVIEWER_IDENTITY_HEADER] = reviewerIdentity;
  }
  if (verificationSecret) {
    headers[PLAYER_VERIFICATION_SECRET_HEADER] = verificationSecret;
  }

  return headers;
}

export function basicAuthChallenge(status = 401) {
  return new NextResponse("Authentication required", {
    status,
    headers: {
      "WWW-Authenticate": 'Basic realm="Player Verification"',
    },
  });
}
