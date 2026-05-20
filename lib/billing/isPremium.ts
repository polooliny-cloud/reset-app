import type { PremiumState, ProfileBillingRow, SubscriptionRow } from "@/lib/billing/types";

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isSubscriptionEntitled(
  sub: Pick<SubscriptionRow, "status" | "expires_at"> | null,
  nowMs = Date.now(),
): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  const expiresMs = parseMs(sub.expires_at);
  if (expiresMs !== null && expiresMs <= nowMs) return false;
  return true;
}

export function isPremiumUntilActive(
  premiumUntil: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const untilMs = parseMs(premiumUntil ?? null);
  return untilMs !== null && untilMs > nowMs;
}

/** Source of truth evaluator (DB fields only, no localStorage). */
export function isPremium(input: {
  premiumUntil: string | null;
  subscription: Pick<SubscriptionRow, "status" | "expires_at"> | null;
  nowMs?: number;
}): boolean {
  const nowMs = input.nowMs ?? Date.now();
  return (
    isPremiumUntilActive(input.premiumUntil, nowMs) ||
    isSubscriptionEntitled(input.subscription, nowMs)
  );
}

export function getPremiumState(input: {
  profile: ProfileBillingRow | null;
  subscription: SubscriptionRow | null;
  nowMs?: number;
}): PremiumState {
  const nowMs = input.nowMs ?? Date.now();
  const premiumUntil = input.profile?.premium_until ?? null;
  const trialStartedAt = input.profile?.trial_started_at ?? null;
  const subscription = input.subscription;

  const premiumActive = isPremiumUntilActive(premiumUntil, nowMs);
  const subEntitled = isSubscriptionEntitled(subscription, nowMs);
  const isPremiumActive = premiumActive || subEntitled;

  const isTrial =
    subscription?.status === "trialing" ||
    (isPremiumActive && subscription?.plan === "free_trial");

  const subscriptionStatus =
    subscription?.status && ["active", "expired", "cancelled", "trialing"].includes(subscription.status)
      ? (subscription.status as PremiumState["subscriptionStatus"])
      : null;

  const trialEndsAt = isTrial ? premiumUntil : null;
  const canStartTrial = !trialStartedAt;

  console.log("[premium] state evaluated", {
    isPremium: isPremiumActive,
    isTrial,
    subscriptionStatus,
    premiumUntil,
    trialEndsAt,
  });

  return {
    isPremium: isPremiumActive,
    isTrial,
    premiumUntil,
    subscriptionStatus,
    trialEndsAt,
    canStartTrial,
  };
}
