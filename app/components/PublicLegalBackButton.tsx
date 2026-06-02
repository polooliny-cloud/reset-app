"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PublicLegalBackButton() {
  const searchParams = useSearchParams();
  const backHref = searchParams.get("from") === "subscription" ? "/subscription" : "/";
  const ariaLabel = backHref === "/subscription" ? "К выбору тарифа" : "На главную";
  const topInset = "calc(8px + env(safe-area-inset-top))";
  const leftInset = "calc(16px + env(safe-area-inset-left))";

  return (
    <Link
      href={backHref}
      aria-label={ariaLabel}
      className="fixed z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white"
      style={{ top: topInset, left: leftInset }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
