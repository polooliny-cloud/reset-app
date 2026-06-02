"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Session, User } from "@supabase/supabase-js";

import { clearStaleAuthUiState } from "@/lib/auth/clearStaleAuthUiState";
import { migrateLegacyLocalStorageSession } from "@/lib/auth/migrateLegacySession";
import {
  mapOtpError,
  mapVerifyOtpError,
  OTP_MESSAGES,
} from "@/lib/auth/mapOtpError";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthOtpIntent = "register" | "login";

export type SignInWithOtpResult = {
  ok: boolean;
  error: string | null;
  treatAsSuccess?: boolean;
  cooldownSeconds?: number;
};

export type VerifyOtpResult = {
  ok: boolean;
  error: string | null;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until initial session hydration from persistent storage completes. */
  initializing: boolean;
  signInWithOtp: (
    email: string,
    intent: AuthOtpIntent,
    options?: { emailAlreadySent?: boolean },
  ) => Promise<SignInWithOtpResult>;
  verifyOtpCode: (email: string, code: string) => Promise<VerifyOtpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

const INIT_FALLBACK_MS = 4_000;

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const initDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const finishInitializing = (nextSession: Session | null) => {
      if (!mounted || initDoneRef.current) return;
      initDoneRef.current = true;
      setSession(nextSession);
      setInitializing(false);

      if (!nextSession?.user) {
        clearStaleAuthUiState();
      }
    };

    void (async () => {
      await migrateLegacyLocalStorageSession(supabase);
      if (!mounted) return;

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!mounted) return;

        console.log("[auth] auth state changed", event, nextSession?.user?.id ?? "no-user");

        setSession(nextSession);

        if (event === "INITIAL_SESSION") {
          finishInitializing(nextSession);
          return;
        }

        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          initDoneRef.current = true;
          setInitializing(false);

          clearStaleAuthUiState();
        }
      });

      subscription = sub;
    })();

    const fallbackTimer = window.setTimeout(() => {
      if (!mounted || initDoneRef.current) return;

      void supabase.auth.getSession().then(({ data: { session: restored }, error }) => {
        if (!mounted || initDoneRef.current) return;

        if (error) {
          console.error("[auth] getSession fallback failed", error.message, error);
        }

        finishInitializing(restored);
      });
    }, INIT_FALLBACK_MS);

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const signInWithOtpCb = useCallback(
    async (
      email: string,
      intent: AuthOtpIntent,
      options?: { emailAlreadySent?: boolean },
    ): Promise<SignInWithOtpResult> => {
      const trimmed = email.trim();
      if (!trimmed) {
        return { ok: false, error: OTP_MESSAGES.emptyEmail };
      }

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            shouldCreateUser: intent === "register",
          },
        });

        if (error) {
          const mapped = mapOtpError(error, {
            emailAlreadySent: options?.emailAlreadySent ?? false,
          });
          return {
            ok: mapped.treatAsSuccess,
            error: mapped.treatAsSuccess ? null : mapped.message,
            treatAsSuccess: mapped.treatAsSuccess,
            cooldownSeconds: mapped.cooldownSeconds,
          };
        }

        return { ok: true, error: null };
      } catch {
        return { ok: false, error: OTP_MESSAGES.network };
      }
    },
    [supabase],
  );

  const verifyOtpCodeCb = useCallback(
    async (email: string, code: string): Promise<VerifyOtpResult> => {
      const trimmedEmail = email.trim();
      const token = code.replace(/\D/g, "");

      if (!trimmedEmail) {
        return { ok: false, error: OTP_MESSAGES.emptyEmail };
      }

      if (token.length < 6) {
        return { ok: false, error: OTP_MESSAGES.incompleteCode };
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token,
          type: "email",
        });

        if (error || !data.session?.user) {
          return { ok: false, error: mapVerifyOtpError(error).message };
        }

        clearStaleAuthUiState();
        setSession(data.session);
        setInitializing(false);
        initDoneRef.current = true;
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: OTP_MESSAGES.network };
      }
    },
    [supabase],
  );

  const signOutCb = useCallback(async () => {
    console.log("[auth] signOut requested");
    clearStaleAuthUiState();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[auth] signOut failed", error.message, error);
    }
  }, [supabase]);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      initializing,
      signInWithOtp: signInWithOtpCb,
      verifyOtpCode: verifyOtpCodeCb,
      signOut: signOutCb,
    }),
    [session, user, initializing, signInWithOtpCb, verifyOtpCodeCb, signOutCb],
  );

  if (initializing) {
    return <AuthLoadingScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
