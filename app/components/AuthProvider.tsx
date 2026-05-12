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
import { ensureProfileForUser } from "@/lib/profile/ensureProfile";
import { supabase } from "@/lib/supabase";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the first auth state is received from Supabase (incl. restored session). */
  initializing: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
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

  const signInWithPasswordCb = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      return { error: "Введи email и пароль." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (error) {
      return { error: mapAuthError(error) };
    }

    return { error: null };
  }, []);

  const signUpCb = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      return { error: "Введи email и пароль.", needsEmailConfirmation: false };
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { error: mapAuthError(error), needsEmailConfirmation: false };
    }

    if (data.session && data.user) {
      const profile = await ensureProfileForUser(supabase, data.user);
      if (!profile.ok) {
        return { error: profile.error, needsEmailConfirmation: false };
      }
    }

    const needsEmailConfirmation = Boolean(data.user) && !data.session;
    return { error: null, needsEmailConfirmation };
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
      signInWithPassword: signInWithPasswordCb,
      signUp: signUpCb,
      signOut: signOutCb,
    }),
    [session, user, initializing, signInWithPasswordCb, signUpCb, signOutCb],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
