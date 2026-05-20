import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { supabase } from "@/lib/supabase";

export async function getBillingAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function startFreeTrialClient(): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await getBillingAccessToken();
  if (!token) return { ok: false, error: "Нужна авторизация" };

  const res = await fetch("/api/billing/trial/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Не удалось активировать пробный период" };
  }
  return { ok: true };
}

export async function startCheckoutClient(
  plan: LavaCheckoutPlan,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const token = await getBillingAccessToken();
  if (!token) return { ok: false, error: "Нужна авторизация" };

  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  const data = (await res.json()) as { error?: string; checkout_url?: string };
  if (!res.ok || !data.checkout_url) {
    return { ok: false, error: data.error ?? "Не удалось создать оплату" };
  }
  return { ok: true, checkoutUrl: data.checkout_url };
}
