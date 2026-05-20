import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import { billingLog } from "@/lib/billing/log";
import {
  createLavaCheckoutInvoice,
  PLAN_AMOUNTS_RUB,
  planAmountKopecks,
} from "@/lib/billing/lava/createCheckout";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getAppOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    billingLog("checkout_unauthorized", {}, "warn");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rawPlan = body.plan ?? "monthly";
  if (rawPlan === "free_trial") {
    billingLog("checkout_rejected_free_trial", { userId }, "warn");
    return NextResponse.json(
      {
        error:
          "Пробный период активируется через POST /api/billing/trial/start (без Lava).",
      },
      { status: 400 },
    );
  }

  const plan = rawPlan as LavaCheckoutPlan;
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const lavaApiKey = process.env.LAVA_API_KEY;
  const lavaShopId = process.env.LAVA_SHOP_ID;

  if (!lavaApiKey || !lavaShopId) {
    billingLog("checkout_lava_not_configured", { userId }, "error");
    return NextResponse.json(
      { error: "Lava is not configured. Set LAVA_API_KEY and LAVA_SHOP_ID." },
      { status: 503 },
    );
  }

  const origin = getAppOrigin(request);
  const orderId = `reset_${userId}_${plan}_${Date.now()}`;
  const hookUrl =
    process.env.LAVA_HOOK_URL ?? `${origin}/api/webhooks/lava`;

  billingLog("checkout_start", { userId, plan, orderId, hookUrl });

  const lava = await createLavaCheckoutInvoice({
    shopId: lavaShopId,
    apiKey: lavaApiKey,
    orderId,
    plan,
    userId,
    successUrl: `${origin}/?billing=success`,
    failUrl: `${origin}/?billing=cancelled`,
    hookUrl,
  });

  if (!lava.ok) {
    billingLog("checkout_lava_failed", { userId, plan, orderId, error: lava.error, details: lava.details }, "error");
    return NextResponse.json(
      {
        error: lava.error,
        code: "lava_invoice_failed",
        details: lava.details ?? null,
      },
      { status: 502 },
    );
  }

  if (!lava.checkoutUrl?.startsWith("https://")) {
    billingLog(
      "checkout_missing_url",
      { userId, orderId, invoiceId: lava.invoiceId, resolvedFrom: lava.resolvedFrom },
      "error",
    );
    return NextResponse.json(
      {
        error: "Lava checkout URL missing or invalid after invoice create",
        code: "checkout_url_missing",
        details: {
          invoiceId: lava.invoiceId,
          resolvedFrom: lava.resolvedFrom,
          hint: "Expected https://pay.lava.ru/invoice/{id} or data.url from Lava",
        },
      },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const amountKopecks = planAmountKopecks(plan);

  const { data: inserted, error: insertError } = await admin
    .from("payments")
    .insert({
      user_id: userId,
      provider: "lava",
      provider_invoice_id: lava.invoiceId,
      amount: amountKopecks,
      currency: "RUB",
      status: "pending",
      metadata: { plan, orderId, userId },
    })
    .select("id")
    .single();

  if (insertError) {
    billingLog(
      "checkout_pending_payment_insert_failed",
      { userId, invoiceId: lava.invoiceId, error: insertError.message },
      "error",
    );
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  billingLog("checkout_pending_payment_inserted", {
    userId,
    plan,
    orderId,
    invoiceId: lava.invoiceId,
    paymentId: inserted.id,
    amountKopecks,
  });

  billingLog("checkout_ready", {
    userId,
    plan,
    orderId,
    invoiceId: lava.invoiceId,
    checkoutUrl: lava.checkoutUrl,
    resolvedFrom: lava.resolvedFrom,
  });

  const showDebug =
    process.env.CHECKOUT_DEBUG_RESPONSE === "1" || process.env.NODE_ENV === "development";

  return NextResponse.json({
    ok: true,
    checkout_url: lava.checkoutUrl,
    invoice_id: lava.invoiceId,
    order_id: orderId,
    plan,
    amount: amountKopecks,
    currency: "RUB",
    resolved_from: lava.resolvedFrom,
    ...(showDebug
      ? {
          checkout_debug: {
            ...lava.lavaDebug,
            successUrl: `${origin}/?billing=success`,
            failUrl: `${origin}/?billing=cancelled`,
            hookUrl,
            shopId: lavaShopId,
            sumRub: PLAN_AMOUNTS_RUB[plan],
          },
        }
      : {}),
  });
}
