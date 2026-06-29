"use client";

import { useRouter } from "next/navigation";

type PlayerBackButtonProps = {
  href?: string;
};

export function PlayerBackButton({ href = "/players" }: PlayerBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-2 text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
