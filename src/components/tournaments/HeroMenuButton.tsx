"use client";

import Image from "next/image";
import Link from "next/link";

import { useHeroMenuHelp } from "./HeroMenuHelp";

/**
 * Το κουμπί-εικονίδιο του hero ενός τουρνουά (Live / Tournament / Time Table /
 * Final standings / Photo gallery / Participants / Info). Ζει ξεχωριστά ώστε το
 * μενού να είναι ΤΟ ΙΔΙΟ στην ατομική και στην ομαδική σελίδα τουρνουά.
 */

export type HeroMenuButtonProps = {
  label: string;
  /** Εικονίδιο από `/public/icons webp`. Προαιρετικό όταν δίνεται `emoji`. */
  iconSrc?: string;
  /** Εναλλακτικό του εικονιδίου: emoji (π.χ. 📰 για τα άρθρα της διοργάνωσης). */
  emoji?: string;
  active: boolean;
  onClick: () => void;
  href?: string | null;
  badge?: string | number | null;
};

export function HeroMenuButton({
  label,
  iconSrc,
  emoji,
  active,
  onClick,
  href,
  badge,
}: HeroMenuButtonProps) {
  // Η εξήγηση εμφανίζεται στη λωρίδα του hero (HeroMenuHelpStrip) — το κλικ
  // εδώ ανοίγει κανονικά την καρτέλα.
  const help = useHeroMenuHelp();
  const className = `group relative inline-flex h-[56px] w-[56px] items-center justify-center rounded-[20px] border transition duration-200 sm:h-[62px] sm:w-[62px] ${
    active
      ? "border-white/70 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
      : "border-white/15 bg-white/10 hover:bg-white/15"
  }`;
  const content = (
    <>
      {iconSrc ? (
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
      ) : (
        <span
          aria-hidden
          className={`select-none text-[30px] leading-none transition duration-200 sm:text-[34px] ${
            active ? "scale-105" : "opacity-95 group-hover:scale-105"
          }`}
        >
          {emoji}
        </span>
      )}
      {badge != null && badge !== '' ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(239,68,68,0.5)] animate-pulse">
          {badge}
        </span>
      ) : null}
    </>
  );

  // Το παλιό hover κουτάκι και το `title` του browser βγαίνουν όταν υπάρχει η
  // λωρίδα εξήγησης — αλλιώς θα εμφανίζονταν δύο tooltips μαζί. Χωρίς provider
  // (π.χ. σελίδες που δεν έχουν μπει ακόμη) μένει το `title` όπως πριν.
  const hoverProps = help
    ? {
        onMouseEnter: () => help.show(label),
        onMouseLeave: () => help.hide(),
        onFocus: () => help.show(label),
        onBlur: () => help.hide(),
      }
    : {};

  if (href) {
    return (
      <Link
        href={href}
        title={help ? undefined : label}
        aria-label={label}
        className={className}
        {...hoverProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={help ? undefined : label}
      aria-label={label}
      className={className}
      {...hoverProps}
    >
      {content}
    </button>
  );
}
