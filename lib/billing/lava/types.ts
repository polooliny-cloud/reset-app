/** Lava webhook payload (Business API). */
export type LavaWebhookPayload = {
  invoice_id?: string;
  order_id?: string;
  status?: string;
  pay_time?: string;
  amount?: number;
  custom_fields?: string | null;
  credited?: number;
  pay_service?: string;
  payer_details?: string;
  event?: string;
  currency?: string;
  customFields?: string | null;
  metadata?: Record<string, unknown>;
};

export type LavaCheckoutPlan = "monthly" | "yearly";
