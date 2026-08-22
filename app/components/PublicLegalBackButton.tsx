"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PublicLegalBackButton({
  defaultHref = "/",
  ariaLabel,
  showLabel = false,
}: {
  defaultHref?: string;
  ariaLabel?: string;
  showLabel?: boolean;
}) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const backHref =
    from === "subscription"
      ? "/subscription"
      : from === "onboarding"
        ? "/onboarding"
        : from === "legal"
          ? "/legal"
          : defaultHref;
  const resolvedAriaLabel =
    ariaLabel ??
    (backHref === "/subscription"
      ? "К выбору тарифа"
      : backHref === "/onboarding"
        ? "Назад"
        : "На главную");
  const topInset = "calc(8px + env(safe-area-inset-top))";
  const leftInset = "calc(16px + env(safe-area-inset-left))";

  return (
    <Link
      href={backHref}
      aria-label={resolvedAriaLabel}
      className={`fixed z-50 inline-flex items-center justify-center border border-white/10 bg-white/5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white ${
        showLabel ? "gap-1 rounded-full py-2 pl-2.5 pr-3.5" : "rounded-full p-2.5"
      }`}
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
      {showLabel ? <span className="text-sm font-medium">Назад</span> : null}
    </Link>
  );
}
