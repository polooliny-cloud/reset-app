/** Public plan prices (RUB). Used by UI and server checkout validation. */
export const PLAN_AMOUNTS_RUB = {
  monthly: 159,
  yearly: 499,
} as const;

export type PaidPlanId = keyof typeof PLAN_AMOUNTS_RUB;
