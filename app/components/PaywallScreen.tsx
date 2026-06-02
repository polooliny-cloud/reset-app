"use client";

import { useState } from "react";

import { PaymentRedirectSheet } from "@/app/components/PaymentRedirectSheet";
import { usePremium } from "@/app/components/PremiumProvider";
import { PLAN_AMOUNTS_RUB, type PaidPlanId } from "@/lib/billing/planPrices";
import { startFreeTrialClient } from "@/lib/premium/startFreeTrialClient";
import { startCheckoutClient } from "@/lib/premium/startCheckoutClient";

type Props = {
  onTrialStarted?: () => void;
};

function formatRubPrice(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

const PLANS: { id: PaidPlanId; label: string; price: string }[] = [
  { id: "monthly", label: "Месяц", price: formatRubPrice(PLAN_AMOUNTS_RUB.monthly) },
  { id: "yearly", label: "Год", price: formatRubPrice(PLAN_AMOUNTS_RUB.yearly) },
];

export function PaywallScreen({ onTrialStarted }: Props) {
  const { canStartTrial, refetch, loading } = usePremium();
  const [busy, setBusy] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    confirmationUrl: string;
    paymentId?: string;
    orderId?: string;
  } | null>(null);

  async function handleStartTrial() {
    setBusy(true);
    setError(null);
    try {
      const result = await startFreeTrialClient();
      if (!result.ok) {
        setError(result.error);
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

  async function handleCheckout(plan: PaidPlanId) {
    setCheckoutPlan(plan);
    setError(null);
    setPendingCheckout(null);
    try {
      const result = await startCheckoutClient(plan);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingCheckout({
        confirmationUrl: result.confirmationUrl,
        paymentId: result.paymentId,
        orderId: result.orderId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setCheckoutPlan(null);
    }
  }

  return (
    <main className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      {pendingCheckout ? (
        <PaymentRedirectSheet
          confirmationUrl={pendingCheckout.confirmationUrl}
          paymentId={pendingCheckout.paymentId}
          orderId={pendingCheckout.orderId}
          onContinue={() => {
            window.location.assign(pendingCheckout.confirmationUrl);
          }}
          onCancel={() => setPendingCheckout(null)}
        />
      ) : null}
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
            Оплата через ЮKassa. Premium активируется автоматически после подтверждения платежа.
          </p>
        </div>
      </div>
    </main>
  );
}
