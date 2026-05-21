import type { SupabaseClient } from "@supabase/supabase-js";

import { trialLog } from "@/lib/billing/trialLog";
import { FREE_TRIAL_DAYS } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

export type StartFreeTrialResult =
  | { ok: true; premiumUntil: string }
  | { ok: false; error: string; code?: "trial_already_used" | "profile_missing" | "trial_activation_failed" };

type ActivateFreeTrialRpcRow = {
  ok?: boolean;
  premium_until?: string;
  error?: string;
  code?: string;
};

/**
 * Starts a one-time trial via DB RPC (single transaction).
 * Must run with service-role client.
 */
export async function startFreeTrial(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<StartFreeTrialResult> {
  const { data, error } = await admin.rpc("activate_free_trial", {
    p_user_id: userId,
    p_trial_days: FREE_TRIAL_DAYS,
  });

  if (error) {
    trialLog("failed", { userId, step: "rpc", error: error.message }, "error");
    return { ok: false, error: error.message, code: "trial_activation_failed" };
  }

  const row = (data ?? {}) as ActivateFreeTrialRpcRow;

  if (!row.ok) {
    const code = row.code ?? "trial_activation_failed";
    trialLog("failed", { userId, code, error: row.error }, code === "trial_already_used" ? "warn" : "error");
    return {
      ok: false,
      error: row.error ?? "Trial activation failed",
      code:
        code === "trial_already_used" || code === "profile_missing"
          ? code
          : "trial_activation_failed",
    };
  }

  const premiumUntil = row.premium_until;
  if (!premiumUntil) {
    trialLog("failed", { userId, step: "rpc_response", error: "missing premium_until" }, "error");
    return { ok: false, error: "Invalid trial RPC response", code: "trial_activation_failed" };
  }

  trialLog("premium_activated", { userId, premiumUntil });
  return { ok: true, premiumUntil };
}
