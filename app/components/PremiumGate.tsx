"use client";

import type { ReactNode } from "react";

/** App-first: never blocks the app with a fullscreen paywall. */
export function PremiumGate({ children }: { children: ReactNode; enforce?: boolean }) {
  return <>{children}</>;
}
