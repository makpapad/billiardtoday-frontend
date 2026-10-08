import { splitRichText } from "@/lib/richText";

type RichDescriptionProps = {
  value: string | null | undefined;
  className?: string;
  linkClassName?: string;
};

const DEFAULT_LINK_CLASS =
  "font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900";

/**
 * Renders a Strapi tournament description as readable text with real links.
 * Never uses dangerouslySetInnerHTML; markup is flattened to text + <a> nodes.
 * Paragraph breaks from `splitRichText` are preserved via whitespace-pre-line.
 */
export function RichDescription({
  value,
  className,
  linkClassName,
}: RichDescriptionProps) {
  const segments = splitRichText(value);
  if (segments.length === 0) return null;

  return (
    <span
      className={["whitespace-pre-line", className].filter(Boolean).join(" ")}
    >
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={`rich-link-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName ?? DEFAULT_LINK_CLASS}
          >
            {segment.text}
          </a>
        ) : (
          <span key={`rich-text-${index}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
