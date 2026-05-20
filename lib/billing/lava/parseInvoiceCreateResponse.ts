import { billingLog } from "@/lib/billing/log";

/** Production hosted checkout (Business API). */
export const LAVA_PAY_INVOICE_URL_PREFIX = "https://pay.lava.ru/invoice/";

export type LavaInvoiceCreateRaw = Record<string, unknown>;

export type ResolvedLavaCheckout = {
  invoiceId: string;
  checkoutUrl: string;
  resolvedFrom: string;
  amountRub: number | null;
  invoiceStatus: unknown;
  statusCheck: boolean | null;
  apiStatus: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickErrorMessage(json: LavaInvoiceCreateRaw, fallback: string): string {
  return pickString(json.error, json.message) ?? fallback;
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

function isPayLavaHost(hostname: string): boolean {
  return hostname === "pay.lava.ru" || hostname.endsWith(".pay.lava.ru");
}

/**
 * Prefer API-provided hosted URL; fall back to canonical pay.lava.ru link from invoice id.
 */
export function buildCanonicalPayUrl(invoiceId: string): string {
  return `${LAVA_PAY_INVOICE_URL_PREFIX}${encodeURIComponent(invoiceId)}`;
}

function resolveUrlFromPayload(json: LavaInvoiceCreateRaw): {
  url: string | null;
  resolvedFrom: string | null;
} {
  const data = asRecord(json.data);

  const fromData = pickString(
    data?.url,
    data?.payment_url,
    data?.paymentUrl,
    data?.invoice_url,
    data?.invoiceUrl,
    data?.hosted_url,
    data?.hostedUrl,
    data?.link,
  );

  if (fromData && isHttpsUrl(fromData)) {
    const host = new URL(fromData).hostname;
    const field = data?.url === fromData ? "data.url" : "data.*_url";
    return {
      url: fromData,
      resolvedFrom: isPayLavaHost(host) ? field : `${field}(non-pay-host)`,
    };
  }

  const top = pickString(
    json.url,
    json.payment_url,
    json.paymentUrl,
    json.invoice_url,
    json.invoiceUrl,
    json.hosted_url,
    json.hostedUrl,
  );

  if (top && isHttpsUrl(top)) {
    return { url: top, resolvedFrom: "top_level_url" };
  }

  return { url: null, resolvedFrom: null };
}

function resolveInvoiceId(json: LavaInvoiceCreateRaw): string | null {
  const data = asRecord(json.data);
  return pickString(data?.id, data?.invoice_id, data?.invoiceId, json.invoice_id, json.invoiceId);
}

/**
 * Parses Lava Business API `invoice/create` JSON and resolves production checkout URL.
 */
export function parseLavaInvoiceCreateResponse(input: {
  orderId: string;
  httpStatus: number;
  json: LavaInvoiceCreateRaw;
  fallbackAmountRub: number;
}):
  | { ok: true; result: ResolvedLavaCheckout; rawForLog: LavaInvoiceCreateRaw }
  | { ok: false; error: string; details: Record<string, unknown>; rawForLog: LavaInvoiceCreateRaw } {
  const { orderId, httpStatus, json, fallbackAmountRub } = input;

  billingLog("checkout_response_raw", {
    orderId,
    httpStatus,
    raw: json,
  });

  const statusCheck =
    typeof json.status_check === "boolean"
      ? json.status_check
      : typeof json.statusCheck === "boolean"
        ? json.statusCheck
        : null;

  const apiStatus = json.status ?? null;
  const data = asRecord(json.data);
  const invoiceStatus = data?.status ?? data?.invoice_status ?? data?.invoiceStatus ?? null;

  if (statusCheck === false) {
    return {
      ok: false,
      error: pickErrorMessage(json, "Lava rejected invoice (status_check=false)"),
      details: { orderId, statusCheck, apiStatus, invoiceStatus },
      rawForLog: json,
    };
  }

  if (!httpStatus || httpStatus < 200 || httpStatus >= 300) {
    return {
      ok: false,
      error: pickErrorMessage(json, `Lava API HTTP ${httpStatus}`),
      details: { orderId, httpStatus, statusCheck, apiStatus },
      rawForLog: json,
    };
  }

  const invoiceId = resolveInvoiceId(json);
  if (!invoiceId) {
    return {
      ok: false,
      error: "Lava response missing invoice id (data.id / invoice_id)",
      details: {
        orderId,
        statusCheck,
        apiStatus,
        keys: Object.keys(json),
        dataKeys: data ? Object.keys(data) : [],
      },
      rawForLog: json,
    };
  }

  let { url: checkoutUrl, resolvedFrom } = resolveUrlFromPayload(json);

  if (!checkoutUrl || !isHttpsUrl(checkoutUrl)) {
    checkoutUrl = buildCanonicalPayUrl(invoiceId);
    resolvedFrom = "canonical_pay_lava_ru";
    billingLog("checkout_url_fallback_canonical", { orderId, invoiceId, resolvedFrom });
  } else if (!isPayLavaHost(new URL(checkoutUrl).hostname)) {
    billingLog(
      "checkout_url_non_pay_host",
      { orderId, invoiceId, resolvedFrom, host: new URL(checkoutUrl).hostname },
      "warn",
    );
  }

  const amountRaw = data?.amount ?? data?.sum ?? json.amount;
  const amountRub =
    typeof amountRaw === "number" && Number.isFinite(amountRaw) ? amountRaw : fallbackAmountRub;

  return {
    ok: true,
    result: {
      invoiceId,
      checkoutUrl,
      resolvedFrom: resolvedFrom ?? "unknown",
      amountRub,
      invoiceStatus,
      statusCheck,
      apiStatus,
    },
    rawForLog: json,
  };
}
