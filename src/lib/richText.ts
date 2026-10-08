// Presentation-only helpers for Strapi rich-text style descriptions.
//
// Tournament descriptions are stored as (often messy) HTML in Strapi. The public
// site must render them as clean, readable text — never as literal markup — while
// keeping any embedded links clickable. These helpers are pure and never mutate
// the stored value; the data layer keeps returning the original string.

export type RichTextSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const HTML_ENTITIES: Array<[RegExp, string]> = [
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&#0*39;/g, "'"],
  [/&#x0*27;/gi, "'"],
  [/&apos;/gi, "'"],
  [/&nbsp;/gi, " "],
  [/&#0*160;/g, " "],
  // Decode &amp; last so that "&amp;lt;" is not double-decoded into "<".
  [/&amp;/gi, "&"],
];

const decodeEntities = (value: string): string =>
  HTML_ENTITIES.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    value,
  );

// Closing tags of block-level elements act as paragraph breaks.
const BLOCK_BREAK_TAGS =
  /<\s*\/\s*(?:p|div|li|h[1-6]|tr|section|article|blockquote|ul|ol|dl|dd|dt|figure|figcaption|pre|table|thead|tbody)\s*>/gi;

// "rnrn" is a mangled `\r\n\r\n`. Only treat it as an artefact when it is not
// glued to word characters, so real words containing those letters are untouched.
const MANGLED_NEWLINE_ARTEFACT = /(^|[^A-Za-z0-9])rnrn(?![A-Za-z0-9])/gi;

const normalizeFragment = (value: string): string => {
  let text = value;

  // Mangled newline artefact → paragraph break.
  text = text.replace(MANGLED_NEWLINE_ARTEFACT, "$1\n\n");
  // Escaped CRLF that was stored as literal text → paragraph break.
  text = text.replace(/\\r\\n/g, "\n\n");
  // Real newlines: normalise CRLF / lone CR; blank-line runs stay paragraph breaks.
  text = text.replace(/\r\n?/g, "\n");

  // Anchors collapse to their visible label in plain-text contexts.
  text = text.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // Line-break and block-level closing tags become breaks.
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(BLOCK_BREAK_TAGS, "\n\n");

  // Drop any remaining markup.
  text = text.replace(/<[^>]*>/g, "");

  // Decode entities after stripping tags so decoded "<"/">" can never look like markup.
  text = decodeEntities(text);

  // Collapse whitespace but preserve a single paragraph break between blocks.
  text = text.replace(/[^\S\n]+/g, " ");
  text = text.replace(/ *\n */g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
};

/**
 * Flatten a rich-text/HTML description into clean plain text for meta tags,
 * SEO copy and JSON-LD. Returns "" for null/undefined and is a no-op for
 * already-clean text. Paragraph breaks are represented as "\n\n".
 */
export function toPlainText(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return normalizeFragment(value);
}

const HREF_ATTR = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const isHttpHref = (href: string): boolean => /^https?:\/\//i.test(href);

const extractHref = (attributes: string): string => {
  const match = HREF_ATTR.exec(attributes);
  if (!match) return "";
  const raw = match[1] ?? match[2] ?? match[3] ?? "";
  return decodeEntities(raw).trim();
};

/**
 * Split a rich-text/HTML description into ordered renderable segments so a
 * paragraph can be shown as text with real clickable links instead of raw HTML.
 * Only http/https hrefs become link segments; anything else falls back to text.
 */
export function splitRichText(
  value: string | null | undefined,
): RichTextSegment[] {
  if (typeof value !== "string" || value.length === 0) return [];

  const segments: RichTextSegment[] = [];
  const pushText = (fragment: string) => {
    const text = normalizeFragment(fragment);
    if (text) segments.push({ type: "text", text });
  };

  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(value)) !== null) {
    pushText(value.slice(cursor, match.index));

    const href = extractHref(match[1]);
    const label = normalizeFragment(match[2]);

    if (href && isHttpHref(href)) {
      segments.push({ type: "link", text: label || href, href });
    } else {
      pushText(match[2]);
    }

    cursor = match.index + match[0].length;
  }

  pushText(value.slice(cursor));

  return segments;
}
