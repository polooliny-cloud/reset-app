import { randomUUID } from "crypto";

import { billingLog, sanitizeYookassaPaymentPayload } from "@/lib/billing/log";
import { PLAN_AMOUNTS_RUB } from "@/lib/billing/planPrices";
import type {
  YookassaCheckoutPlan,
  YookassaPayment,
} from "@/lib/billing/yookassa/types";

const YOOKASSA_FETCH_TIMEOUT_MS = 15_000;

export function planAmountKopecks(plan: YookassaCheckoutPlan): number {
  return Math.round(PLAN_AMOUNTS_RUB[plan] * 100);
}

export function formatRubAmount(amountRub: number): string {
  return amountRub.toFixed(2);
}

function authHeader(shopId: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

async function fetchYookassa<T>(
  input: {
    apiBase: string;
    shopId: string;
    secretKey: string;
    path: string;
    method: "GET" | "POST";
    idempotenceKey?: string;
    body?: Record<string, unknown>;
  },
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string; details?: unknown }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), YOOKASSA_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${input.apiBase}${input.path}`, {
      method: input.method,
      headers: {
        Accept: "application/json",
        Authorization: authHeader(input.shopId, input.secretKey),
        ...(input.body ? { "Content-Type": "application/json" } : {}),
        ...(input.idempotenceKey ? { "Idempotence-Key": input.idempotenceKey } : {}),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "YooKassa API timeout"
        : e instanceof Error
          ? e.message
          : "YooKassa API network error";
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return {
      ok: false,
      status: response.status,
      error: "YooKassa returned non-JSON response",
      details: text.slice(0, 300),
    };
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data && "description" in data
        ? String((data as { description?: unknown }).description)
        : `YooKassa API error (${response.status})`;
    return { ok: false, status: response.status, error: errorMessage, details: data };
  }

  return { ok: true, status: response.status, data: data as T };
}

export type CreateYookassaPaymentResult =
  | {
      ok: true;
      paymentId: string;
      orderId: string;
      confirmationUrl: string;
      amountKopecks: number;
    }
  | { ok: false; error: string; details?: unknown };

export async function createYookassaPayment(input: {
  apiBase: string;
  shopId: string;
  secretKey: string;
  orderId: string;
  plan: YookassaCheckoutPlan;
  userId: string;
  returnUrl: string;
}): Promise<CreateYookassaPaymentResult> {
  const amountRub = PLAN_AMOUNTS_RUB[input.plan];
  const body = {
    amount: {
      value: formatRubAmount(amountRub),
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: input.returnUrl,
    },
    description: `Reset+ ${input.plan === "yearly" ? "год" : "месяц"}`,
    metadata: {
      user_id: input.userId,
      plan: input.plan,
      order_id: input.orderId,
    },
  };

  billingLog("yookassa_payment_request", {
    orderId: input.orderId,
    plan: input.plan,
    userId: input.userId,
    payload: sanitizeYookassaPaymentPayload(body),
  });

  const result = await fetchYookassa<YookassaPayment>({
    apiBase: input.apiBase,
    shopId: input.shopId,
    secretKey: input.secretKey,
    path: "/payments",
    method: "POST",
    idempotenceKey: input.orderId || randomUUID(),
    body,
  });

  if (!result.ok) {
    billingLog(
      "yookassa_payment_failed",
      { orderId: input.orderId, error: result.error, status: result.status, details: result.details },
      "error",
    );
    return { ok: false, error: result.error, details: result.details };
  }

  const payment = result.data;
  const confirmationUrl = payment.confirmation?.confirmation_url;

  if (!payment.id || !confirmationUrl?.startsWith("https://")) {
    billingLog(
      "yookassa_payment_missing_confirmation",
      { orderId: input.orderId, paymentId: payment.id ?? null, status: payment.status },
      "error",
    );
    return { ok: false, error: "YooKassa confirmation_url missing" };
  }

  billingLog("yookassa_payment_created", {
    orderId: input.orderId,
    paymentId: payment.id,
    status: payment.status,
  });

  return {
    ok: true,
    paymentId: payment.id,
    orderId: input.orderId,
    confirmationUrl,
    amountKopecks: planAmountKopecks(input.plan),
  };
}

export async function getYookassaPayment(input: {
  apiBase: string;
  shopId: string;
  secretKey: string;
  paymentId: string;
}): Promise<{ ok: true; payment: YookassaPayment } | { ok: false; error: string; details?: unknown }> {
  const result = await fetchYookassa<YookassaPayment>({
    apiBase: input.apiBase,
    shopId: input.shopId,
    secretKey: input.secretKey,
    path: `/payments/${encodeURIComponent(input.paymentId)}`,
    method: "GET",
  });

  if (!result.ok) {
    return { ok: false, error: result.error, details: result.details };
  }

  return { ok: true, payment: result.data };
}
