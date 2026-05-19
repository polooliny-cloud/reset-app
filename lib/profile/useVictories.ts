"use client";

import { useCallback, useEffect, useState } from "react";

import type { VictoryTrigger } from "@/lib/profile/grantVictory";
import { useAuth } from "@/lib/auth/useAuth";
import { supabase } from "@/lib/supabase";

export type VictoryEvent = {
  id: string;
  user_id: string;
  trigger: VictoryTrigger;
  xp: number;
  created_at: string;
};

export function useVictories() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [events, setEvents] = useState<VictoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("victories")
      .select("id, user_id, trigger, xp, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setEvents((data ?? []) as VictoryEvent[]);
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    events,
    loading,
    error,
    refetch,
  };
}
