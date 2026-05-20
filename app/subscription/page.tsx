"use client";

import Link from "next/link";
import { useState } from "react";

import { CheckoutRedirectDebug } from "@/app/components/CheckoutRedirectDebug";
import { usePremium } from "@/app/components/PremiumProvider";
import { isCheckoutRedirectDebugEnabled } from "@/lib/billing/lava/isCheckoutDebug";
import { PLAN_AMOUNTS_RUB } from "@/lib/billing/planPrices";
import { startCheckoutClient } from "@/lib/premium/startCheckoutClient";
import { startFreeTrialClient } from "@/lib/premium/startFreeTrialClient";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { getPremiumHeaderCopy, getPremiumStatusKind } from "@/lib/premium/presentation";

function formatRubPrice(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

const BENEFITS = [
  { icon: "✦", title: "AI-поддержка", text: "Персональные подсказки в моменты риска" },
  { icon: "◎", title: "SOS recovery tools", text: "Таймер и сценарии восстановления" },
  { icon: "↗", title: "История прогресса", text: "Победы, XP и динамика дисциплины" },
  { icon: "◇", title: "Система уровней", text: "Уровни навыка и награды за streak" },
  { icon: "★", title: "Premium функции", text: "Задания, миссии и расширенная аналитика" },
] as const;

const PLANS: { id: LavaCheckoutPlan; label: string; price: string; badge?: string }[] = [
  { id: "monthly", label: "Месяц", price: formatRubPrice(PLAN_AMOUNTS_RUB.monthly) },
  { id: "yearly", label: "Год", price: formatRubPrice(PLAN_AMOUNTS_RUB.yearly), badge: "Лучшее предложение" },
];

export default function SubscriptionPage() {
  const premium = usePremium();
  const { refetch, applyPremiumState, loading, canStartTrial } = premium;
  const header = getPremiumHeaderCopy(premium);
  const statusKind = getPremiumStatusKind(premium);

  const [selectedPlan, setSelectedPlan] = useState<LavaCheckoutPlan>("yearly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    checkoutUrl: string;
    invoiceId?: string;
    orderId?: string;
    resolvedFrom?: string;
    debug?: Record<string, unknown>;
  } | null>(null);

  const topInset = "calc(8px + env(safe-area-inset-top))";

  function redirectToCheckout(url: string) {
    window.location.href = url;
  }

  async function handleSubscribe() {
    setBusy("checkout");
    setError(null);
    setMessage(null);
    setPendingCheckout(null);

    const result = await startCheckoutClient(selectedPlan);
    if (!result.ok) {
      const details =
        result.details && typeof result.details === "object"
          ? ` (${JSON.stringify(result.details)})`
          : "";
      setError(`${result.error}${details}`);
      setBusy(null);
      return;
    }

    if (isCheckoutRedirectDebugEnabled()) {
      setPendingCheckout({
        checkoutUrl: result.checkoutUrl,
        invoiceId: result.invoiceId,
        orderId: result.orderId,
        resolvedFrom: result.resolvedFrom,
        debug: result.debug as Record<string, unknown> | undefined,
      });
      setBusy(null);
      return;
    }

    redirectToCheckout(result.checkoutUrl);
  }

  async function handleStartTrial() {
    setBusy("trial");
    setError(null);
    const result = await startFreeTrialClient();
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applyPremiumState(result.state);
    setMessage("Пробный период активирован на 3 дня. Списание не произойдёт автоматически.");
  }

  async function handleRestore() {
    setBusy("restore");
    setError(null);
    setMessage(null);
    await refetch();
    setBusy(null);
    setMessage("Статус подписки обновлён. Если оплата была недавно, подождите минуту и повторите.");
  }

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 pb-10 pt-5 sm:px-6">
      {pendingCheckout ? (
        <CheckoutRedirectDebug
          checkoutUrl={pendingCheckout.checkoutUrl}
          invoiceId={pendingCheckout.invoiceId}
          orderId={pendingCheckout.orderId}
          resolvedFrom={pendingCheckout.resolvedFrom}
          lavaDebug={pendingCheckout.debug}
          onContinue={() => redirectToCheckout(pendingCheckout.checkoutUrl)}
          onCancel={() => setPendingCheckout(null)}
        />
      ) : null}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(244,63,94,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-md flex-1 pb-8 pt-12">
        <Link
          href="/"
          aria-label="Назад"
          className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
          style={{ top: topInset }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <p className="text-center text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-rose-200/80">
          Reset+
        </p>
        <h1 className="text-flow-heading mt-2 text-center text-2xl font-semibold text-white">
          Подписка
        </h1>

        <section className="surface-card mt-6 overflow-hidden p-5">
          <div
            className={`rounded-2xl border px-4 py-4 ${
              statusKind === "trial"
                ? "border-violet-300/25 bg-violet-500/10"
                : statusKind === "premium"
                  ? "border-emerald-300/20 bg-emerald-500/8"
                  : "border-slate-300/15 bg-slate-900/50"
            }`}
          >
            <p className="text-base font-semibold text-white">{loading ? "Загрузка…" : header.title}</p>
            {!loading && statusKind !== "none" ? (
              <p className="text-measure mt-1.5 text-sm text-[#A8A8AE]">{header.subtitle}</p>
            ) : null}
            {!loading && statusKind === "none" ? (
              <p className="text-measure mt-1.5 text-sm text-[#A8A8AE]">
                Активируйте пробный период или оформите подписку, чтобы открыть Reset+.
              </p>
            ) : null}
            {statusKind === "trial" ? (
              <p className="mt-3 text-xs text-violet-200/80">
                Списание не произойдёт автоматически. После trial вы сможете оформить подписку вручную.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="px-1 text-sm font-medium text-[#9A9AA0]">Что входит</h2>
          <div className="mt-3 grid gap-2.5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-3 rounded-2xl border border-slate-300/12 bg-slate-900/45 px-4 py-3.5 backdrop-blur-sm"
              >
                <span className="mt-0.5 text-sm text-rose-200/90" aria-hidden>
                  {b.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{b.title}</p>
                  <p className="text-measure mt-0.5 text-xs text-[#9A9AA0]">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {statusKind !== "trial" ? (
          <section className="mt-8">
            <h2 className="px-1 text-sm font-medium text-[#9A9AA0]">Тарифы</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative w-full rounded-2xl border px-4 py-4 text-left transition duration-200 ease-out ${
                      selected
                        ? "border-violet-300/45 bg-violet-500/12 shadow-[0_0_0_1px_rgba(167,139,250,0.2)]"
                        : "border-slate-300/15 bg-slate-900/50 hover:border-slate-300/25"
                    }`}
                  >
                    {plan.badge ? (
                      <span className="absolute right-3 top-3 rounded-full bg-rose-500/20 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-rose-100">
                        {plan.badge}
                      </span>
                    ) : null}
                    <p className="text-sm font-semibold text-white">{plan.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-white">{plan.price}</p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {error ? (
          <p className="mt-4 text-center text-sm text-[#FFB6BD]" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 text-center text-sm text-violet-200/90" role="status">
            {message}
          </p>
        ) : null}

        <section className="mt-8 flex flex-col gap-2.5">
          {statusKind === "none" && canStartTrial ? (
            <button
              type="button"
              onClick={() => void handleStartTrial()}
              disabled={busy !== null || loading}
              className="w-full rounded-2xl border border-violet-300/30 bg-violet-500/15 py-3.5 text-sm font-semibold text-violet-50 transition duration-200 ease-out hover:bg-violet-500/22 disabled:opacity-60"
            >
              {busy === "trial" ? "Активация…" : "Начать 3 дня бесплатно"}
            </button>
          ) : null}

          {statusKind !== "premium" ? (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={busy !== null || loading}
              className="primary-cta"
            >
              {busy === "checkout" ? "Переход к оплате…" : "Оформить подписку"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void handleRestore()}
            disabled={busy !== null || loading}
            className="w-full rounded-2xl border border-slate-300/15 bg-slate-900/40 py-3 text-sm font-medium text-[#D4D4D8] transition duration-200 ease-out hover:bg-slate-800/50 disabled:opacity-60"
          >
            {busy === "restore" ? "Проверка…" : "Восстановить покупку"}
          </button>

          <p className="text-center text-xs text-[#8C8C92]">
            Управление подпиской: оплата через Lava. Отмена и продление — в личном кабинете платёжного
            сервиса после оформления.
          </p>
        </section>

        <footer className="mt-10 border-t border-white/8 pt-6">
          <nav className="flex flex-col items-center gap-3 text-sm">
            <Link href="/privacy" className="text-[#9A9AA0] underline underline-offset-4 hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[#9A9AA0] underline underline-offset-4 hover:text-white">
              Terms of Service
            </Link>
            <Link
              href="/subscription-terms"
              className="text-[#9A9AA0] underline underline-offset-4 hover:text-white"
            >
              Subscription Terms
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
