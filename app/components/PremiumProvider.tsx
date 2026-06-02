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

import { fetchPremiumStateForUser } from "@/lib/billing/fetchPremiumData";
import type { PremiumState } from "@/lib/billing/types";
import { useAuth } from "@/lib/auth/useAuth";
import { isDevNavBypassActive } from "@/lib/dev/localNav";
import { consumeTrialActivationPending } from "@/lib/premium/trialActivationPending";
import { supabase } from "@/lib/supabase";

export type PremiumContextValue = PremiumState & {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<PremiumState | null>;
  /** Apply server-returned state without waiting for another fetch (onboarding trial). */
  applyPremiumState: (next: PremiumState) => void;
};

const defaultState: PremiumContextValue = {
  isPremium: false,
  isTrial: false,
  premiumUntil: null,
  subscriptionStatus: null,
  trialEndsAt: null,
  canStartTrial: false,
  loading: true,
  error: null,
  refetch: async () => null,
  applyPremiumState: () => {},
};

const PremiumContext = createContext<PremiumContextValue>(defaultState);

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used within PremiumProvider");
  }
  return ctx;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user, initializing: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    isTrial: false,
    premiumUntil: null,
    subscriptionStatus: null,
    trialEndsAt: null,
    canStartTrial: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPremiumState = useCallback((next: PremiumState) => {
    setState(next);
    setError(null);
    setLoading(false);
    console.log("[billing] premium state applied from server", next);
  }, []);

  const refetch = useCallback(async (): Promise<PremiumState | null> => {
    if (!userId) {
      const empty = {
        isPremium: false,
        isTrial: false,
        premiumUntil: null,
        subscriptionStatus: null,
        trialEndsAt: null,
        canStartTrial: false,
      };
      setState(empty);
      setLoading(false);
      return empty;
    }

    if (isDevNavBypassActive()) {
      console.log("[premium] dev bypass active, treat as premium");
      const devState = {
        isPremium: true,
        isTrial: false,
        premiumUntil: null,
        subscriptionStatus: null,
        trialEndsAt: null,
        canStartTrial: false,
      };
      setState(devState);
      setError(null);
      setLoading(false);
      return devState;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await fetchPremiumStateForUser(supabase, userId);
      setState(next);
      console.log("[billing] premium state loaded", userId, next);
      return next;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить подписку";
      console.error("[billing] premium load failed", message);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (consumeTrialActivationPending()) {
      setLoading(true);
    }
    void refetch();
  }, [authLoading, refetch]);

  useEffect(() => {
    if (!userId) return;

    const onFocus = () => {
      void refetch();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, refetch]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`premium:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          console.log("[billing] profiles change, refetch premium");
          void refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("[billing] subscriptions change, refetch premium");
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      ...state,
      loading: authLoading || loading,
      error,
      refetch,
      applyPremiumState,
    }),
    [state, authLoading, loading, error, refetch, applyPremiumState],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
