import type { PaidPlanId } from "@/lib/billing/planPrices";

import { getBillingAccessToken } from "./billingAuth";

export type CheckoutClientDebug = {
  sumRub?: number;
  returnUrl?: string;
};

export type StartCheckoutClientResult =
  | {
      ok: true;
      confirmationUrl: string;
      paymentId?: string;
      orderId?: string;
      debug?: CheckoutClientDebug;
    }
  | { ok: false; error: string; details?: Record<string, unknown> | null };

/** Paid subscription checkout via YooKassa — not used for free trial. */
export async function startCheckoutClient(
  plan: PaidPlanId,
): Promise<StartCheckoutClientResult> {
  const token = await getBillingAccessToken();
  if (!token) return { ok: false, error: "Нужна авторизация" };

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
    code?: string;
    details?: Record<string, unknown> | null;
    confirmation_url?: string;
    payment_id?: string;
    order_id?: string;
    return_url?: string;
    sum_rub?: number;
  };

  if (!res.ok) {
    const detailMsg =
      data.details && typeof data.details === "object"
        ? JSON.stringify(data.details)
        : "";
    return {
      ok: false,
      error: data.error ?? `Не удалось создать оплату (HTTP ${res.status})`,
      details: data.details ?? (detailMsg ? { message: detailMsg } : null),
    };
  }

  const confirmationUrl = data.confirmation_url?.trim();
  if (!confirmationUrl) {
    return {
      ok: false,
      error: "Сервер не вернул confirmation_url",
      details: data.details ?? { code: data.code, payment_id: data.payment_id },
    };
  }

  try {
    const parsed = new URL(confirmationUrl);
    if (parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Некорректный confirmation URL (требуется HTTPS)",
        details: { confirmation_url: confirmationUrl },
      };
    }
  } catch {
    return {
      ok: false,
      error: "Некорректный confirmation URL",
      details: { confirmation_url: confirmationUrl },
    };
  }

  return {
    ok: true,
    confirmationUrl,
    paymentId: data.payment_id,
    orderId: data.order_id,
    debug: { returnUrl: data.return_url, sumRub: data.sum_rub },
  };
}
