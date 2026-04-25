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

function absoluteUrl(path: string) {
  return `https://billiardtoday.com${path}`;
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
    "<div style=\"margin:0;padding:32px 16px;background:linear-gradient(180deg,#eaf4ff 0%,#f8fbff 100%);font-family:Arial,sans-serif;color:#0f172a\">",
    "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe7f3;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.08)\">",
    "<div style=\"padding:18px 24px;background:linear-gradient(135deg,#0f172a 0%,#082f49 42%,#164e63 100%);color:#f8fafc\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border-collapse:collapse\">",
    "<tr>",
    "<td style=\"font-size:11px;letter-spacing:0.32em;text-transform:uppercase;opacity:0.82\">Billiard Today</td>",
    `<td align="right" style="font-size:13px"><a href="${absoluteUrl("/contact")}" style="display:inline-block;padding:10px 16px;border:1px solid rgba(255,255,255,0.18);border-radius:999px;color:#ffffff;text-decoration:none;font-weight:600">Contact us</a></td>`,
    "</tr>",
    "</table>",
    "<div style=\"margin-top:14px;font-size:28px;line-height:1.2;font-weight:700\">We received your message</div>",
    "<div style=\"margin-top:10px;font-size:15px;line-height:1.7;color:rgba(248,250,252,0.82)\">The Billiard Today team has your request and will reply as soon as possible.</div>",
    "<div style=\"margin-top:18px\">",
    `<a href="${absoluteUrl("/live")}" style="display:inline-block;margin-right:10px;padding:10px 16px;border-radius:999px;background:rgba(103,232,249,0.14);border:1px solid rgba(103,232,249,0.28);color:#ecfeff;text-decoration:none;font-size:13px;font-weight:600">View live</a>`,
    `<a href="${absoluteUrl("/clubs")}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);color:#ffffff;text-decoration:none;font-size:13px;font-weight:600">Browse clubs</a>`,
    "</div>",
    "</div>",
    "<div style=\"padding:28px 24px\">",
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.7">Hello ${escapeHtml(cleanName)},</p>`,
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155\">Thank you for contacting Billiard Today. Your message has been received successfully and our team will get back to you as soon as possible.</p>",
    "<div style=\"margin:24px 0;padding:16px 18px;border:1px solid #d9e8f4;border-radius:16px;background:#f8fbfe\">",
    "<div style=\"font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#0f5f8c;font-weight:700\">What happens next</div>",
    "<p style=\"margin:10px 0 0;font-size:15px;line-height:1.7;color:#334155\">A member of the Billiard Today team will review your request and reply directly to the email address you used in the form.</p>",
    "</div>",
    "<p style=\"margin:0;font-size:15px;line-height:1.7;color:#475569\">If your request is urgent, you can simply reply to this email with any extra details.</p>",
    "<p style=\"margin:24px 0 0;font-size:15px;line-height:1.7;color:#0f172a\">Thank you,<br /><strong>Billiard Today</strong></p>",
    "</div>",
    "<div style=\"padding:22px 24px;background:#05080d;color:#e2e8f0\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border-collapse:collapse\">",
    "<tr>",
    "<td valign=\"top\" style=\"padding-right:16px\">",
    "<div style=\"font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#94a3b8\">Billiard Today</div>",
    "<div style=\"margin-top:10px;font-size:14px;line-height:1.7;color:#cbd5e1\">Cleaner operations, clearer public presentation, and better use of every screen.</div>",
    "</td>",
    "<td valign=\"top\" align=\"right\">",
    `<div style="margin-bottom:8px"><a href="${absoluteUrl("/privacy-policy")}" style="color:#e2e8f0;text-decoration:none;font-size:13px">Privacy Policy</a></div>`,
    `<div style="margin-bottom:8px"><a href="${absoluteUrl("/terms-of-service")}" style="color:#e2e8f0;text-decoration:none;font-size:13px">Terms of Service</a></div>`,
    `<div><a href="${absoluteUrl("/cookie-policy")}" style="color:#e2e8f0;text-decoration:none;font-size:13px">Cookie Policy</a></div>`,
    "</td>",
    "</tr>",
    "</table>",
    `<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.7;color:#94a3b8">Visit <a href="${absoluteUrl("/")}" style="color:#e2e8f0;text-decoration:none">billiardtoday.com</a> for clubs, live screens, tournaments, rankings, and public updates.</div>`,
    "</div>",
    "</div>",
    "</div>",
  ].join("");

  const confirmationText = [
    `Hello ${cleanName},`,
    "",
    "Thank you for contacting Billiard Today.",
    "",
    "Your message has been received successfully and our team will get back to you as soon as possible.",
    "",
    "A member of the Billiard Today team will review your request and reply directly to the email address you used in the form.",
    "",
    "Useful links:",
    `Contact: ${absoluteUrl("/contact")}`,
    `Live: ${absoluteUrl("/live")}`,
    `Clubs: ${absoluteUrl("/clubs")}`,
    "",
    "Thank you,",
    "Billiard Today",
  ].join("\n");

  try {
    await sendResendEmail(apiKey, {
      from,
      to: [cleanEmail],
      subject: "We received your message | Billiard Today",
      html: confirmationHtml,
      text: confirmationText,
    });
  } catch (error) {
    console.warn("Contact form confirmation email failed", error);
  }

  return submissionResponse;
}
