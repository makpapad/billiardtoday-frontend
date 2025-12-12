"use client";

import { useLandingT } from "./i18n";

export function Footer() {
  const { t } = useLandingT();
  return (
    <footer className="border-t border-[#1e293b] bg-[#0a0e1a] py-12 px-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d9ff]">
                <div className="h-6 w-6 rounded-full border-2 border-white" />
              </div>
              <span className="text-xl tracking-tight">BilliardToday</span>
            </div>
            <p className="text-[#64748b]">{t('footer.description')}</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">{t('footer.platform.title')}</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.platform.features')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.platform.pricing')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.platform.guide')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">{t('footer.community.title')}</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.community.tournaments')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.community.rankings')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.community.clubs')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">{t('footer.support.title')}</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.support.contact')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  FAQ
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.support.terms')}
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-[#00ff88]" href="#">
                  {t('footer.support.privacy')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#1e293b] pt-8 text-[#64748b] md:flex-row">
          <p>{t('footer.copyright')}</p>
          <div className="flex gap-6">
            <a className="transition-colors hover:text-[#00ff88]" href="#">
              Facebook
            </a>
            <a className="transition-colors hover:text-[#00ff88]" href="#">
              Instagram
            </a>
            <a className="transition-colors hover:text-[#00ff88]" href="#">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
