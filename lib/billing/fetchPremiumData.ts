import type { SupabaseClient } from "@supabase/supabase-js";

import { getPremiumState } from "@/lib/billing/isPremium";
import type { PremiumState, ProfileBillingRow, SubscriptionRow } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

export async function fetchProfileBilling(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileBillingRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("premium_until, trial_started_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchLatestSubscription(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SubscriptionRow | null;
}

export async function fetchPremiumStateForUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<PremiumState> {
  const [profile, subscription] = await Promise.all([
    fetchProfileBilling(client, userId),
    fetchLatestSubscription(client, userId),
  ]);

  return getPremiumState({ profile, subscription });
}
