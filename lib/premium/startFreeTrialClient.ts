import type { PremiumState } from "@/lib/billing/types";

import { getBillingAccessToken } from "./billingAuth";

const TRIAL_START_PATH = "/api/billing/trial/start";

export type StartFreeTrialClientResult =
  | { ok: true; state: PremiumState; premiumUntil: string }
  | { ok: false; error: string; code?: string };

/**
 * Activates the 3-day free trial via Supabase only.
 * MUST NOT call Lava, checkout, payments, or webhooks.
 */
export async function startFreeTrialClient(): Promise<StartFreeTrialClientResult> {
  const token = await getBillingAccessToken();
  if (!token) {
    return { ok: false, error: "Нужна авторизация" };
  }

  console.log("[trial] client request_started", { path: TRIAL_START_PATH });

  const res = await fetch(TRIAL_START_PATH, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as {
    error?: string;
    code?: string;
    state?: PremiumState;
    premiumUntil?: string;
  };

  if (!res.ok) {
    console.error("[trial] client failed", { status: res.status, code: data.code, error: data.error });
    return {
      ok: false,
      error: data.error ?? "Не удалось активировать пробный период",
      code: data.code,
    };
  }

  if (!data.state) {
    return { ok: false, error: "Некорректный ответ сервера (нет state)" };
  }

  console.log("[trial] client premium_activated", {
    premiumUntil: data.premiumUntil ?? data.state.premiumUntil,
  });

  return {
    ok: true,
    state: data.state,
    premiumUntil: data.premiumUntil ?? data.state.premiumUntil ?? "",
  };
}
