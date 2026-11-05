-- =====================================================================
--  AuthentiTrade · Escrow payments (test mode)
--  Run this whole file once in Supabase → SQL Editor → New query → Run.
--  It is safe to run again: everything is "create if missing" / "replace".
--
--  Flow
--    buyer  : create_order → pay_order (card)  or  QR → pay_order_by_token (phone)
--             money is HELD in escrow → release_order ("I received it")
--                                     → dispute_order ("Report a problem")
--    system : release_due() auto-releases held payments after N days
--    seller : my_orders() / unseen_sales() / mark_sales_seen()
--    admin  : admin_payments() and admin_resolve_order() (release or refund)
--
--  No real money moves and no card numbers are stored; only a label such
--  as "VISA •••• 4242" is saved so the receipt and the admin can show it.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Admin check. Your project already has public.is_admin(); this only
--    creates one if it is missing, so the script also runs on a fresh DB.
-- ---------------------------------------------------------------------
do $$
declare col text;
begin
  if to_regprocedure('public.is_admin()') is null then
    create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
    select column_name into col from information_schema.columns
     where table_schema = 'public' and table_name = 'admins' and column_name in ('user_id', 'id')
     order by column_name = 'user_id' desc limit 1;
    execute format($f$
      create function public.is_admin() returns boolean
      language sql stable security definer set search_path = public as
      'select exists (select 1 from public.admins where %I = auth.uid())'
    $f$, col);
    grant execute on function public.is_admin() to authenticated;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Settings that shape the payment rules (readable by everyone)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
insert into public.app_settings (key, value) values
  ('online_only_below',  '10000'),   -- below this price: escrow payment only
  ('contact_only_above', '200000'),  -- above this price: no online payment, contact seller
  ('escrow_days',        '7'),       -- auto-release to the seller after this many days
  ('qr_minutes',         '10')       -- how long a UPI QR code stays valid
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "settings readable" on public.app_settings;
create policy "settings readable" on public.app_settings for select to anon, authenticated using (true);
grant select on public.app_settings to anon, authenticated;
revoke insert, update, delete on public.app_settings from anon, authenticated;

create or replace function public._at_setting(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(value, '')::numeric from public.app_settings where key = p_key), p_default)
$$;


-- ---------------------------------------------------------------------
-- 2. Transactions (one row per order). listing_id takes the same type as
--    listings.id (uuid or bigint), so it works with your existing table.
-- ---------------------------------------------------------------------
do $$
declare id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into id_type
    from pg_attribute a
   where a.attrelid = 'public.listings'::regclass and a.attname = 'id' and not a.attisdropped;

  execute format($t$
    create table if not exists public.transactions (
      id              uuid primary key default gen_random_uuid(),
      listing_id      %s not null references public.listings(id) on delete restrict,
      buyer_id        uuid not null references auth.users(id),
      seller_id       uuid not null references auth.users(id),
      amount          numeric(14,2) not null check (amount > 0),
      currency        text not null default 'INR',
      method          text not null default 'card',
      paid_with       text,
      escrow_status   text not null default 'pending',
      qr_token        text,
      qr_expires_at   timestamptz,
      created_at      timestamptz not null default now(),
      paid_at         timestamptz,
      release_at      timestamptz,
      released_at     timestamptz,
      refunded_at     timestamptz,
      disputed_at     timestamptz,
      dispute_reason  text,
      resolved_by     uuid references auth.users(id),
      resolution_note text,
      seller_seen_at  timestamptz
    )$t$, id_type);
end $$;

-- If a transactions table already existed, make sure every column is there.
alter table public.transactions
  add column if not exists currency        text not null default 'INR',
  add column if not exists method          text not null default 'card',
  add column if not exists paid_with       text,
  add column if not exists escrow_status   text not null default 'pending',
  add column if not exists qr_token        text,
  add column if not exists qr_expires_at   timestamptz,
  add column if not exists created_at      timestamptz not null default now(),
  add column if not exists paid_at         timestamptz,
  add column if not exists release_at      timestamptz,
  add column if not exists released_at     timestamptz,
  add column if not exists refunded_at     timestamptz,
  add column if not exists disputed_at     timestamptz,
  add column if not exists dispute_reason  text,
  add column if not exists resolved_by     uuid,
  add column if not exists resolution_note text,
  add column if not exists seller_seen_at  timestamptz;

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check
  check (escrow_status in ('pending', 'held', 'released', 'disputed', 'refunded', 'cancelled'));
alter table public.transactions drop constraint if exists transactions_method_check;
alter table public.transactions add constraint transactions_method_check check (method in ('card', 'qr'));

create index if not exists transactions_buyer_idx   on public.transactions (buyer_id, created_at desc);
create index if not exists transactions_seller_idx  on public.transactions (seller_id, created_at desc);
create index if not exists transactions_listing_idx on public.transactions (listing_id);
create index if not exists transactions_status_idx  on public.transactions (escrow_status, release_at);
-- A listing can only ever have one successful payment.
create unique index if not exists transactions_one_paid_per_listing
  on public.transactions (listing_id) where escrow_status in ('held', 'released', 'disputed');

-- Buyers and sellers can read their own orders, admins can read all.
-- Nobody writes directly: every change goes through the functions below.
alter table public.transactions enable row level security;
drop policy if exists "orders visible to buyer seller admin" on public.transactions;
create policy "orders visible to buyer seller admin" on public.transactions for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
grant select on public.transactions to authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
revoke all on public.transactions from anon;


-- ---------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------
-- Mark the listing sold / active again. Wrapped so an unusual
-- listing_status constraint on your table can never block a payment.
create or replace function public._at_set_listing_status(p_listing_id text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.listings set listing_status = p_status where id::text = p_listing_id;
exception when others then
  raise notice 'Could not set listing % to %: %', p_listing_id, p_status, sqlerrm;
end $$;

-- Move a pending order into escrow (shared by card and QR payments).
create or replace function public._at_mark_paid(p_order_id uuid, p_method text, p_paid_with text)
returns public.transactions language plpgsql security definer set search_path = public as $$
declare t public.transactions;
begin
  select * into t from public.transactions where id = p_order_id for update;
  if t.escrow_status = 'held' then return t; end if;           -- already paid: harmless repeat
  if t.escrow_status <> 'pending' then raise exception 'This order can no longer be paid.'; end if;

  if exists (select 1 from public.transactions
              where listing_id = t.listing_id and id <> t.id
                and escrow_status in ('held', 'released', 'disputed')) then
    update public.transactions set escrow_status = 'cancelled' where id = t.id;
    raise exception 'Sorry, someone else has just bought this item. You have not been charged.';
  end if;

  update public.transactions
     set escrow_status = 'held',
         method        = p_method,
         paid_with     = p_paid_with,
         paid_at       = now(),
         release_at    = now() + make_interval(days => public._at_setting('escrow_days', 7)::int),
         qr_token      = null
   where id = t.id
  returning * into t;

  perform public._at_set_listing_status(t.listing_id::text, 'sold');
  -- other buyers' unfinished checkouts for the same item are closed
  update public.transactions set escrow_status = 'cancelled'
   where listing_id = t.listing_id and escrow_status = 'pending' and id <> t.id;
  return t;
end $$;


-- ---------------------------------------------------------------------
-- 4. Buyer: start a checkout
-- ---------------------------------------------------------------------
drop function if exists public.create_order(text, text);
drop function if exists public.create_order(uuid, text);
drop function if exists public.create_order(bigint, text);
create function public.create_order(p_listing_id text, p_method text)
returns public.transactions language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l  record;
  t  public.transactions;
begin
  if me is null then raise exception 'Please log in to pay.'; end if;
  if p_method not in ('card', 'qr') then raise exception 'Choose card or UPI QR.'; end if;

  select id, seller_id, title, price, verification_status, listing_status
    into l from public.listings where id::text = p_listing_id for update;
  if not found then raise exception 'This listing does not exist.'; end if;
  if l.seller_id = me then raise exception 'You cannot buy your own listing.'; end if;
  if l.verification_status is distinct from 'verified' or l.listing_status is distinct from 'active' then
    raise exception 'This item is no longer available.';
  end if;
  if l.price is null or l.price <= 0 then raise exception 'This listing has no valid price.'; end if;
  if l.price > public._at_setting('contact_only_above', 200000) then
    raise exception 'Items at this price are not paid for online. Please contact the seller.';
  end if;
  if exists (select 1 from public.transactions
              where listing_id = l.id and escrow_status in ('held', 'released', 'disputed')) then
    raise exception 'This item has already been bought.';
  end if;

  -- close this buyer's earlier unfinished checkouts for the same item
  update public.transactions set escrow_status = 'cancelled'
   where listing_id = l.id and buyer_id = me and escrow_status = 'pending';

  insert into public.transactions (listing_id, buyer_id, seller_id, amount, method, qr_token, qr_expires_at)
  values (l.id, me, l.seller_id, l.price, p_method,
          case when p_method = 'qr' then replace(gen_random_uuid()::text, '-', '') end,
          case when p_method = 'qr' then now() + make_interval(mins => public._at_setting('qr_minutes', 10)::int) end)
  returning * into t;
  return t;
end $$;


-- ---------------------------------------------------------------------
-- 5. Buyer: pay by card (on the laptop)
-- ---------------------------------------------------------------------
drop function if exists public.pay_order(uuid, text);
drop function if exists public.pay_order(uuid, text, text);
create function public.pay_order(p_order_id uuid, p_method text, p_paid_with text default null)
returns public.transactions language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in to pay.'; end if;
  if not exists (select 1 from public.transactions where id = p_order_id and buyer_id = auth.uid()) then
    raise exception 'Order not found.';
  end if;
  return public._at_mark_paid(p_order_id, coalesce(p_method, 'card'),
           left(coalesce(nullif(trim(p_paid_with), ''), 'Card'), 60));
end $$;


-- ---------------------------------------------------------------------
-- 6. Phone side of the UPI QR (opened from the QR code, no login needed)
-- ---------------------------------------------------------------------
drop function if exists public.order_preview(uuid, text);
create function public.order_preview(p_order_id uuid, p_token text)
returns json language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  select t.amount, t.escrow_status, t.qr_token, t.qr_expires_at, l.title
    into r from public.transactions t join public.listings l on l.id = t.listing_id
   where t.id = p_order_id and t.method = 'qr';
  if not found then return null; end if;
  if r.escrow_status = 'held' then
    return json_build_object('amount', r.amount, 'title', r.title, 'status', r.escrow_status);
  end if;
  if r.escrow_status <> 'pending' or r.qr_token is distinct from p_token or r.qr_expires_at < now() then
    return null;
  end if;
  return json_build_object('amount', r.amount, 'title', r.title, 'status', r.escrow_status);
end $$;

drop function if exists public.pay_order_by_token(uuid, text);
create function public.pay_order_by_token(p_order_id uuid, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare t public.transactions;
begin
  select * into t from public.transactions where id = p_order_id and method = 'qr' for update;
  if not found then raise exception 'This payment link is not valid.'; end if;
  if t.escrow_status = 'held' then return json_build_object('status', 'held'); end if;
  if t.qr_token is distinct from p_token then raise exception 'This payment link is not valid.'; end if;
  if t.qr_expires_at < now() then raise exception 'This QR code has expired. Create a new one on your laptop.'; end if;
  t := public._at_mark_paid(p_order_id, 'qr', 'UPI (QR scan)');
  return json_build_object('status', t.escrow_status);
end $$;


-- ---------------------------------------------------------------------
-- 7. Buyer: confirm delivery or report a problem
-- ---------------------------------------------------------------------
drop function if exists public.release_order(uuid);
create function public.release_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.transactions set escrow_status = 'released', released_at = now()
   where id = p_order_id and buyer_id = auth.uid() and escrow_status = 'held';
  if not found then raise exception 'Only the buyer can release a payment that is held in escrow.'; end if;
end $$;

drop function if exists public.dispute_order(uuid);
drop function if exists public.dispute_order(uuid, text);
create function public.dispute_order(p_order_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.transactions
     set escrow_status = 'disputed', disputed_at = now(), dispute_reason = left(nullif(trim(p_reason), ''), 1000)
   where id = p_order_id and buyer_id = auth.uid() and escrow_status = 'held';
  if not found then raise exception 'Only the buyer can report a problem with a payment held in escrow.'; end if;
end $$;

-- Auto-release payments whose escrow period has ended. Called when the
-- Orders / admin screens load; you can also schedule it with pg_cron.
drop function if exists public.release_due();
create function public.release_due()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.transactions set escrow_status = 'released', released_at = now()
   where escrow_status = 'held' and release_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;


-- ---------------------------------------------------------------------
-- 8. Buyer and seller: order lists with names and titles
-- ---------------------------------------------------------------------
drop function if exists public.my_orders();
create function public.my_orders()
returns table (
  id uuid, listing_id text, listing_title text, listing_image text,
  buyer_id uuid, buyer_name text, seller_id uuid, seller_name text,
  role text, amount numeric, currency text, method text, paid_with text,
  escrow_status text, created_at timestamptz, paid_at timestamptz, release_at timestamptz,
  released_at timestamptz, refunded_at timestamptz, disputed_at timestamptz,
  dispute_reason text, resolution_note text, seller_seen_at timestamptz
) language sql stable security definer set search_path = public as $$
  select t.id, t.listing_id::text, l.title, to_jsonb(l.image_urls)->>0,
         t.buyer_id, bp.full_name, t.seller_id, sp.full_name,
         case when t.buyer_id = auth.uid() then 'buyer' else 'seller' end,
         t.amount, t.currency, t.method, t.paid_with,
         t.escrow_status, t.created_at, t.paid_at, t.release_at,
         t.released_at, t.refunded_at, t.disputed_at,
         t.dispute_reason, t.resolution_note, t.seller_seen_at
    from public.transactions t
    left join public.listings l  on l.id  = t.listing_id
    left join public.profiles bp on bp.id = t.buyer_id
    left join public.profiles sp on sp.id = t.seller_id
   where (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
     and t.escrow_status in ('held', 'released', 'disputed', 'refunded')
   order by coalesce(t.paid_at, t.created_at) desc
   limit 100
$$;

-- New payments the seller has not looked at yet (drives the header badge)
drop function if exists public.unseen_sales();
create function public.unseen_sales()
returns table (id uuid, listing_title text, amount numeric, buyer_name text, paid_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, l.title, t.amount, bp.full_name, t.paid_at
    from public.transactions t
    left join public.listings l  on l.id  = t.listing_id
    left join public.profiles bp on bp.id = t.buyer_id
   where t.seller_id = auth.uid() and t.seller_seen_at is null
     and t.escrow_status in ('held', 'released', 'disputed', 'refunded')
   order by t.paid_at desc
$$;

drop function if exists public.mark_sales_seen();
create function public.mark_sales_seen()
returns void language sql security definer set search_path = public as $$
  update public.transactions set seller_seen_at = now()
   where seller_id = auth.uid() and seller_seen_at is null
     and escrow_status in ('held', 'released', 'disputed', 'refunded')
$$;


-- ---------------------------------------------------------------------
-- 9. Admin: every payment, and release / refund decisions
-- ---------------------------------------------------------------------
drop function if exists public.admin_payments(text);
create function public.admin_payments(p_status text default null)
returns table (
  id uuid, listing_id text, listing_title text, listing_image text,
  buyer_id uuid, buyer_name text, buyer_email text,
  seller_id uuid, seller_name text, seller_email text,
  amount numeric, currency text, method text, paid_with text, escrow_status text,
  created_at timestamptz, paid_at timestamptz, release_at timestamptz,
  released_at timestamptz, refunded_at timestamptz, disputed_at timestamptz,
  dispute_reason text, resolution_note text, resolved_by_name text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
  select t.id, t.listing_id::text, l.title, to_jsonb(l.image_urls)->>0,
         t.buyer_id, bp.full_name, bu.email::text,
         t.seller_id, sp.full_name, su.email::text,
         t.amount, t.currency, t.method, t.paid_with, t.escrow_status,
         t.created_at, t.paid_at, t.release_at,
         t.released_at, t.refunded_at, t.disputed_at,
         t.dispute_reason, t.resolution_note, rp.full_name
    from public.transactions t
    left join public.listings l  on l.id  = t.listing_id
    left join public.profiles bp on bp.id = t.buyer_id
    left join public.profiles sp on sp.id = t.seller_id
    left join public.profiles rp on rp.id = t.resolved_by
    left join auth.users bu on bu.id = t.buyer_id
    left join auth.users su on su.id = t.seller_id
   where (p_status is null and t.escrow_status <> 'cancelled') or t.escrow_status = p_status
   order by coalesce(t.paid_at, t.created_at) desc
   limit 500;
end $$;

drop function if exists public.admin_resolve_order(uuid, text);
drop function if exists public.admin_resolve_order(uuid, text, text);
create function public.admin_resolve_order(p_order_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.transactions;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_decision not in ('released', 'refunded') then raise exception 'Decision must be released or refunded.'; end if;

  update public.transactions
     set escrow_status   = p_decision,
         released_at     = case when p_decision = 'released' then now() else released_at end,
         refunded_at     = case when p_decision = 'refunded' then now() else refunded_at end,
         resolved_by     = auth.uid(),
         resolution_note = left(nullif(trim(p_note), ''), 1000)
   where id = p_order_id and escrow_status in ('held', 'disputed')
  returning * into t;
  if not found then raise exception 'Only payments that are held or disputed can be released or refunded.'; end if;

  -- refunded: the item goes back on the marketplace
  if p_decision = 'refunded' then perform public._at_set_listing_status(t.listing_id::text, 'active'); end if;
end $$;


-- ---------------------------------------------------------------------
-- 10. Who may call what
-- ---------------------------------------------------------------------
revoke execute on function public._at_setting(text, numeric)                from public, anon, authenticated;
revoke execute on function public._at_set_listing_status(text, text)       from public, anon, authenticated;
revoke execute on function public._at_mark_paid(uuid, text, text)          from public, anon, authenticated;

revoke execute on function public.create_order(text, text)                 from public, anon;
revoke execute on function public.pay_order(uuid, text, text)              from public, anon;
revoke execute on function public.release_order(uuid)                      from public, anon;
revoke execute on function public.dispute_order(uuid, text)                from public, anon;
revoke execute on function public.release_due()                            from public, anon;
revoke execute on function public.my_orders()                              from public, anon;
revoke execute on function public.unseen_sales()                           from public, anon;
revoke execute on function public.mark_sales_seen()                        from public, anon;
revoke execute on function public.admin_payments(text)                     from public, anon;
revoke execute on function public.admin_resolve_order(uuid, text, text)    from public, anon;

grant execute on function public.create_order(text, text)                  to authenticated;
grant execute on function public.pay_order(uuid, text, text)               to authenticated;
grant execute on function public.release_order(uuid)                       to authenticated;
grant execute on function public.dispute_order(uuid, text)                 to authenticated;
grant execute on function public.release_due()                             to authenticated;
grant execute on function public.my_orders()                               to authenticated;
grant execute on function public.unseen_sales()                            to authenticated;
grant execute on function public.mark_sales_seen()                         to authenticated;
grant execute on function public.admin_payments(text)                      to authenticated;
grant execute on function public.admin_resolve_order(uuid, text, text)     to authenticated;
-- the phone that scans the QR code is not logged in
grant execute on function public.order_preview(uuid, text)                 to anon, authenticated;
grant execute on function public.pay_order_by_token(uuid, text)            to anon, authenticated;

-- Tell the API to pick up the new functions straight away
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Optional: auto-release every hour even if nobody opens the app.
-- Enable the pg_cron extension (Database → Extensions), then run:
--   select cron.schedule('release-escrow', '0 * * * *', 'select public.release_due()');
-- ---------------------------------------------------------------------
