import { billingLog } from "@/lib/billing/log";

const DEFAULT_LAVA_API_BASE = "https://api.lava.ru/business/";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LavaEnvValidation =
  | {
      ok: true;
      apiKey: string;
      shopId: string;
      apiBase: string;
    }
  | {
      ok: false;
      error: string;
      details: Record<string, unknown>;
    };

/**
 * Validates Lava Business API env (lava.ru). Does not log secrets.
 */
export function validateLavaBusinessEnv(): LavaEnvValidation {
  const apiKey = process.env.LAVA_API_KEY?.trim() ?? "";
  const shopId = process.env.LAVA_SHOP_ID?.trim() ?? "";
  const apiBase = (process.env.LAVA_API_BASE_URL ?? DEFAULT_LAVA_API_BASE).replace(/\/?$/, "/");

  const details: Record<string, unknown> = {
    hasApiKey: Boolean(apiKey),
    hasShopId: Boolean(shopId),
    apiBaseHost: safeHost(apiBase),
    shopIdPrefix: shopId ? shopId.slice(0, 8) : null,
  };

  if (!apiKey) {
    billingLog("lava_env_invalid", { reason: "missing_api_key", ...details }, "error");
    return {
      ok: false,
      error: "LAVA_API_KEY is not set (Business API secret from lava.ru cabinet)",
      details,
    };
  }

  if (!shopId) {
    billingLog("lava_env_invalid", { reason: "missing_shop_id", ...details }, "error");
    return {
      ok: false,
      error: "LAVA_SHOP_ID is not set (project UUID from lava.ru Business cabinet)",
      details,
    };
  }

  if (!UUID_RE.test(shopId)) {
    billingLog("lava_env_invalid", { reason: "shop_id_not_uuid", ...details }, "error");
    return {
      ok: false,
      error:
        "LAVA_SHOP_ID must be a UUID from lava.ru Business API (not lava.top / not legacy wallet id)",
      details: { ...details, shopIdLength: shopId.length },
    };
  }

  if (/lava\.top/i.test(apiBase)) {
    billingLog("lava_env_invalid", { reason: "lava_top_base_url", ...details }, "error");
    return {
      ok: false,
      error: "LAVA_API_BASE_URL must point to lava.ru Business API (https://api.lava.ru/business/)",
      details,
    };
  }

  if (!/api\.lava\.ru/i.test(apiBase)) {
    billingLog("lava_env_warning", { reason: "unexpected_api_base", ...details }, "warn");
  }

  billingLog("lava_env_ok", details);
  return { ok: true, apiKey, shopId, apiBase };
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
