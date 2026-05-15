"use client";

import { useCallback, useEffect, useState } from "react";

import { ensureProfileForUser } from "@/lib/profile/ensureProfile";
import { supabase } from "@/lib/supabase";

type SyncState = "idle" | "loading" | "ready" | "error";

export function ProfileBootstrap() {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runEnsure = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[ProfileBootstrap] getSession failed", sessionError.message, sessionError);
      setErrorMessage(sessionError.message);
      setSyncState("error");
      return;
    }

    if (!session?.user) {
      console.log("[ProfileBootstrap] no session, skip profile ensure");
      setSyncState("ready");
      setErrorMessage(null);
      return;
    }

    console.log("[ProfileBootstrap] ensure profile after getSession", session.user.id);
    setSyncState("loading");
    setErrorMessage(null);

    const result = await ensureProfileForUser(supabase, session.user);

    if (!result.ok) {
      console.error("[ProfileBootstrap] ensureProfile failed", result.error);
      setErrorMessage(result.error);
      setSyncState("error");
      return;
    }

    console.log("[ProfileBootstrap] ensureProfile ok", { created: result.created });
    setSyncState("ready");
  }, []);

  useEffect(() => {
    void runEnsure();
  }, [runEnsure]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[ProfileBootstrap] onAuthStateChange", event, session?.user?.id ?? "no-user");

      if (!session?.user) {
        setSyncState("ready");
        setErrorMessage(null);
        return;
      }

      setSyncState("loading");
      setErrorMessage(null);

      const result = await ensureProfileForUser(supabase, session.user);

      if (!result.ok) {
        console.error("[ProfileBootstrap] ensureProfile failed (auth change)", result.error);
        setErrorMessage(result.error);
        setSyncState("error");
        return;
      }

      console.log("[ProfileBootstrap] ensureProfile ok (auth change)", { created: result.created });
      setSyncState("ready");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {syncState === "loading" ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] overflow-hidden bg-white/5"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="h-full w-full animate-pulse bg-violet-400/75" />
        </div>
      ) : null}

      {syncState === "error" && errorMessage ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[95] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="alert"
        >
          <div className="surface-card flex max-w-md flex-col gap-3 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p className="text-center text-sm text-[#E8E8EC]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void runEnsure()}
              className="selection-card mx-auto min-w-[8rem] py-2.5 text-sm font-semibold text-white"
            >
              Повторить
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
