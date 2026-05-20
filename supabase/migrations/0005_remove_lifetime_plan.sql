-- Remove lifetime subscription plan (monthly/yearly/free_trial only)

update public.subscriptions
set plan = 'yearly',
    updated_at = now()
where plan = 'lifetime';

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (
    plan in ('monthly', 'yearly', 'free_trial')
  );
