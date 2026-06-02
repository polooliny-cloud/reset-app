"use client";

import { useDevNavBypass } from "@/app/hooks/useDevNavBypass";
import { useAuth } from "@/lib/auth/useAuth";

import HomePageClient from "../HomePageClient";
import { LandingPage } from "./LandingPage";

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

/** Root route: landing for guests, home for authenticated users or localhost dev bypass. */
export function AppEntryPage() {
  const { session, initializing } = useAuth();
  const devBypass = useDevNavBypass();

  if (initializing) {
    return <EntryLoading />;
  }

  if (!session?.user && !devBypass) {
    return <LandingPage />;
  }

  return <HomePageClient />;
}
