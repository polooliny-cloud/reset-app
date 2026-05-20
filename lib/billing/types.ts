export type SubscriptionStatus = "active" | "expired" | "cancelled" | "trialing";

export type SubscriptionPlan = "monthly" | "yearly" | "free_trial";

export type PaymentStatus = "pending" | "paid" | "failed";

export type BillingProvider = "lava" | "internal";

export type PremiumState = {
  isPremium: boolean;
  isTrial: boolean;
  premiumUntil: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: string | null;
  canStartTrial: boolean;
};

export type ProfileBillingRow = {
  premium_until: string | null;
  trial_started_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  provider: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export const FREE_TRIAL_DAYS = 3;

export const PLAN_DURATION_DAYS: Record<Exclude<SubscriptionPlan, "free_trial">, number> = {
  monthly: 30,
  yearly: 365,
};
