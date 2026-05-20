import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";

export function parseLavaCustomFields(
  raw: string | null | undefined,
): { user_id?: string; plan?: LavaCheckoutPlan } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { user_id?: string; plan?: string };
    const plan = parsed.plan;
    if (plan === "monthly" || plan === "yearly") {
      return { user_id: parsed.user_id, plan };
    }
    return { user_id: parsed.user_id };
  } catch {
    return {};
  }
}
