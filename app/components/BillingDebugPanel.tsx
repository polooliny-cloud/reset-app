"use client";

import { useCallback, useEffect, useState } from "react";

import { usePremium } from "@/app/components/PremiumProvider";
import { isLocalhostHost } from "@/lib/dev/localNav";
import { supabase } from "@/lib/supabase";

type Snapshot = {
  premiumState?: {
    isPremium: boolean;
    isTrial: boolean;
    premiumUntil: string | null;
    canStartTrial: boolean;
  };
  profile?: {
    premium_until: string | null;
    trial_started_at: string | null;
  } | null;
  payments?: Array<{
    id: string;
    provider_invoice_id: string;
    status: string;
    amount: number;
    created_at: string;
  }>;
  subscriptions?: Array<{
    id: string;
    plan: string;
    status: string;
    expires_at: string | null;
  }>;
  lastWebhook?: unknown;
  checkedAt?: string;
};

export function BillingDebugPanel() {
  const { refetch } = usePremium();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setError("Нужна авторизация");
      return;
    }

    const res = await fetch("/api/dev/billing/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as Snapshot & { error?: string };
    if (!res.ok) {
      setError(data.error ?? `HTTP ${res.status}`);
      setSnapshot(null);
      return;
    }
    setError(null);
    setSnapshot(data);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  async function mockSuccess(plan: "monthly" | "yearly") {
    setBusy(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Нужна авторизация");
        return;
      }

      const res = await fetch("/api/dev/billing/mock-success", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { error?: string; snapshot?: Snapshot };
      if (!res.ok) {
        setError(data.error ?? "Mock failed");
        return;
      }
      setSnapshot(data.snapshot ?? null);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mock failed");
    } finally {
      setBusy(false);
    }
  }

  const [devVisible, setDevVisible] = useState(process.env.NODE_ENV === "development");

  useEffect(() => {
    setDevVisible(process.env.NODE_ENV === "development" || isLocalhostHost());
  }, []);

  if (!devVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex max-w-[min(100vw-1.5rem,22rem)] flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-amber-500/50 bg-amber-950/90 px-2.5 py-1.5 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur-sm"
      >
        {open ? "Скрыть billing" : "Billing debug"}
      </button>

      {open ? (
        <div className="max-h-[70vh] w-full overflow-y-auto rounded-xl border border-amber-500/30 bg-[#0c1018]/95 p-3 text-left text-[11px] text-amber-50/90 shadow-2xl backdrop-blur-md">
          <p className="font-semibold text-amber-200">Billing verification (dev)</p>
          <p className="mt-1 text-[10px] text-amber-100/60">
            Source of truth: Supabase only. Mock runs real webhook handler.
          </p>

          {error ? (
            <p className="mt-2 text-rose-300" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void load()}
              className="rounded border border-amber-400/30 px-2 py-1 hover:bg-amber-900/40"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void mockSuccess("monthly")}
              className="rounded border border-emerald-400/30 px-2 py-1 hover:bg-emerald-900/30"
            >
              Mock paid (мес)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void mockSuccess("yearly")}
              className="rounded border border-emerald-400/30 px-2 py-1 hover:bg-emerald-900/30"
            >
              Mock paid (год)
            </button>
          </div>

          {snapshot ? (
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-slate-200">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-slate-400">Загрузка…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
