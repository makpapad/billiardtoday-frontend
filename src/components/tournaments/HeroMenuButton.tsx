"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Το κουμπί-εικονίδιο του hero ενός τουρνουά (Live / Tournament / Time Table /
 * Final standings / Photo gallery / Participants / Info). Ζει ξεχωριστά ώστε το
 * μενού να είναι ΤΟ ΙΔΙΟ στην ατομική και στην ομαδική σελίδα τουρνουά.
 */

export type HeroMenuButtonProps = {
  label: string;
  iconSrc: string;
  active: boolean;
  onClick: () => void;
  href?: string | null;
  badge?: string | number | null;
};

export function HeroMenuButton({
  label,
  iconSrc,
  active,
  onClick,
  href,
  badge,
}: HeroMenuButtonProps) {
  const className = `group relative inline-flex h-[56px] w-[56px] items-center justify-center rounded-[20px] border transition duration-200 sm:h-[62px] sm:w-[62px] ${
    active
      ? "border-white/70 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
      : "border-white/15 bg-white/10 hover:bg-white/15"
  }`;
  const content = (
    <>
      <Image
        src={iconSrc}
        alt={label}
        width={56}
        height={56}
        className={`h-[44px] w-[44px] object-contain transition duration-200 sm:h-[50px] sm:w-[50px] ${
          active ? "scale-105" : "opacity-95 group-hover:scale-105"
        }`}
        unoptimized
      />
      {badge != null && badge !== '' ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(239,68,68,0.5)] animate-pulse">
          {badge}
        </span>
      ) : null}
      <span className="pointer-events-none absolute -bottom-11 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_32px_rgba(15,23,42,0.38)] group-hover:block group-focus-visible:block">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
    >
      {content}
    </button>
  );
}
