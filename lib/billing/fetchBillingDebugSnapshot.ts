import { fetchPremiumStateForUser } from "@/lib/billing/fetchPremiumData";
import { getLastWebhookTrace, getWebhookTrace } from "@/lib/billing/devWebhookTrace";
import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchBillingDebugSnapshot(userId: string) {
  const admin = createAdminClient();

  const [profileRes, paymentsRes, subscriptionRes, premiumState] = await Promise.all([
    admin
      .from("profiles")
      .select("premium_until, trial_started_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("payments")
      .select("id, provider_invoice_id, amount, currency, status, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("subscriptions")
      .select("id, plan, status, started_at, expires_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    fetchPremiumStateForUser(admin, userId),
  ]);

  return {
    premiumState,
    profile: profileRes.data,
    profileError: profileRes.error?.message ?? null,
    payments: paymentsRes.data ?? [],
    paymentsError: paymentsRes.error?.message ?? null,
    subscriptions: subscriptionRes.data ?? [],
    subscriptionsError: subscriptionRes.error?.message ?? null,
    lastWebhook: getLastWebhookTrace(),
    webhookHistory: getWebhookTrace(10),
    checkedAt: new Date().toISOString(),
  };
}
