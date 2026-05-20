import type { SupabaseClient } from "@supabase/supabase-js";

import type { SubscriptionPlan } from "@/lib/billing/types";
import { PLAN_DURATION_DAYS } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export function resolvePremiumUntil(plan: SubscriptionPlan, from = new Date()): string | null {
  if (plan === "lifetime") return null;
  if (plan === "free_trial") return addDaysIso(from, 3);
  const days = PLAN_DURATION_DAYS[plan as keyof typeof PLAN_DURATION_DAYS];
  return days ? addDaysIso(from, days) : addDaysIso(from, 30);
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = resolvePremiumUntil(input.plan, now);
  const premiumUntil =
    input.plan === "lifetime"
      ? addDaysIso(now, 36500)
      : (expiresAt ?? addDaysIso(now, 30));

  const { data: existingPayment } = await admin
    .from("payments")
    .select("id")
    .eq("provider", "lava")
    .eq("provider_invoice_id", input.providerInvoiceId)
    .maybeSingle();

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
    console.error("[billing] payment upsert failed", paymentError.message);
    return { ok: false, error: paymentError.message };
  }

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
    console.error("[billing] subscription insert failed", subError.message);
    return { ok: false, error: subError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      premium_until: premiumUntil,
      updated_at: nowIso,
    })
    .eq("id", input.userId);

  if (profileError) {
    console.error("[billing] profile premium update failed", profileError.message);
    return { ok: false, error: profileError.message };
  }

  console.log("[billing] subscription activated", {
    userId: input.userId,
    plan: input.plan,
    premiumUntil,
    expiresAt,
  });
  console.log("[premium] access granted", input.userId);

  return { ok: true };
}
