"use client";

import type { ReactNode } from "react";

import { PaywallScreen } from "@/app/components/PaywallScreen";
import { usePremium } from "@/app/components/PremiumProvider";
import { useAuth } from "@/lib/auth/useAuth";

function GateSpinner() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

type Props = {
  children: ReactNode;
  /** When false, always render children (e.g. settings). */
  enforce?: boolean;
};

export function PremiumGate({ children, enforce = true }: Props) {
  const { session } = useAuth();
  const { isPremium, loading, refetch } = usePremium();

  if (!enforce) {
    return <>{children}</>;
  }

  if (!session?.user) {
    return <>{children}</>;
  }

  if (loading) {
    return <GateSpinner />;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return <PaywallScreen onTrialStarted={() => void refetch()} />;
}
