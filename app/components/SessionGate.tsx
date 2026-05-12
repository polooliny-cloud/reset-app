"use client";

import type { ReactNode } from "react";

import { AuthScreen } from "./AuthScreen";

import { useAuth } from "@/lib/auth/useAuth";

function SessionLoading() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

export function SessionGate({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();

  if (initializing) {
    return <SessionLoading />;
  }

  if (!session?.user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
