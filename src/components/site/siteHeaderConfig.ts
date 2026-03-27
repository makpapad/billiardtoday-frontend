import type { SiteHeaderNavItem } from "@/components/site/SiteHeader";

export const SITE_HEADER_NAV_ITEMS: SiteHeaderNavItem[] = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Screens", href: "/#screenshots" },
  { label: "Benefits", href: "/#benefits" },
  {
    label: "More",
    href: "#",
    children: [
      { label: "Live", href: "/live" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Clubs", href: "/clubs" },
      { label: "Organizers", href: "/federations" },
      { label: "Players", href: "/players" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    label: "CEB",
    href: "/federations/ceb",
    iconSrc: "/img/logo/ceb.png",
    iconAlt: "CEB logo",
    iconClassName: "h-10 w-auto object-contain",
  },
];

export const SITE_HEADER_PRIMARY_CTA: SiteHeaderNavItem = {
  label: "Book a demo",
  href: "/#cta",
};

export const SITE_HEADER_SECONDARY_CTA: SiteHeaderNavItem = {
  label: "Live demo",
  href: "/live",
};
