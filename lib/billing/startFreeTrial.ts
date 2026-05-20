import type { SupabaseClient } from "@supabase/supabase-js";

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
    console.error("[trial] profile fetch failed", profileError.message);
    return { ok: false, error: profileError.message };
  }

  if (!profile) {
    return { ok: false, error: "Profile not found", code: "profile_missing" };
  }

  if (profile.trial_started_at) {
    console.log("[trial] duplicate prevented", userId);
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
    console.error("[trial] profile update failed", profileUpdateError.message);
    return { ok: false, error: profileUpdateError.message };
  }

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    provider: "lava",
    plan: "free_trial",
    status: "trialing",
    started_at: startedAt,
    expires_at: expiresAt,
    updated_at: startedAt,
  });

  if (subError) {
    console.error("[trial] subscription insert failed", subError.message);
    return { ok: false, error: subError.message };
  }

  console.log("[trial] started", userId, { premiumUntil, expiresAt });
  console.log("[billing] trial subscription created", userId);

  return { ok: true, premiumUntil };
}
