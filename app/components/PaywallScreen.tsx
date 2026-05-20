"use client";

import { useState } from "react";

import { usePremium } from "@/app/components/PremiumProvider";
import { PLAN_AMOUNTS_RUB } from "@/lib/billing/lava/createCheckout";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { supabase } from "@/lib/supabase";

type Props = {
  onTrialStarted?: () => void;
};

function formatRubPrice(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

const PLANS: { id: LavaCheckoutPlan; label: string; price: string }[] = [
  { id: "monthly", label: "Месяц", price: formatRubPrice(PLAN_AMOUNTS_RUB.monthly) },
  { id: "yearly", label: "Год", price: formatRubPrice(PLAN_AMOUNTS_RUB.yearly) },
];

export function PaywallScreen({ onTrialStarted }: Props) {
  const { canStartTrial, refetch, loading } = usePremium();
  const [busy, setBusy] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<LavaCheckoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleStartTrial() {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Нужна авторизация");
        return;
      }

      const res = await fetch("/api/billing/trial/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  async function handleCheckout(plan: LavaCheckoutPlan) {
    setCheckoutPlan(plan);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Нужна авторизация");
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = (await res.json()) as {
        error?: string;
        checkout_url?: string;
      };

      if (!res.ok || !data.checkout_url) {
        setError(data.error ?? "Не удалось создать оплату");
        return;
      }

      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setCheckoutPlan(null);
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
              {busy && !checkoutPlan ? "Активация…" : "Попробовать 3 дня бесплатно"}
            </button>
          ) : null}

          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void handleCheckout(p.id)}
              disabled={busy || loading || checkoutPlan !== null}
              className="selection-card w-full px-4 py-3 text-sm font-semibold text-white"
            >
              {checkoutPlan === p.id ? "Переход к оплате…" : `${p.label} — ${p.price}`}
            </button>
          ))}

          <p className="text-xs text-[#8C8C92]">
            Оплата через Lava. Статус обновляется автоматически после оплаты.
          </p>
        </div>
      </div>
    </main>
  );
}
