import { getServerEnv } from "@/lib/serverEnv";

export interface ContactFormPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRequiredEnv(key: string) {
  const value = getServerEnv(key);
  if (!value) {
    throw new Error(`Missing required server env: ${key}`);
  }
  return value;
}

interface ResendEmailInput {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
}

async function sendResendEmail(apiKey: string, input: ResendEmailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "billiardtoday-frontend/1.0",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function sendContactEmail(input: ContactFormPayload) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const to = getRequiredEnv("CONTACT_FORM_TO_EMAIL");
  const from = getRequiredEnv("CONTACT_FORM_FROM_EMAIL");
  const subjectPrefix = getServerEnv("CONTACT_FORM_SUBJECT_PREFIX") || "[Billiard Today Contact]";

  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim();
  const cleanSubject = (input.subject || "").trim();
  const cleanMessage = input.message.trim();
  const subjectSuffix = cleanSubject ? ` ${cleanSubject}` : ` Message from ${cleanName}`;
  const composedSubject = `${subjectPrefix}${subjectSuffix}`;

  const html = [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">",
    "<h2 style=\"margin:0 0 16px\">New contact form submission</h2>",
    `<p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>`,
    cleanSubject ? `<p><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>` : "",
    "<p><strong>Message:</strong></p>",
    `<div style="white-space:pre-wrap;border:1px solid #cbd5e1;border-radius:12px;padding:16px;background:#f8fafc">${escapeHtml(cleanMessage)}</div>`,
    "</div>",
  ].join("");

  const text = [
    "New contact form submission",
    "",
    `Name: ${cleanName}`,
    `Email: ${cleanEmail}`,
    cleanSubject ? `Subject: ${cleanSubject}` : "",
    "",
    "Message:",
    cleanMessage,
  ]
    .filter(Boolean)
    .join("\n");

  const submissionResponse = await sendResendEmail(apiKey, {
    from,
    to: [to],
    reply_to: cleanEmail,
    subject: composedSubject,
    html,
    text,
  });

  const confirmationHtml = [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">",
    `<p>Hello ${escapeHtml(cleanName)},</p>`,
    "<p>We received your message and will get back to you as soon as possible.</p>",
    "<p>Thank you,<br />Billiard Today</p>",
    "</div>",
  ].join("");

  const confirmationText = [
    `Hello ${cleanName},`,
    "",
    "We received your message and will get back to you as soon as possible.",
    "",
    "Thank you,",
    "Billiard Today",
  ].join("\n");

  try {
    await sendResendEmail(apiKey, {
      from,
      to: [cleanEmail],
      subject: "We received your message",
      html: confirmationHtml,
      text: confirmationText,
    });
  } catch (error) {
    console.warn("Contact form confirmation email failed", error);
  }

  return submissionResponse;
}
