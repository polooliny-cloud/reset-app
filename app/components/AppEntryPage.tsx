"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDevNavBypass } from "@/app/hooks/useDevNavBypass";
import { useAuth } from "@/lib/auth/useAuth";

import HomePageClient from "../HomePageClient";

function EntryLoading() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

/** Root route: onboarding for guests, home for authenticated users or localhost dev bypass. */
export function AppEntryPage() {
  const { session, initializing } = useAuth();
  const devBypass = useDevNavBypass();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    if (!session?.user && !devBypass) {
      router.replace("/onboarding");
    }
  }, [devBypass, initializing, router, session?.user]);

  if (initializing) {
    return <EntryLoading />;
  }

  if (!session?.user && !devBypass) {
    return <EntryLoading />;
  }

  return <HomePageClient />;
}
