"use client";

import { useState } from "react";

import { usePremium } from "@/app/components/PremiumProvider";
import { supabase } from "@/lib/supabase";

type Props = {
  onTrialStarted?: () => void;
};

export function PaywallScreen({ onTrialStarted }: Props) {
  const { canStartTrial, refetch, loading } = usePremium();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartTrial() {
    setBusy(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Нужна авторизация");
        return;
      }

      const res = await fetch("/api/billing/trial/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = (await res.json()) as { error?: string; ok?: boolean };

      if (!res.ok) {
        setError(data.error ?? "Не удалось активировать пробный период");
        return;
      }

      await refetch();
      onTrialStarted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="surface-card w-full max-w-md px-6 py-8 text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-white/70">Reset Premium</p>
        <h1 className="text-title mt-4 text-2xl font-semibold text-white">
          Откройте полный доступ
        </h1>
        <p className="text-body text-measure mt-3 text-sm text-[#9A9AA0]">
          Прогресс, задания и SOS доступны с активной подпиской или пробным периодом 3 дня.
        </p>

        {error ? (
          <p className="mt-4 text-sm text-[#FFB6BD]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {canStartTrial ? (
            <button
              type="button"
              onClick={() => void handleStartTrial()}
              disabled={busy || loading}
              className="primary-cta"
            >
              {busy ? "Активация…" : "Попробовать 3 дня бесплатно"}
            </button>
          ) : null}
          <p className="text-xs text-[#8C8C92]">
            Оплата через Lava. Статус обновляется автоматически после webhook.
          </p>
        </div>
        </div>
    </main>
  );
}
