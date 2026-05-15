-- Idempotent: greenfield + existing projects with partial schema.
-- Run after 0001 or standalone; safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  trial_started_at timestamptz,
  onboarding_completed boolean not null default false,
  xp integer not null default 0,
  level integer not null default 1,
  victories integer not null default 0
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed boolean default false;
alter table public.profiles add column if not exists xp integer default 0;
alter table public.profiles add column if not exists level integer default 1;
alter table public.profiles add column if not exists victories integer default 0;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
