import Image from "next/image";

const tournamentAds = [
  {
    src: "/img/logos/ads/1-eoaa-transp-blue-in-white.webp",
    alt: "EOAA",
    href: "https://www.eoaa.org.gr/",
  },
  {
    src: "/img/logos/ads/2-Koralli_Logo_EST.webp",
    alt: "Koralli",
    href: "https://www.facebook.com/KoralliBilliardClubCafe",
  },
  {
    src: "/img/logos/ads/3-sivis.webp",
    alt: "Sivissidis",
    href: "https://sivissidis.gr/",
  },
  {
    src: "/img/logos/ads/4-ag-paraskevi-copy.webp",
    alt: "Agia Paraskevi",
    href: "https://www.agiaparaskevi.gr/portal/",
  },
  {
    src: "/img/logos/ads/5-Eurologic.webp",
    alt: "Eurologic",
    href: "https://www.eurologic.gr/",
  },
  {
    src: "/img/logos/ads/6-maxtherm.webp",
    alt: "Maxtherm",
    href: "https://www.maxtherm.gr/",
  },
];

export function TournamentAdsStrip() {
  return (
    <section className="mt-10 bg-white/95 py-6">
      <div className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: "var(--bt-page-width, 1280px)" }}>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {tournamentAds.map((ad) => (
              <a
                key={ad.src}
                href={ad.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-20 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <Image
                  src={ad.src}
                  alt={ad.alt}
                  width={220}
                  height={96}
                  className="max-h-14 w-full object-contain"
                  unoptimized
                />
              </a>
            ))}
          </div>
          <div className="mt-5 flex justify-center border-t border-slate-100 pt-5">
            <a
              href="https://billiardtoday.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-20 w-full max-w-[280px] flex-col items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-5 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Powered by
              </span>
              <Image
                src="/logo-billiardtoday-loading.png"
                alt="Billiard Today"
                width={562}
                height={180}
                className="max-h-11 w-full object-contain"
                unoptimized
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
