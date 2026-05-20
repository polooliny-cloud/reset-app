/** Public plan prices (RUB). Used by UI only — no Lava API imports. */
export const PLAN_AMOUNTS_RUB = {
  monthly: 299,
  yearly: 1990,
} as const;

export type PaidPlanId = keyof typeof PLAN_AMOUNTS_RUB;
