import { activatePaidSubscription } from "@/lib/billing/activateSubscription";
import { billingLog } from "@/lib/billing/log";
import { markPaymentFailedByInvoice } from "@/lib/billing/markPaymentFailed";
import { PLAN_AMOUNTS_RUB } from "@/lib/billing/planPrices";
import { formatRubAmount, planAmountKopecks, getYookassaPayment } from "@/lib/billing/yookassa/client";
import { isYookassaPlan, type YookassaCheckoutPlan, type YookassaWebhookPayload } from "@/lib/billing/yookassa/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type HandleYookassaWebhookResult = {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  ignored?: boolean;
  userId?: string;
  plan?: YookassaCheckoutPlan;
  paymentId?: string;
};

function amountToKopecksStrict(value: string | undefined): number | null {
  const match = value?.match(/^(\d+)\.(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2]);
}

function readMetadata(payment: { metadata?: Record<string, unknown> }): {
  userId?: string;
  plan?: YookassaCheckoutPlan;
  orderId?: string;
} {
  const metadata = payment.metadata ?? {};
  const userId = typeof metadata.user_id === "string" ? metadata.user_id : undefined;
  const orderId = typeof metadata.order_id === "string" ? metadata.order_id : undefined;
  const plan = isYookassaPlan(metadata.plan) ? metadata.plan : undefined;
  return { userId, plan, orderId };
}

function readDbMetadata(metadata: Record<string, unknown> | null): {
  userId?: string;
  plan?: YookassaCheckoutPlan;
  orderId?: string;
} {
  const userId =
    typeof metadata?.user_id === "string"
      ? metadata.user_id
      : typeof metadata?.userId === "string"
        ? metadata.userId
        : undefined;
  const orderId =
    typeof metadata?.order_id === "string"
      ? metadata.order_id
      : typeof metadata?.orderId === "string"
        ? metadata.orderId
        : undefined;
  const plan = isYookassaPlan(metadata?.plan) ? metadata.plan : undefined;
  return { userId, plan, orderId };
}

export async function handleYookassaWebhook(
  payload: YookassaWebhookPayload,
  env: {
    apiBase: string;
    shopId: string;
    secretKey: string;
  },
): Promise<HandleYookassaWebhookResult> {
  const event = payload.event ?? "";
  const webhookPayment = payload.object;
  const paymentId = webhookPayment?.id;

  if (!paymentId) {
    billingLog("yookassa_webhook_invalid_payload", { event }, "error");
    return { ok: false, error: "Invalid webhook payload" };
  }

  if (event !== "payment.succeeded" && event !== "payment.canceled") {
    billingLog("yookassa_webhook_ignored", { event, paymentId });
    return { ok: true, ignored: true, paymentId };
  }

  const fetched = await getYookassaPayment({
    apiBase: env.apiBase,
    shopId: env.shopId,
    secretKey: env.secretKey,
    paymentId,
  });

  if (!fetched.ok) {
    billingLog(
      "yookassa_payment_verify_failed",
      { paymentId, error: fetched.error, details: fetched.details },
      "error",
    );
    return { ok: false, error: fetched.error };
  }

  const payment = fetched.payment;
  const { userId, plan, orderId } = readMetadata(payment);

  if (!userId || !plan) {
    billingLog("yookassa_webhook_missing_metadata", { paymentId, event }, "error");
    return { ok: false, error: "Missing payment metadata" };
  }

  const amountKopecks = amountToKopecksStrict(payment.amount?.value);
  const expectedAmount = planAmountKopecks(plan);
  const expectedAmountValue = formatRubAmount(PLAN_AMOUNTS_RUB[plan]);
  const currency = payment.amount?.currency ?? "RUB";

  if (
    currency !== "RUB" ||
    payment.amount?.value !== expectedAmountValue ||
    amountKopecks !== expectedAmount
  ) {
    billingLog(
      "yookassa_webhook_amount_mismatch",
      { paymentId, userId, plan, amountKopecks, expectedAmount, currency },
      "error",
    );
    return { ok: false, error: "Payment amount mismatch" };
  }

  const admin = createAdminClient();
  const { data: dbPayment, error: dbPaymentError } = await admin
    .from("payments")
    .select("id, user_id, provider, status, amount, currency, metadata")
    .eq("provider", "yookassa")
    .eq("provider_invoice_id", paymentId)
    .maybeSingle();

  if (dbPaymentError) {
    billingLog("yookassa_payment_db_lookup_failed", { paymentId, error: dbPaymentError.message }, "error");
    return { ok: false, error: "Payment lookup failed" };
  }

  if (!dbPayment) {
    billingLog("yookassa_payment_db_missing", { paymentId }, "error");
    return { ok: false, error: "Payment record missing" };
  }

  if (dbPayment.provider !== "yookassa") {
    billingLog("yookassa_payment_provider_mismatch", { paymentId }, "error");
    return { ok: false, error: "Payment provider mismatch" };
  }

  if (dbPayment.status === "paid") {
    billingLog("yookassa_duplicate_ignored", { paymentId, userId, plan });
    return { ok: true, duplicate: true, userId, plan, paymentId };
  }

  if (dbPayment.status !== "pending") {
    billingLog("yookassa_payment_not_pending", { paymentId, status: dbPayment.status }, "warn");
    return { ok: true, ignored: true, userId, plan, paymentId };
  }

  const dbMetadata = readDbMetadata(dbPayment.metadata);
  if (
    dbPayment.user_id !== userId ||
    dbPayment.amount !== expectedAmount ||
    dbPayment.currency !== "RUB" ||
    dbMetadata.userId !== userId ||
    dbMetadata.plan !== plan
  ) {
    billingLog("yookassa_payment_db_validation_failed", {
      paymentId,
      status: dbPayment.status,
      amount: dbPayment.amount,
      expectedAmount,
      currency: dbPayment.currency,
    }, "error");
    return { ok: false, error: "Payment record validation failed" };
  }

  if (event === "payment.canceled" || payment.status === "canceled") {
    await markPaymentFailedByInvoice(
      admin,
      paymentId,
      {
        event,
        status: payment.status,
        order_id: orderId,
      orderId,
        plan,
        user_id: userId,
      userId,
      },
      "yookassa",
    );
    billingLog("yookassa_payment_canceled", { paymentId, userId, plan, orderId });
    return { ok: true, ignored: true, userId, plan, paymentId };
  }

  if (event !== "payment.succeeded" || payment.status !== "succeeded" || payment.paid !== true) {
    billingLog("yookassa_webhook_not_paid", { paymentId, event, status: payment.status, paid: payment.paid });
    return { ok: true, ignored: true, userId, plan, paymentId };
  }

  const result = await activatePaidSubscription(admin, {
    userId,
    plan,
    provider: "yookassa",
    providerInvoiceId: paymentId,
    amount: amountKopecks,
    currency,
    metadata: {
      event,
      status: payment.status,
      order_id: orderId,
      orderId,
      plan,
      user_id: userId,
      userId,
      yookassa_payment_id: paymentId,
    },
  });

  if (!result.ok) {
    billingLog("yookassa_activation_failed", { paymentId, userId, plan, error: result.error }, "error");
    return { ok: false, error: result.error, userId, plan, paymentId };
  }

  if (result.duplicate) {
    billingLog("yookassa_duplicate_ignored", { paymentId, userId, plan });
    return { ok: true, duplicate: true, userId, plan, paymentId };
  }

  billingLog("yookassa_activation_success", { paymentId, userId, plan });
  return { ok: true, userId, plan, paymentId };
}
