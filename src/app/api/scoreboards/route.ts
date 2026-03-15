import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(request: NextRequest) {
  try {
    const search = new URL(request.url).searchParams.toString();
    const targetUrl = `${API_URL}/api/scoreboard/sessions${search ? `?${search}` : ""}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = process.env.STRAPI_API_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(targetUrl, {
      cache: "no-store",
      headers,
    });

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error?.message || "Failed to proxy scoreboards request" },
      { status: 500 },
    );
  }
}
