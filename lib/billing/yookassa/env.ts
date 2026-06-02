import { billingLog } from "@/lib/billing/log";

const DEFAULT_YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

export type YookassaEnvValidation =
  | {
      ok: true;
      shopId: string;
      secretKey: string;
      apiBase: string;
      returnUrl: string | null;
      webhookSecret: string;
    }
  | {
      ok: false;
      error: string;
      details: Record<string, unknown>;
    };

function safeHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function validateYookassaEnv(): YookassaEnvValidation {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim() ?? "";
  const returnUrl = process.env.YOOKASSA_RETURN_URL?.trim() || null;
  const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim() ?? "";
  const apiBase = DEFAULT_YOOKASSA_API_BASE;

  const details: Record<string, unknown> = {
    hasShopId: Boolean(shopId),
    hasSecretKey: Boolean(secretKey),
    hasWebhookSecret: Boolean(webhookSecret),
    returnUrlHost: safeHost(returnUrl),
    apiBaseHost: safeHost(apiBase),
  };

  if (!shopId) {
    billingLog("yookassa_env_invalid", { reason: "missing_shop_id", ...details }, "error");
    return { ok: false, error: "YOOKASSA_SHOP_ID is not set", details };
  }

  if (!secretKey) {
    billingLog("yookassa_env_invalid", { reason: "missing_secret_key", ...details }, "error");
    return { ok: false, error: "YOOKASSA_SECRET_KEY is not set", details };
  }

  if (!webhookSecret) {
    billingLog("yookassa_env_invalid", { reason: "missing_webhook_secret", ...details }, "error");
    return { ok: false, error: "YOOKASSA_WEBHOOK_SECRET is not set", details };
  }

  if (!safeHost(apiBase)?.endsWith("yookassa.ru")) {
    billingLog("yookassa_env_warning", { reason: "unexpected_api_base", ...details }, "warn");
  }

  billingLog("yookassa_env_ok", details);
  return { ok: true, shopId, secretKey, apiBase, returnUrl, webhookSecret };
}
