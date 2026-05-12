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

import { mapAuthError } from "@/lib/auth/mapAuthError";
import { supabase } from "@/lib/supabase";

export type AuthOtpIntent = "register" | "login";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the first auth state is received from Supabase (incl. restored session). */
  initializing: boolean;
  signInWithOtp: (email: string, intent: AuthOtpIntent) => Promise<{ error: string | null }>;
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtpCb = useCallback(async (email: string, intent: AuthOtpIntent) => {
    const trimmed = email.trim();
    if (!trimmed) {
      return { error: "Введи email." };
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: intent === "register",
      },
    });

    if (error) {
      return { error: mapAuthError(error) };
    }

    return { error: null };
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
