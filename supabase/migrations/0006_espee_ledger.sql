-- Pixeliia ESPEE economy (no fiat rails): append-only ledger, all writes go
-- through the functions below so clients can never mint, overspend, or
-- double-refund. Balances are always sum(delta); nothing is updated in place.

create table if not exists public.espee_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null,
  ref_id text
);

alter table public.espee_ledger enable row level security;

-- Clients read their own history. There is deliberately NO insert policy:
-- SECURITY DEFINER functions below are the only writers.
drop policy if exists "owners read own ledger" on public.espee_ledger;
create policy "owners read own ledger"
  on public.espee_ledger for select to authenticated
  using (user_id = auth.uid());

grant select on public.espee_ledger to authenticated;

create or replace function public.espee_balance()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.espee_ledger
  where user_id = auth.uid();
$$;

create or replace function public.claim_welcome_grant()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b integer;
begin
  if exists (
    select 1 from public.espee_ledger
    where user_id = auth.uid() and reason = 'welcome'
  ) then
    select public.espee_balance() into b;
    return jsonb_build_object('ok', false, 'balance', b);
  end if;
  insert into public.espee_ledger (user_id, delta, reason)
  values (auth.uid(), 5, 'welcome');
  select public.espee_balance() into b;
  return jsonb_build_object('ok', true, 'balance', b);
end;
$$;

create or replace function public.claim_daily_grant()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b integer;
begin
  if exists (
    select 1 from public.espee_ledger
    where user_id = auth.uid()
      and reason = 'daily'
      and created_at::date = current_date
  ) then
    select public.espee_balance() into b;
    return jsonb_build_object('ok', false, 'balance', b);
  end if;
  insert into public.espee_ledger (user_id, delta, reason)
  values (auth.uid(), 2, 'daily');
  select public.espee_balance() into b;
  return jsonb_build_object('ok', true, 'balance', b);
end;
$$;

create or replace function public.spend_espee(p_amount integer, p_reason text, p_ref_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'bad amount');
  end if;
  select public.espee_balance() into b;
  if b < p_amount then
    return jsonb_build_object('ok', false, 'balance', b);
  end if;
  insert into public.espee_ledger (user_id, delta, reason, ref_id)
  values (auth.uid(), -p_amount, p_reason, p_ref_id);
  select public.espee_balance() into b;
  return jsonb_build_object('ok', true, 'balance', b);
end;
$$;

create or replace function public.refund_espee(p_amount integer, p_reason text, p_ref_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b integer;
begin
  if p_amount is null or p_amount <= 0 or p_ref_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad refund');
  end if;
  if not exists (
    select 1 from public.espee_ledger
    where user_id = auth.uid()
      and ref_id = p_ref_id
      and delta < 0
  ) then
    return jsonb_build_object('ok', false, 'error', 'no matching spend');
  end if;
  if exists (
    select 1 from public.espee_ledger
    where user_id = auth.uid()
      and ref_id = 'refund:' || p_ref_id
  ) then
    select public.espee_balance() into b;
    return jsonb_build_object('ok', false, 'balance', b, 'error', 'already refunded');
  end if;
  insert into public.espee_ledger (user_id, delta, reason, ref_id)
  values (auth.uid(), p_amount, 'Refund: ' || p_reason, 'refund:' || p_ref_id);
  select public.espee_balance() into b;
  return jsonb_build_object('ok', true, 'balance', b);
end;
$$;

grant execute on function public.espee_balance() to authenticated;
grant execute on function public.claim_welcome_grant() to authenticated;
grant execute on function public.claim_daily_grant() to authenticated;
grant execute on function public.spend_espee(integer, text, text) to authenticated;
grant execute on function public.refund_espee(integer, text, text) to authenticated;
