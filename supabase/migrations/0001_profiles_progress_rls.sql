-- Backfill: после add column без NOT NULL могли остаться NULL
update public.profiles
set
  xp = coalesce(xp, 0),
  level = coalesce(level, 1),
  victories = coalesce(victories, 0)
where xp is null
   or level is null
   or victories is null;

-- Жёсткие default + NOT NULL (идемпотентно: повторный запуск безопасен)
alter table public.profiles
  alter column xp set default 0,
  alter column level set default 1,
  alter column victories set default 0;

alter table public.profiles
  alter column xp set not null,
  alter column level set not null,
  alter column victories set not null;

-- RLS
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
