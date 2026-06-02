import { NextResponse } from "next/server";

import { billingLog } from "@/lib/billing/log";
import { validateYookassaEnv } from "@/lib/billing/yookassa/env";
import { handleYookassaWebhook } from "@/lib/billing/yookassa/handleWebhook";
import type { YookassaWebhookPayload } from "@/lib/billing/yookassa/types";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitStore = globalThis as typeof globalThis & {
  __yookassaWebhookRateLimit?: Map<string, { count: number; resetAt: number }>;
};

function getRateLimitMap() {
  rateLimitStore.__yookassaWebhookRateLimit ??= new Map();
  return rateLimitStore.__yookassaWebhookRateLimit;
}

function getClientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function isRateLimited(request: Request): boolean {
  const key = getClientKey(request);
  const now = Date.now();
  const store = getRateLimitMap();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function getWebhookSecretFromRequest(request: Request): string {
  return new URL(request.url).searchParams.get("secret") ?? "";
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    billingLog("yookassa_webhook_rate_limited", {}, "warn");
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const env = validateYookassaEnv();
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 503 });
  }

  const providedSecret = getWebhookSecretFromRequest(request);
  if (!providedSecret || !timingSafeEqualString(providedSecret, env.webhookSecret)) {
    billingLog("yookassa_webhook_secret_invalid", { hasSecret: Boolean(providedSecret) }, "warn");
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let payload: YookassaWebhookPayload;
  try {
    payload = (await request.json()) as YookassaWebhookPayload;
  } catch {
    billingLog("yookassa_webhook_invalid_json", {}, "error");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await handleYookassaWebhook(payload, env);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate ?? false,
    ignored: result.ignored ?? false,
  });
}
