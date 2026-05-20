"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PremiumGate } from "@/app/components/PremiumGate";

const EXEMPT_PATHS = ["/onboarding", "/settings"];

export function PremiumGatedApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enforce = !EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  return <PremiumGate enforce={enforce}>{children}</PremiumGate>;
}
