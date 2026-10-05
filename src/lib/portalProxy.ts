import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

/**
 * Κοινό πέρασμα προς την πύλη ομοσπονδίας στο Strapi.
 *
 * Το JWT μένει στον browser (localStorage) και έρχεται με `Authorization: Bearer …`
 * — ίδιο μοτίβο με το `/api/account-access`. Οι διαδρομές είναι ρητές (ένα αρχείο
 * ανά endpoint) ώστε να μην χρειάζεται catch-all route.
 */
export async function forwardToPortal(
  request: Request,
  target: string,
  method: "GET" | "POST",
): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");
  const body = method === "POST" ? await request.text() : undefined;
  const search = method === "GET" ? new URL(request.url).search : "";

  let res: Response;
  try {
    res = await fetch(`${SERVER_API_URL}/api/federation-portal/${target}${search}`, {
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
