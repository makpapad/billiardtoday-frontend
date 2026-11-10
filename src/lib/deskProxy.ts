import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

/**
 * Κοινό πέρασμα προς το Event Desk / club portal στο Strapi.
 *
 * Το token (club JWT ή desk token) μένει στον browser και έρχεται με `Authorization: Bearer ***
 * — ίδιο μοτίβο με το `/api/federation-access`. Μία διαδρομή ανά endpoint, χωρίς catch-all.
 */
export async function forwardToDeskApi(
  request: Request,
  target: string,
  method: "GET" | "POST",
): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");
  const body = method === "POST" ? await request.text() : undefined;
  const search = method === "GET" ? new URL(request.url).search : "";

  let res: Response;
  try {
    res = await fetch(`${SERVER_API_URL}/api/${target}${search}`, {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      ...(body === undefined ? {} : { body }),
    });
  } catch {
    return NextResponse.json(
      { error: { status: 502, message: "Το σύστημα δεν απάντησε — δοκιμάστε ξανά" } },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
