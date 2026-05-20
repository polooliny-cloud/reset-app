import { billingLog, sanitizeLavaInvoicePayload } from "@/lib/billing/log";
import { PLAN_AMOUNTS_RUB as PLAN_AMOUNTS_RUB_BASE } from "@/lib/billing/planPrices";
import { signLavaRequestBody } from "@/lib/billing/lava/signRequest";
import {
  parseLavaInvoiceCreateResponse,
  type LavaInvoiceCreateRaw,
} from "@/lib/billing/lava/parseInvoiceCreateResponse";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";

const DEFAULT_LAVA_API_BASE = "https://api.lava.ru/business/";
const LAVA_FETCH_TIMEOUT_MS = 15_000;

/** Plan prices in rubles (Lava `sum` field). */
export const PLAN_AMOUNTS_RUB: Record<LavaCheckoutPlan, number> = PLAN_AMOUNTS_RUB_BASE;

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
      resolvedFrom: string;
      lavaDebug: {
        statusCheck: boolean | null;
        apiStatus: unknown;
        invoiceStatus: unknown;
        httpStatus: number;
      };
    }
  | { ok: false; error: string; details?: Record<string, unknown> };

/**
 * Creates a Lava invoice via Business API (`POST https://api.lava.ru/business/invoice/create`).
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
    endpoint: "invoice/create",
    payload: sanitizeLavaInvoicePayload(body),
  });

  const rawBody = JSON.stringify(body);
  const signature = signLavaRequestBody(rawBody, input.apiKey);
  const base = (process.env.LAVA_API_BASE_URL ?? DEFAULT_LAVA_API_BASE).replace(/\/?$/, "/");
  const endpointUrl = `${base}invoice/create`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LAVA_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
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
    billingLog("lava_invoice_network_error", { orderId: input.orderId, message, endpointUrl }, "error");
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let json: LavaInvoiceCreateRaw = {};
  try {
    json = responseText ? (JSON.parse(responseText) as LavaInvoiceCreateRaw) : {};
  } catch {
    billingLog(
      "checkout_response_raw",
      {
        orderId: input.orderId,
        httpStatus: response.status,
        parseError: true,
        rawTextPreview: responseText.slice(0, 500),
      },
      "error",
    );
    return {
      ok: false,
      error: "Lava returned non-JSON response",
      details: { httpStatus: response.status, preview: responseText.slice(0, 200) },
    };
  }

  const parsed = parseLavaInvoiceCreateResponse({
    orderId: input.orderId,
    httpStatus: response.status,
    json,
    fallbackAmountRub: sum,
  });

  if (!parsed.ok) {
    billingLog(
      "lava_invoice_failed",
      { orderId: input.orderId, error: parsed.error, details: parsed.details },
      "error",
    );
    return { ok: false, error: parsed.error, details: parsed.details };
  }

  const { result } = parsed;

  billingLog("lava_invoice_success", {
    orderId: input.orderId,
    httpStatus: response.status,
    invoiceId: result.invoiceId,
    checkoutUrl: result.checkoutUrl,
    resolvedFrom: result.resolvedFrom,
    statusCheck: result.statusCheck,
    apiStatus: result.apiStatus,
    invoiceStatus: result.invoiceStatus,
    amountRub: result.amountRub,
  });

  return {
    ok: true,
    invoiceId: result.invoiceId,
    orderId: input.orderId,
    checkoutUrl: result.checkoutUrl,
    amountRub: result.amountRub ?? sum,
    resolvedFrom: result.resolvedFrom,
    lavaDebug: {
      statusCheck: result.statusCheck,
      apiStatus: result.apiStatus,
      invoiceStatus: result.invoiceStatus,
      httpStatus: response.status,
    },
  };
}
