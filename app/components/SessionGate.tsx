"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { Session } from "@supabase/supabase-js";

import { AuthEmailScreen } from "./AuthEmailScreen";

import { supabase } from "@/lib/supabase";

type GatePhase = "loading" | "ready";

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
  const [phase, setPhase] = useState<GatePhase>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setPhase("ready");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (phase === "loading") {
    return <SessionLoading />;
  }

  if (!session?.user) {
    return <AuthEmailScreen />;
  }

  return <>{children}</>;
}
