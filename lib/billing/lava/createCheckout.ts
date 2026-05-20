import { billingLog, sanitizeLavaInvoicePayload } from "@/lib/billing/log";
import { signLavaRequestBody } from "@/lib/billing/lava/signRequest";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";

const DEFAULT_LAVA_API_BASE = "https://api.lava.ru/business/";
const LAVA_FETCH_TIMEOUT_MS = 15_000;

/** Plan prices in rubles (Lava `sum` field). */
export const PLAN_AMOUNTS_RUB: Record<LavaCheckoutPlan, number> = {
  monthly: 299,
  yearly: 1990,
};

export function planAmountKopecks(plan: LavaCheckoutPlan): number {
  return Math.round(PLAN_AMOUNTS_RUB[plan] * 100);
}

export type LavaCreateInvoiceResult =
  | {
      ok: true;
      invoiceId: string;
      orderId: string;
      checkoutUrl: string;
      amountRub: number;
    }
  | { ok: false; error: string };

type LavaInvoiceCreateResponse = {
  data?: {
    id?: string;
    url?: string;
    amount?: number;
  };
  status?: number;
  status_check?: boolean;
  error?: string;
  message?: string;
};

/**
 * Creates a Lava invoice via Business API (`POST invoice/create`).
 * Uses LAVA_API_KEY + LAVA_SHOP_ID (server-only).
 */
export async function createLavaCheckoutInvoice(input: {
  shopId: string;
  apiKey: string;
  orderId: string;
  plan: LavaCheckoutPlan;
  userId: string;
  successUrl: string;
  failUrl: string;
  hookUrl?: string;
  comment?: string;
}): Promise<LavaCreateInvoiceResult> {
  const sum = PLAN_AMOUNTS_RUB[input.plan];
  const customFields = JSON.stringify({ user_id: input.userId, plan: input.plan });

  const body: Record<string, string | number> = {
    shopId: input.shopId,
    orderId: input.orderId,
    sum,
    customFields,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
    expire: 300,
    comment: input.comment ?? `Reset Premium — ${input.plan}`,
  };

  if (input.hookUrl) {
    body.hookUrl = input.hookUrl;
  }

  billingLog("lava_invoice_request", {
    orderId: input.orderId,
    plan: input.plan,
    userId: input.userId,
    payload: sanitizeLavaInvoicePayload(body),
  });

  const rawBody = JSON.stringify(body);
  const signature = signLavaRequestBody(rawBody, input.apiKey);
  const base = (process.env.LAVA_API_BASE_URL ?? DEFAULT_LAVA_API_BASE).replace(/\/?$/, "/");
  const url = `${base}invoice/create`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LAVA_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Signature: signature,
      },
      body: rawBody,
      signal: controller.signal,
    });
  } catch (e) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Lava API timeout"
        : e instanceof Error
          ? e.message
          : "Lava API network error";
    billingLog("lava_invoice_network_error", { orderId: input.orderId, message }, "error");
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }

  const json = (await response.json().catch(() => ({}))) as LavaInvoiceCreateResponse;

  billingLog("lava_invoice_response", {
    orderId: input.orderId,
    httpStatus: response.status,
    status: json.status,
    status_check: json.status_check,
    invoiceId: json.data?.id ?? null,
    hasUrl: Boolean(json.data?.url),
    amount: json.data?.amount ?? null,
    error: json.error ?? json.message ?? null,
  });

  if (!response.ok) {
    const message =
      json.error ?? json.message ?? `Lava API error (${response.status})`;
    billingLog("lava_invoice_failed", { orderId: input.orderId, message }, "error");
    return { ok: false, error: message };
  }

  const invoiceId = json.data?.id;
  const checkoutUrl = json.data?.url;

  if (!invoiceId || !checkoutUrl) {
    billingLog("lava_invoice_invalid_response", { orderId: input.orderId }, "error");
    return { ok: false, error: "Invalid Lava invoice response" };
  }

  return {
    ok: true,
    invoiceId,
    orderId: input.orderId,
    checkoutUrl,
    amountRub: json.data?.amount ?? sum,
  };
}
