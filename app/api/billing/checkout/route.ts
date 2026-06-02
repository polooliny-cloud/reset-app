import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import { billingLog } from "@/lib/billing/log";
import { PLAN_AMOUNTS_RUB, type PaidPlanId } from "@/lib/billing/planPrices";
import { createYookassaPayment, planAmountKopecks } from "@/lib/billing/yookassa/client";
import { validateYookassaEnv } from "@/lib/billing/yookassa/env";
import { isYookassaPlan } from "@/lib/billing/yookassa/types";
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

function buildReturnUrl(baseReturnUrl: string, orderId: string): string {
  const url = new URL(baseReturnUrl);
  url.searchParams.set("order_id", orderId);
  return url.toString();
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
          "Пробный период активируется через POST /api/billing/trial/start (без ЮKassa).",
      },
      { status: 400 },
    );
  }

  if (!isYookassaPlan(rawPlan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan: PaidPlanId = rawPlan;

  const yookassaEnv = validateYookassaEnv();
  if (!yookassaEnv.ok) {
    billingLog("checkout_yookassa_env_invalid", { userId, details: yookassaEnv.details }, "error");
    return NextResponse.json(
      { error: yookassaEnv.error, code: "yookassa_env_invalid", details: yookassaEnv.details },
      { status: 503 },
    );
  }

  const origin = getAppOrigin(request);
  const orderId = `reset_${userId}_${plan}_${Date.now()}`;
  const returnUrl = buildReturnUrl(
    yookassaEnv.returnUrl ?? `${origin}/subscription/success`,
    orderId,
  );

  billingLog("checkout_start", {
    userId,
    plan,
    orderId,
    returnUrl,
    provider: "yookassa",
    yookassaApiHost: new URL(yookassaEnv.apiBase).host,
    shopIdPrefix: yookassaEnv.shopId.slice(0, 8),
  });

  const payment = await createYookassaPayment({
    shopId: yookassaEnv.shopId,
    secretKey: yookassaEnv.secretKey,
    apiBase: yookassaEnv.apiBase,
    orderId,
    plan,
    userId,
    returnUrl,
  });

  if (!payment.ok) {
    billingLog(
      "checkout_yookassa_failed",
      { userId, plan, orderId, error: payment.error, details: payment.details },
      "error",
    );
    return NextResponse.json(
      {
        error: "Не удалось создать оплату. Попробуйте ещё раз.",
        code: "yookassa_payment_failed",
      },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  const amountKopecks = planAmountKopecks(plan);

  const { data: inserted, error: insertError } = await admin
    .from("payments")
    .insert({
      user_id: userId,
      provider: "yookassa",
      provider_invoice_id: payment.paymentId,
      amount: amountKopecks,
      currency: "RUB",
      status: "pending",
      metadata: {
        plan,
        orderId,
        order_id: orderId,
        userId,
        user_id: userId,
        yookassa_payment_id: payment.paymentId,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    billingLog(
      "checkout_pending_payment_insert_failed",
      { userId, paymentId: payment.paymentId, error: insertError.message },
      "error",
    );
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  billingLog("checkout_pending_payment_inserted", {
    userId,
    plan,
    orderId,
    yookassaPaymentId: payment.paymentId,
    dbPaymentId: inserted.id,
    amountKopecks,
  });

  billingLog("checkout_ready", {
    userId,
    plan,
    orderId,
    yookassaPaymentId: payment.paymentId,
  });

  return NextResponse.json({
    ok: true,
    confirmation_url: payment.confirmationUrl,
    payment_id: payment.paymentId,
    order_id: orderId,
    plan,
    amount: amountKopecks,
    currency: "RUB",
    return_url: returnUrl,
    sum_rub: PLAN_AMOUNTS_RUB[plan],
  });
}
