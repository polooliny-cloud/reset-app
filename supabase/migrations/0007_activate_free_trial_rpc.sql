-- Atomic free trial: profile + subscription in one transaction (rollback on any failure).
-- Requires 0006 (provider 'internal') on subscriptions.

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('lava', 'internal'));

create or replace function public.activate_free_trial(
  p_user_id uuid,
  p_trial_days integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trial_started_at timestamptz;
  v_premium_until timestamptz;
  v_now timestamptz := now();
begin
  if p_trial_days is null or p_trial_days < 1 or p_trial_days > 30 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Invalid trial days',
      'code', 'invalid_trial_days'
    );
  end if;

  select trial_started_at
  into v_trial_started_at
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'Profile not found',
      'code', 'profile_missing'
    );
  end if;

  if v_trial_started_at is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'Trial already used',
      'code', 'trial_already_used'
    );
  end if;

  v_premium_until := v_now + make_interval(days => p_trial_days);

  update public.profiles
  set
    trial_started_at = v_now,
    premium_until = v_premium_until,
    updated_at = v_now
  where id = p_user_id;

  insert into public.subscriptions (
    user_id,
    provider,
    plan,
    status,
    started_at,
    expires_at,
    updated_at
  )
  values (
    p_user_id,
    'internal',
    'free_trial',
    'trialing',
    v_now,
    v_premium_until,
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'premium_until', v_premium_until
  );
end;
$$;

revoke all on function public.activate_free_trial(uuid, integer) from public;
grant execute on function public.activate_free_trial(uuid, integer) to service_role;
