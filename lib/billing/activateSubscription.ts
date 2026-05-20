import type { SupabaseClient } from "@supabase/supabase-js";

import { billingLog } from "@/lib/billing/log";
import type { SubscriptionPlan } from "@/lib/billing/types";
import { PLAN_DURATION_DAYS } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export function resolvePremiumUntil(plan: SubscriptionPlan, from = new Date()): string | null {
  if (plan === "free_trial") return addDaysIso(from, 3);
  const days = PLAN_DURATION_DAYS[plan];
  return addDaysIso(from, days);
}

export async function activatePaidSubscription(
  admin: SupabaseClient<Database>,
  input: {
    userId: string;
    plan: Exclude<SubscriptionPlan, "free_trial">;
    providerInvoiceId: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string }> {
  const { data: existingPayment } = await admin
    .from("payments")
    .select("id, status")
    .eq("provider", "lava")
    .eq("provider_invoice_id", input.providerInvoiceId)
    .maybeSingle();

  if (existingPayment?.status === "paid") {
    billingLog("payment_duplicate", {
      userId: input.userId,
      providerInvoiceId: input.providerInvoiceId,
    });
    return { ok: true, duplicate: true };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const premiumUntil = resolvePremiumUntil(input.plan, now) ?? addDaysIso(now, 30);
  const expiresAt = premiumUntil;

  const paymentPayload = {
    user_id: input.userId,
    provider: "lava" as const,
    provider_invoice_id: input.providerInvoiceId,
    amount: input.amount,
    currency: input.currency,
    status: "paid" as const,
    metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["payments"]["Insert"]["metadata"],
  };

  const { error: paymentError } = existingPayment
    ? await admin.from("payments").update(paymentPayload).eq("id", existingPayment.id)
    : await admin.from("payments").insert(paymentPayload);

  if (paymentError) {
    billingLog("payment_upsert_failed", { error: paymentError.message }, "error");
    return { ok: false, error: paymentError.message };
  }

  billingLog("payment_upsert_ok", {
    userId: input.userId,
    providerInvoiceId: input.providerInvoiceId,
    status: "paid",
  });

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: input.userId,
    provider: "lava",
    plan: input.plan,
    status: "active",
    started_at: nowIso,
    expires_at: expiresAt,
    updated_at: nowIso,
  });

  if (subError) {
    billingLog("subscription_insert_failed", { error: subError.message }, "error");
    return { ok: false, error: subError.message };
  }

  billingLog("subscription_insert_ok", {
    userId: input.userId,
    plan: input.plan,
    expiresAt,
  });

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      premium_until: premiumUntil,
      updated_at: nowIso,
    })
    .eq("id", input.userId);

  if (profileError) {
    billingLog("profile_premium_update_failed", { error: profileError.message }, "error");
    return { ok: false, error: profileError.message };
  }

  billingLog("premium_activated", {
    userId: input.userId,
    plan: input.plan,
    premiumUntil,
    providerInvoiceId: input.providerInvoiceId,
  });

  return { ok: true };
}
