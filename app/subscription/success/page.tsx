"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { usePremium } from "@/app/components/PremiumProvider";
import { getBillingAccessToken } from "@/lib/premium/billingAuth";
import type { PremiumState } from "@/lib/billing/types";

type Status = "checking" | "success" | "waiting" | "processing";

const POLL_INTERVAL_MS = 2_000;
const WAITING_AFTER_MS = 10_000;
const POLLING_TIMEOUT_MS = 60_000;

type PaymentStatusResponse = {
  ok?: boolean;
  payment?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
  } | null;
  premium?: PremiumState;
  error?: string;
};

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const premium = usePremium();
  const { refetch, applyPremiumState } = premium;
  const [status, setStatus] = useState<Status>("checking");
  const [checks, setChecks] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const orderId = searchParams.get("order_id");

  const subtitle = useMemo(() => {
    if (status === "success") {
      return "Reset+ активирован. Можно возвращаться в приложение.";
    }
    if (status === "waiting") {
      return "Платёж принят, ждём подтверждение от ЮKassa. Обычно это занимает несколько секунд.";
    }
    if (status === "processing") {
      return "Оплата обрабатывается. Premium включится автоматически после подтверждения платежа.";
    }
    return "Проверяем оплату и ждём webhook от ЮKassa.";
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;
    const startedAt = Date.now();

    async function checkPayment() {
      const token = await getBillingAccessToken();
      if (!token) {
        const next = await refetch();
        return { paymentStatus: null, premium: next };
      }

      const params = new URLSearchParams();
      if (orderId) params.set("order_id", orderId);

      const res = await fetch(`/api/billing/payment-status?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const next = await refetch();
        return { paymentStatus: null, premium: next };
      }

      const data = (await res.json()) as PaymentStatusResponse;
      if (data.premium) {
        applyPremiumState(data.premium);
      }
      return {
        paymentStatus: data.payment?.status ?? null,
        premium: data.premium ?? null,
      };
    }

    async function checkPremium() {
      const next = await checkPayment();
      if (cancelled) return;

      setChecks((prev) => prev + 1);
      setPaymentStatus(next.paymentStatus);

      if (next.premium?.isPremium) {
        setStatus("success");
        if (intervalId !== null) window.clearInterval(intervalId);
        return;
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed > POLLING_TIMEOUT_MS) {
        setStatus("processing");
        if (intervalId !== null) window.clearInterval(intervalId);
        return;
      }

      if (elapsed > WAITING_AFTER_MS) {
        setStatus("waiting");
      }
    }

    void checkPremium();
    intervalId = window.setInterval(() => {
      void checkPremium();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [applyPremiumState, orderId, refetch]);

  return (
    <main className="app-shell flex min-h-screen flex-col items-center justify-center px-5 py-8">
      <div className="surface-card w-full max-w-md px-5 py-8 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
            status === "success"
              ? "border-emerald-300/25 bg-emerald-500/10"
              : "border-violet-300/20 bg-violet-500/10"
          }`}
        >
          {status === "success" ? (
            <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 text-emerald-200" fill="none">
              <path
                d="M5 12.5l4.2 4.2L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-200/25 border-t-violet-100" />
          )}
        </div>

        <p className="mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
          Reset+
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          {status === "success"
            ? "Premium активирован"
            : status === "processing"
              ? "Оплата обрабатывается"
              : "Проверяем оплату…"}
        </h1>
        <p className="text-measure mt-3 text-sm leading-relaxed text-[#A8A8AE]">{subtitle}</p>

        {orderId ? (
          <p className="mt-4 break-all font-mono text-[11px] text-[#707078]">Order ID: {orderId}</p>
        ) : null}
        {paymentStatus ? (
          <p className="mt-2 text-xs text-[#8C8C92]">Статус платежа: {paymentStatus}</p>
        ) : null}

        {status !== "success" ? (
          <p className="mt-4 text-xs text-[#8C8C92]">Проверка #{Math.max(checks, 1)}</p>
        ) : null}

        <div className="mt-7 flex flex-col gap-2.5">
          <Link href="/" className="primary-cta text-center">
            Вернуться в приложение
          </Link>
          {status !== "success" ? (
            <button
              type="button"
              onClick={() => void refetch()}
              className="w-full rounded-2xl border border-slate-300/15 bg-slate-900/40 py-3 text-sm font-medium text-[#D4D4D8] transition duration-200 ease-out hover:bg-slate-800/50"
            >
              Проверить ещё раз
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300" />
        </main>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
