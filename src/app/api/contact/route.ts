import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/contact-email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const submissionsByIp = new Map<string, number[]>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (submissionsByIp.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    submissionsByIp.set(ip, recent);
    return true;
  }

  recent.push(now);
  submissionsByIp.set(ip, recent);
  return false;
}

function validateString(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many contact requests from this IP. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body?.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = validateString(body?.name, 2, 120);
    const email = validateString(body?.email, 5, 160);
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 160) : "";
    const message = validateString(body?.message, 10, 4000);

    if (!name || !email || !message || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid name, email, and message." },
        { status: 400 },
      );
    }

    await sendContactEmail({
      name,
      email,
      subject,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form send failed", error);
    return NextResponse.json(
      { error: "Unable to send your message right now. Please try again later." },
      { status: 500 },
    );
  }
}
