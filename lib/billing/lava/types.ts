/** Minimal Lava webhook payload shape (extend when integrating full API docs). */
export type LavaWebhookPayload = {
  event?: string;
  status?: string;
  invoice_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  custom_fields?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type LavaCheckoutPlan = "monthly" | "yearly" | "lifetime";
