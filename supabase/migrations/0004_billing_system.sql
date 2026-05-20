-- Billing: subscriptions, payments, profiles.premium_until

alter table public.profiles add column if not exists premium_until timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz default now();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'lava',
  plan text not null,
  status text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check check (
    status in ('active', 'expired', 'cancelled', 'trialing')
  ),
  constraint subscriptions_plan_check check (
    plan in ('monthly', 'yearly', 'lifetime', 'free_trial')
  ),
  constraint subscriptions_provider_check check (provider in ('lava'))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'lava',
  provider_invoice_id text not null,
  amount integer not null,
  currency text not null default 'RUB',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payments_status_check check (status in ('pending', 'paid', 'failed')),
  constraint payments_provider_check check (provider in ('lava'))
);

create unique index if not exists payments_provider_invoice_uidx
  on public.payments (provider, provider_invoice_id);

create index if not exists subscriptions_user_id_created_at_idx
  on public.subscriptions (user_id, created_at desc);

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);

-- Protect billing columns on profiles from client-side tampering
create or replace function public.protect_profiles_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if new.premium_until is distinct from old.premium_until then
    new.premium_until := old.premium_until;
  end if;

  if old.trial_started_at is not null
     and new.trial_started_at is distinct from old.trial_started_at then
    new.trial_started_at := old.trial_started_at;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_billing_columns on public.profiles;
create trigger profiles_protect_billing_columns
  before update on public.profiles
  for each row
  execute function public.protect_profiles_billing_columns();

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete for authenticated on subscriptions/payments (service role only)
