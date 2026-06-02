/** Public plan prices (RUB). Used by UI and server checkout validation. */
export const PLAN_AMOUNTS_RUB = {
  monthly: 299,
  yearly: 1990,
} as const;

export type PaidPlanId = keyof typeof PLAN_AMOUNTS_RUB;
