-- Atomic paid activation for webhook retries/concurrent delivery.
-- Only the first caller that changes a pending payment to paid extends premium.

create or replace function public.activate_paid_subscription_atomic(
  p_provider text,
  p_provider_invoice_id text,
  p_user_id uuid,
  p_plan text,
  p_amount integer,
  p_currency text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_payment_status text;
  v_now timestamptz := now();
  v_current_premium_until timestamptz;
  v_base timestamptz;
  v_days integer;
  v_expires_at timestamptz;
begin
  if p_provider <> 'yookassa' then
    return jsonb_build_object('ok', false, 'error', 'Invalid provider', 'code', 'invalid_provider');
  end if;

  if p_plan = 'monthly' then
    v_days := 30;
  elsif p_plan = 'yearly' then
    v_days := 365;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid plan', 'code', 'invalid_plan');
  end if;

  if p_currency <> 'RUB' then
    return jsonb_build_object('ok', false, 'error', 'Invalid currency', 'code', 'invalid_currency');
  end if;

  update public.payments
  set
    status = 'paid',
    amount = p_amount,
    currency = p_currency,
    metadata = coalesce(p_metadata, '{}'::jsonb)
  where provider = p_provider
    and provider_invoice_id = p_provider_invoice_id
    and user_id = p_user_id
    and status = 'pending'
  returning id into v_payment_id;

  if v_payment_id is null then
    select status
    into v_payment_status
    from public.payments
    where provider = p_provider
      and provider_invoice_id = p_provider_invoice_id
      and user_id = p_user_id;

    if v_payment_status = 'paid' then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end if;

    return jsonb_build_object(
      'ok', false,
      'error', 'Payment is not pending',
      'code', 'payment_not_pending',
      'payment_status', v_payment_status
    );
  end if;

  select premium_until
  into v_current_premium_until
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Profile not found', 'code', 'profile_missing');
  end if;

  v_base := greatest(coalesce(v_current_premium_until, v_now), v_now);
  v_expires_at := v_base + make_interval(days => v_days);

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
    p_provider,
    p_plan,
    'active',
    v_now,
    v_expires_at,
    v_now
  );

  update public.profiles
  set
    premium_until = v_expires_at,
    updated_at = v_now
  where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'premium_until', v_expires_at,
    'payment_id', v_payment_id
  );
end;
$$;

revoke all on function public.activate_paid_subscription_atomic(text, text, uuid, text, integer, text, jsonb) from public;
grant execute on function public.activate_paid_subscription_atomic(text, text, uuid, text, integer, text, jsonb) to service_role;
