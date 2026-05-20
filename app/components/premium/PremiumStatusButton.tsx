"use client";

import Link from "next/link";

import { usePremium } from "@/app/components/PremiumProvider";
import { getPremiumChipLabel } from "@/lib/premium/presentation";

type Props = {
  className?: string;
};

export function PremiumStatusButton({ className = "" }: Props) {
  const premium = usePremium();
  const { isPremium, isTrial, loading } = premium;
  const chip = getPremiumChipLabel(premium);

  const label = loading ? "…" : isPremium ? "RESET+" : "Статус";

  return (
    <Link
      href="/subscription"
      className={`inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-950/35 px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-rose-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(69,10,10,0.22)] backdrop-blur-md transition duration-200 ease-out hover:border-rose-300/40 hover:bg-rose-900/45 active:scale-[0.98] ${className}`}
      aria-label="Статус подписки Reset+"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-300/90 shadow-[0_0_8px_rgba(251,113,133,0.65)]" />
      {label}
      {chip && isTrial ? (
        <span className="normal-case tracking-normal text-rose-200/70">· trial</span>
      ) : null}
    </Link>
  );
}
