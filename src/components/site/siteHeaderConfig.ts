import type { SiteHeaderNavItem } from "@/components/site/SiteHeader";

export const SITE_HEADER_NAV_ITEMS: SiteHeaderNavItem[] = [
  { label: "Platform", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Live screens", href: "/#screenshots" },
  { label: "For clubs", href: "/#benefits" },
  {
    label: "More",
    href: "#",
    children: [
      { label: "Live", href: "/live" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Rankings", href: "/rankings" },
      { label: "Clubs", href: "/clubs" },
      { label: "Federations", href: "/federations" },
      { label: "Players", href: "/players" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    label: "CEB",
    href: "/federations/confederation-europeenne-de-billard",
    iconSrc: "/img/logo/ceb.png",
    iconAlt: "CEB logo",
    iconClassName: "h-10 w-10 rounded-full object-cover shadow-[0_0_10px_rgba(255,255,255,0.18)] blur-[0.2px]",
  },
  {
    label: "UMB",
    href: "/federations/union-mondiale-de-billard",
    iconSrc: "/img/logo/umb.jpg",
    iconAlt: "UMB logo",
    iconClassName: "h-10 w-10 rounded-full object-cover shadow-[0_0_10px_rgba(255,255,255,0.18)] blur-[0.2px]",
  },
];

export const SITE_HEADER_PRIMARY_CTA: SiteHeaderNavItem = {
  label: "Contact us",
  href: "/contact",
};

export const SITE_HEADER_SECONDARY_CTA: SiteHeaderNavItem = {
  label: "View live",
  href: "/live",
};
