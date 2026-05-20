import type { SupabaseClient } from "@supabase/supabase-js";

import { trialLog } from "@/lib/billing/trialLog";
import { FREE_TRIAL_DAYS } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

export type StartFreeTrialResult =
  | { ok: true; premiumUntil: string }
  | { ok: false; error: string; code?: "trial_already_used" | "profile_missing" };

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

/**
 * Starts a one-time 3-day trial. Must run with service-role client.
 */
export async function startFreeTrial(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<StartFreeTrialResult> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, trial_started_at, premium_until")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    trialLog("failed", { userId, step: "profile_fetch", error: profileError.message }, "error");
    return { ok: false, error: profileError.message };
  }

  if (!profile) {
    return { ok: false, error: "Profile not found", code: "profile_missing" };
  }

  if (profile.trial_started_at) {
    trialLog("failed", { userId, code: "trial_already_used" }, "warn");
    return { ok: false, error: "Trial already used", code: "trial_already_used" };
  }

  const now = new Date();
  const startedAt = now.toISOString();
  const premiumUntil = addDaysIso(now, FREE_TRIAL_DAYS);
  const expiresAt = premiumUntil;

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      trial_started_at: startedAt,
      premium_until: premiumUntil,
      updated_at: startedAt,
    })
    .eq("id", userId);

  if (profileUpdateError) {
    trialLog("failed", { userId, step: "profile_update", error: profileUpdateError.message }, "error");
    return { ok: false, error: profileUpdateError.message };
  }

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    provider: "internal",
    plan: "free_trial",
    status: "trialing",
    started_at: startedAt,
    expires_at: expiresAt,
    updated_at: startedAt,
  });

  if (subError) {
    trialLog("failed", { userId, step: "subscription_insert", error: subError.message }, "error");
    return { ok: false, error: subError.message };
  }

  trialLog("premium_activated", { userId, premiumUntil, expiresAt });

  return { ok: true, premiumUntil };
}
