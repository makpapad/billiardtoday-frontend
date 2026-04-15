import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

type SocialLink = {
  platform: string;
  label?: string | null;
  url: string;
};

type Props = {
  siteName: string;
  description: string;
  exploreLinks: FooterLink[];
  socialLinks: SocialLink[];
  renderContainerOnly?: boolean;
};

const RESOURCE_LINKS: FooterLink[] = [
  { label: "Manual", href: "/manual" },
  { label: "Cookie policy", href: "/cookie-policy" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms of service", href: "/terms-of-service" },
];

const getSocialLabel = (platform: string) => {
  const clean = platform.trim().toLowerCase();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Social";
};

const getSocialIcon = (platform: string) => {
  const clean = platform.trim().toLowerCase();

  if (clean === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47H15.2c-1.25 0-1.64.78-1.64 1.58v1.89h2.8l-.45 2.9h-2.35V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
      </svg>
    );
  }

  return (
    <span className="text-sm font-semibold">
      {getSocialLabel(platform).slice(0, 2).toUpperCase()}
    </span>
  );
};

export function PublicFooter({
  siteName,
  description,
  exploreLinks,
  socialLinks,
  renderContainerOnly = false,
}: Props) {
  const body = (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
      <div className="space-y-5">
        <img
          src="/logo-billiardtoday.png"
          alt={`${siteName} logo`}
          className="h-14 w-auto object-contain sm:h-16"
        />
        <p className="max-w-xl text-sm leading-7 text-slate-300">{description}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
          © {new Date().getFullYear()} Billiard Today. All rights reserved.
        </p>
      </div>

      <div>
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Explore
        </div>
        <div className="space-y-3">
          {exploreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm text-slate-200 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Resources
        </div>
        <div className="space-y-3">
          {RESOURCE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm text-slate-200 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Connect socially
        </div>
        <div className="flex flex-wrap gap-3">
          {socialLinks.map((link) => (
            <a
              key={`${link.platform}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label || getSocialLabel(link.platform)}
              title={link.label || getSocialLabel(link.platform)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#1877F2] transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {getSocialIcon(link.platform)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  if (renderContainerOnly) {
    return body;
  }

  return <footer className="border-t border-white/10 bg-black py-12 text-white">{body}</footer>;
}
