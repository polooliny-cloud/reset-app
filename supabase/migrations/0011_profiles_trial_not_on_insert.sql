-- trial_started_at is a billing flag, not "profile created at".
-- New rows must not consume trial. Drop any DEFAULT now() that may exist
-- on the live table (not expressed in earlier migrations).

alter table public.profiles
  alter column trial_started_at drop default;

alter table public.profiles
  alter column premium_until drop default;

create or replace function public.profiles_null_billing_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.trial_started_at := null;
  new.premium_until := null;
  return new;
end;
$$;

drop trigger if exists profiles_null_billing_on_insert on public.profiles;
create trigger profiles_null_billing_on_insert
  before insert on public.profiles
  for each row
  execute function public.profiles_null_billing_on_insert();

-- False positives: timestamp set, but trial was never granted.
update public.profiles as p
set trial_started_at = null
where p.trial_started_at is not null
  and p.premium_until is null
  and not exists (
    select 1
    from public.subscriptions as s
    where s.user_id = p.id
      and s.plan = 'free_trial'
  );
