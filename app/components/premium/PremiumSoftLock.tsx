"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { usePremium } from "@/app/components/PremiumProvider";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  locked?: boolean;
  layout?: "default" | "compact";
  className?: string;
};

export function PremiumSoftLock({
  children,
  title = "Доступно в Reset+",
  description = "Откройте подписку или продлите пробный период, чтобы использовать эту функцию.",
  locked,
  layout = "default",
  className = "",
}: Props) {
  const { isPremium, loading } = usePremium();
  const isLocked = locked ?? (!loading && !isPremium);
  const isCompact = layout === "compact";
  const showTitle = Boolean(title?.trim());

  if (!isLocked) {
    return <>{children}</>;
  }

  const roundedClass = isCompact ? "rounded-3xl" : "rounded-[1.25rem]";

  return (
    <div className={`relative overflow-hidden ${roundedClass} ${className}`.trim()}>
      <div className="pointer-events-none select-none blur-[6px] brightness-[0.72]">{children}</div>
      <div
        className={`absolute inset-0 flex flex-col items-center bg-[#090d14]/55 text-center backdrop-blur-[2px] ${
          isCompact
            ? "justify-start gap-1 px-3 pb-2 pt-2.5"
            : "justify-center gap-3 px-5 py-4"
        }`}
      >
        {showTitle ? (
          <p
            className={
              isCompact
                ? "w-full text-[11px] font-semibold leading-tight text-white"
                : "text-sm font-semibold text-white"
            }
          >
            {title}
          </p>
        ) : null}
        <p
          className={
            isCompact
              ? "text-measure w-full text-[10px] leading-snug text-[#B5B5BA]"
              : "text-measure max-w-[16rem] text-xs leading-relaxed text-[#B5B5BA]"
          }
        >
          {description}
        </p>
        <Link
          href="/subscription"
          className={
            isCompact
              ? "mt-0 shrink-0 rounded-full border border-rose-300/40 bg-rose-950/65 px-3 py-1.5 text-[10px] font-semibold leading-none text-rose-50 shadow-[0_4px_12px_rgba(69,10,10,0.35)] transition duration-200 ease-out hover:bg-rose-900/70"
              : "mt-1 shrink-0 rounded-full border border-rose-300/35 bg-rose-950/50 px-4 py-2 text-xs font-semibold text-rose-50 transition duration-200 ease-out hover:bg-rose-900/60"
          }
        >
          Открыть Reset+
        </Link>
      </div>
    </div>
  );
}
