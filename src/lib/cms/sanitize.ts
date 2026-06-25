const stripTag = (html: string, tagName: string) => {
  const openTag = new RegExp(`<${tagName}[^>]*>`, "gi");
  const closeTag = new RegExp(`</${tagName}>`, "gi");
  return html.replace(openTag, "").replace(closeTag, "");
};

const stripTagWithContent = (html: string, tagName: string) =>
  html.replace(new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, "gi"), "");

const stripBodyInner = (html: string) => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
};

const stripDoctype = (html: string) => html.replace(/<!doctype[^>]*>/gi, "");

const stripThemeWrappers = (html: string) => {
  let next = html.replace(/<div[^>]*class="[^"]*\bbt-cms-theme\b[^"]*"[^>]*>/gi, "");

  // Builder exports tend to leave wrapper-only closing tags after removing
  // the `.bt-cms-theme` containers.
  while (/^\s*<\/div>/.test(next)) {
    next = next.replace(/^\s*<\/div>/i, "");
  }
  while (/<\/div>\s*$/.test(next)) {
    next = next.replace(/<\/div>\s*$/i, "");
  }

  return next;
};

const stripBuilderNoise = (html: string) =>
  html
    .replace(/@import\s+url\([^)]*\);\s*/gi, "")
    .replace(/\s(id|data-gjs-[\w-]+|draggable|contenteditable)="[^"]*"/gi, "");

const unwrapNestedHomeSection = (html: string) => {
  const match = html.match(
    /<section[^>]*>\s*<h2[^>]*>\s*home\s*<\/h2>\s*<div>([\s\S]*)<\/div>\s*<\/section>/i,
  );
  return match ? match[1] : html;
};

const rewriteUploadSources = (html: string, resolveUrl?: (value: string) => string | null) => {
  if (!resolveUrl) return html;
  return html.replace(/\b(src|href)=(["'])(\/uploads\/[^"']+)\2/gi, (_match, attr: string, quote: string, url: string) => {
    const resolved = resolveUrl(url);
    return `${attr}=${quote}${resolved || url}${quote}`;
  });
};

export const sanitizeCmsHtml = (value: string, resolveUrl?: (value: string) => string | null) => {
  let html = String(value || "").trim();
  if (!html) return "";

  html = stripDoctype(html);
  html = stripBodyInner(html);
  html = stripTagWithContent(html, "style");
  html = stripTagWithContent(html, "script");
  html = stripTagWithContent(html, "noscript");
  html = stripTagWithContent(html, "head");
  html = stripTag(html, "html");
  html = stripTag(html, "head");
  html = stripTag(html, "body");
  html = stripThemeWrappers(html);
  html = unwrapNestedHomeSection(html);
  html = stripBuilderNoise(html);
  html = rewriteUploadSources(html, resolveUrl);

  return html.trim();
};
