import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import { billingLog } from "@/lib/billing/log";
import {
  createLavaCheckoutInvoice,
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

  let body: { plan?: LavaCheckoutPlan };
  try {
    body = (await request.json()) as { plan?: LavaCheckoutPlan };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const plan = body.plan ?? "monthly";
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
    return NextResponse.json({ error: lava.error }, { status: 502 });
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

  return NextResponse.json({
    ok: true,
    checkout_url: lava.checkoutUrl,
    invoice_id: lava.invoiceId,
    order_id: orderId,
    plan,
    amount: amountKopecks,
    currency: "RUB",
  });
}
