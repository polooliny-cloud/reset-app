-- Free trial subscriptions are app-managed (Supabase only), not Lava payments.

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('lava', 'internal'));
