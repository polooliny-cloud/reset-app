import type { PaidPlanId } from "@/lib/billing/planPrices";

export type YookassaCheckoutPlan = PaidPlanId;

export type YookassaPaymentStatus =
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled";

export type YookassaPayment = {
  id: string;
  status: YookassaPaymentStatus | string;
  paid?: boolean;
  amount?: {
    value?: string;
    currency?: string;
  };
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, unknown>;
  description?: string;
  created_at?: string;
};

export type YookassaWebhookPayload = {
  type?: string;
  event?: string;
  object?: YookassaPayment;
};

export function isYookassaPlan(value: unknown): value is YookassaCheckoutPlan {
  return value === "monthly" || value === "yearly";
}
