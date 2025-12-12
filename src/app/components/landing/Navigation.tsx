"use client";

import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useLandingT } from "./i18n";

const smoothScroll = (targetId: string) => {
  const element = document.getElementById(targetId);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
};

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, locale, setLocale } = useLandingT();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#1e293b] bg-[#0a0e1a]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d9ff]">
            <div className="h-6 w-6 rounded-full border-2 border-white" />
          </div>
          <span className="text-xl tracking-tight text-white">BilliardToday</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <button 
            onClick={() => smoothScroll("features")}
            className="text-[#94a3b8] transition-colors hover:text-white"
          >
            {t("nav.features")}
          </button>
          <button 
            onClick={() => smoothScroll("how-it-works")}
            className="text-[#94a3b8] transition-colors hover:text-white"
          >
            {t("nav.howItWorks")}
          </button>
          <button 
            onClick={() => smoothScroll("for-you")}
            className="text-[#94a3b8] transition-colors hover:text-white"
          >
            {t("nav.forYou")}
          </button>
          
          {/* Language Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-[#94a3b8] transition-colors hover:text-white">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">
                {locale === "el" ? "ΕΛ" : "EN"}
              </span>
            </button>
            <div className="absolute right-0 mt-2 w-24 rounded-lg border border-[#1e293b] bg-[#1a2235] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => setLocale("el")}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  locale === "el" 
                    ? "bg-[#00ff88]/20 text-[#00ff88]" 
                    : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
                }`}
              >
                ΕΛ
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  locale === "en" 
                    ? "bg-[#00ff88]/20 text-[#00ff88]" 
                    : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
                }`}
              >
                EN
              </button>
            </div>
          </div>
          
          <button className="rounded-lg bg-[#00ff88] px-6 py-2 text-[#0a0e1a] transition hover:bg-[#00ff88]/90">
            {t("nav.login")}
          </button>
        </div>

        <button
          className="text-white md:hidden"
          type="button"
          aria-label="Toggle menu"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-[#1e293b] bg-[#0a0e1a] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => smoothScroll("features")}
              className="text-[#94a3b8] transition-colors hover:text-white text-left"
            >
              {t("nav.features")}
            </button>
            <button 
              onClick={() => smoothScroll("how-it-works")}
              className="text-[#94a3b8] transition-colors hover:text-white text-left"
            >
              {t("nav.howItWorks")}
            </button>
            <button 
              onClick={() => smoothScroll("for-you")}
              className="text-[#94a3b8] transition-colors hover:text-white text-left"
            >
              {t("nav.forYou")}
            </button>
            
            {/* Mobile Language Switcher */}
            <div className="border-t border-[#1e293b] pt-4">
              <div className="flex items-center gap-2 text-[#94a3b8] mb-3">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">Γλώσσα / Language</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocale("el")}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    locale === "el" 
                      ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30" 
                      : "bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b]"
                  }`}
                >
                  ΕΛ
                </button>
                <button
                  onClick={() => setLocale("en")}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    locale === "en" 
                      ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30" 
                      : "bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b]"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
            
            <button className="rounded-lg bg-[#00ff88] px-6 py-2 text-[#0a0e1a] transition hover:bg-[#00ff88]/90">
              {t("nav.login")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
