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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: cleanEmail,
      subject: composedSubject,
      html,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
