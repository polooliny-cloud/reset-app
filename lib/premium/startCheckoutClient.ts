import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";

import { getBillingAccessToken } from "./billingAuth";

export type CheckoutClientDebug = {
  resolved_from?: string;
  statusCheck?: boolean | null;
  apiStatus?: unknown;
  invoiceStatus?: unknown;
  httpStatus?: number;
  successUrl?: string;
  failUrl?: string;
  hookUrl?: string;
  shopId?: string;
  sumRub?: number;
};

export type StartCheckoutClientResult =
  | {
      ok: true;
      checkoutUrl: string;
      invoiceId?: string;
      orderId?: string;
      resolvedFrom?: string;
      debug?: CheckoutClientDebug;
    }
  | { ok: false; error: string; details?: Record<string, unknown> | null };

/** Paid subscription checkout via Lava — not used for free trial. */
export async function startCheckoutClient(
  plan: LavaCheckoutPlan,
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
    checkout_url?: string;
    invoice_id?: string;
    order_id?: string;
    resolved_from?: string;
    checkout_debug?: CheckoutClientDebug;
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

  const checkoutUrl = data.checkout_url?.trim();
  if (!checkoutUrl) {
    return {
      ok: false,
      error: "Сервер не вернул checkout_url",
      details: data.details ?? { code: data.code, invoice_id: data.invoice_id },
    };
  }

  try {
    const parsed = new URL(checkoutUrl);
    if (parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Некорректный checkout URL (требуется HTTPS)",
        details: { checkout_url: checkoutUrl },
      };
    }
  } catch {
    return {
      ok: false,
      error: "Некорректный checkout URL",
      details: { checkout_url: checkoutUrl },
    };
  }

  return {
    ok: true,
    checkoutUrl,
    invoiceId: data.invoice_id,
    orderId: data.order_id,
    resolvedFrom: data.resolved_from,
    debug: data.checkout_debug,
  };
}
