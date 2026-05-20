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
import { supabase } from "@/lib/supabase";

export type PremiumContextValue = PremiumState & {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
  refetch: async () => {},
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

  const refetch = useCallback(async () => {
    if (!userId) {
      setState({
        isPremium: false,
        isTrial: false,
        premiumUntil: null,
        subscriptionStatus: null,
        trialEndsAt: null,
        canStartTrial: false,
      });
      setLoading(false);
      return;
    }

    if (isDevNavBypassActive()) {
      console.log("[premium] dev bypass active, treat as premium");
      setState({
        isPremium: true,
        isTrial: false,
        premiumUntil: null,
        subscriptionStatus: null,
        trialEndsAt: null,
        canStartTrial: false,
      });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await fetchPremiumStateForUser(supabase, userId);
      setState(next);
      console.log("[billing] premium state loaded", userId, next);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить подписку";
      console.error("[billing] premium load failed", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
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
    if (!userId || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing !== "success" && billing !== "cancelled") return;

    console.log("[billing] checkout return, refetch premium", billing);
    void refetch().finally(() => {
      params.delete("billing");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", next);
    });
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
    }),
    [state, authLoading, loading, error, refetch],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
