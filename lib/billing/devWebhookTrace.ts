import type { LavaWebhookPayload } from "@/lib/billing/lava/types";

export type WebhookTraceEntry = {
  receivedAt: string;
  signatureValid: boolean;
  status: string | null;
  invoiceId: string | null;
  orderId: string | null;
  userId: string | null;
  plan: string | null;
  activationOk: boolean;
  duplicate: boolean;
  error: string | null;
  payloadPreview: Partial<LavaWebhookPayload>;
};

const MAX_ENTRIES = 30;
const trace: WebhookTraceEntry[] = [];

export function recordWebhookTrace(entry: WebhookTraceEntry): void {
  trace.unshift(entry);
  if (trace.length > MAX_ENTRIES) trace.length = MAX_ENTRIES;
}

export function getWebhookTrace(limit = 10): WebhookTraceEntry[] {
  return trace.slice(0, limit);
}

export function getLastWebhookTrace(): WebhookTraceEntry | null {
  return trace[0] ?? null;
}
