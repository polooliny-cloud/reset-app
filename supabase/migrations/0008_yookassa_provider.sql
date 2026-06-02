-- Make YooKassa the only paid payment provider.

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('yookassa'));

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions
  add constraint subscriptions_provider_check check (provider in ('yookassa', 'internal'));
