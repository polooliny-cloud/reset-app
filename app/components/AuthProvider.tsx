"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Session, User } from "@supabase/supabase-js";

import { mapOtpError, OTP_MESSAGES } from "@/lib/auth/mapOtpError";
import { supabase } from "@/lib/supabase";

export type AuthOtpIntent = "register" | "login";

export type SignInWithOtpResult = {
  ok: boolean;
  error: string | null;
  /** Rate limit after a prior send — UI stays in success state. */
  treatAsSuccess?: boolean;
  cooldownSeconds?: number;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the first auth state is received from Supabase (incl. restored session). */
  initializing: boolean;
  signInWithOtp: (
    email: string,
    intent: AuthOtpIntent,
    options?: { emailAlreadySent?: boolean },
  ) => Promise<SignInWithOtpResult>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return;
      setSession(initialSession);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
            emailRedirectTo: "https://resetapp.ru/onboarding",
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
    [],
  );

  const signOutCb = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      initializing,
      signInWithOtp: signInWithOtpCb,
      signOut: signOutCb,
    }),
    [session, user, initializing, signInWithOtpCb, signOutCb],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
