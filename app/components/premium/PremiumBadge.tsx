"use client";

import { usePremium } from "@/app/components/PremiumProvider";
import { getPremiumChipLabel } from "@/lib/premium/presentation";

export function PremiumBadge() {
  const premium = usePremium();
  const label = getPremiumChipLabel(premium);

  if (!label) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-violet-300/30 bg-violet-500/12 px-2.5 py-0.5 text-[0.6875rem] font-medium text-violet-100">
      {label}
    </span>
  );
}
