import Image from "next/image";

export type TournamentAd = {
  src: string;
  alt: string;
  href?: string;
};

const tournamentAds: TournamentAd[] = [
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

/** Χορηγοί του Future of Billiards 2026 (Pulderbos). */
export const futureOfBilliardsAds: TournamentAd[] = [
  { src: "/img/logos/ads/1-aramith.jpg", alt: "Aramith" },
  { src: "/img/logos/ads/2-Logoni.jpg", alt: "Longoni" },
  { src: "/img/logos/ads/3-simonis.jpg", alt: "Simonis" },
  { src: "/img/logos/ads/4-Verhoeven.jpg", alt: "Verhoeven" },
];

export function TournamentAdsStrip({
  ads = tournamentAds,
  className = "mt-10",
}: {
  ads?: TournamentAd[];
  className?: string;
}) {
  return (
    <section className={`${className} bg-white/95 py-6`.trim()}>
      <div className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: "var(--bt-page-width, 1280px)" }}>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ads.map((ad) => {
              const card = (
                <>
                  <Image
                    src={ad.src}
                    alt={ad.alt}
                    width={220}
                    height={96}
                    className="max-h-14 w-full object-contain"
                    unoptimized
                  />
                </>
              );
              const cardClassName =
                "flex h-20 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";

              return ad.href ? (
                <a
                  key={ad.src}
                  href={ad.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClassName}
                >
                  {card}
                </a>
              ) : (
                <div key={ad.src} className={cardClassName}>
                  {card}
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex justify-center border-t border-slate-100 pt-5">
            <div
              className="flex h-20 w-full max-w-[280px] flex-col items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-5 py-3"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
