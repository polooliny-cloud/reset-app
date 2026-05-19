-- Immutable victory event history + profile.updated_at

alter table public.profiles add column if not exists updated_at timestamptz default now();

create table if not exists public.victories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trigger text not null,
  xp integer not null check (xp >= 0),
  created_at timestamptz not null default now()
);

create index if not exists victories_user_id_created_at_idx
  on public.victories (user_id, created_at desc);

-- Dedup: один раз на (user_id, trigger), кроме manual
create unique index if not exists victories_user_trigger_dedup_idx
  on public.victories (user_id, trigger)
  where trigger <> 'manual';

alter table public.victories enable row level security;

drop policy if exists "victories_select_own" on public.victories;
drop policy if exists "victories_insert_own" on public.victories;

create policy "victories_select_own"
  on public.victories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "victories_insert_own"
  on public.victories
  for insert
  to authenticated
  with check (auth.uid() = user_id);
