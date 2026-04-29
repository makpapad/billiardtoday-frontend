import { NextRequest, NextResponse } from "next/server";
import { PLAYER_REVIEWER_IDENTITY_HEADER, basicAuthChallenge } from "@/lib/player-review-admin";

function decodeBasicAuth(header: string | null) {
  if (!header) return null;
  const [scheme, encoded] = header.split(" ", 2);
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const expectedUsername = process.env.PLAYER_VERIFICATION_ADMIN_USERNAME?.trim() || "";
  const expectedPassword = process.env.PLAYER_VERIFICATION_ADMIN_PASSWORD?.trim() || "";

  if (!expectedUsername || !expectedPassword) {
    if (process.env.NODE_ENV === "development") {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set(PLAYER_REVIEWER_IDENTITY_HEADER, "local-dev-reviewer");
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return new NextResponse("Player verification admin credentials are not configured", {
      status: 503,
    });
  }

  const credentials = decodeBasicAuth(req.headers.get("authorization"));
  if (
    !credentials ||
    credentials.username !== expectedUsername ||
    credentials.password !== expectedPassword
  ) {
    return basicAuthChallenge();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(PLAYER_REVIEWER_IDENTITY_HEADER, credentials.username);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/admin/player-enrollment-requests/:path*",
    "/admin/player-accounts/:path*",
    "/api/admin/player-enrollment-requests/:path*",
    "/api/admin/player-accounts/:path*",
    "/api/admin/tournament/players/:path*",
  ],
};
