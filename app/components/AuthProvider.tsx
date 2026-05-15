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

import { AUTH_MESSAGES, mapAuthError } from "@/lib/auth/mapAuthError";
import { supabase } from "@/lib/supabase";

export type AuthOtpIntent = "register" | "login";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the first auth state is received from Supabase (incl. restored session). */
  initializing: boolean;
  signInWithOtp: (
    email: string,
    intent: AuthOtpIntent,
  ) => Promise<{ error: string | null; cooldownSeconds?: number }>;
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

  const signInWithOtpCb = useCallback(async (email: string, intent: AuthOtpIntent) => {
    const trimmed = email.trim();
    if (!trimmed) {
      return { error: AUTH_MESSAGES.emptyEmail };
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: intent === "register",
        },
      });

      if (error) {
        const mapped = mapAuthError(error);
        return {
          error: mapped.message,
          cooldownSeconds: mapped.cooldownSeconds,
        };
      }

      return { error: null };
    } catch {
      return { error: AUTH_MESSAGES.network };
    }
  }, []);

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
