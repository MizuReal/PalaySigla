-- 009_transactions.sql
-- Durable, participant-readable transaction records. A transaction is the
-- audit trail of a listing's reserve/sold lifecycle and survives the listing
-- leaving the feed or being soft-deleted, so the buyer always retains access
-- to what they bought (and, later, to reviews).
--
-- Rows are written only by a security definer trigger on public.listings:
-- clients never insert/update/delete transactions directly. Both participants
-- can read their own rows under RLS.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  listing_title text not null check (char_length(listing_title) between 1 and 120),
  price numeric(12, 2) check (price >= 0),
  unit text not null check (unit in ('kg', 'sack', 'cavan', 'lot')),
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_name text not null check (char_length(seller_name) between 1 and 254),
  buyer_id uuid references auth.users (id) on delete set null,
  buyer_name text check (buyer_name is null or char_length(buyer_name) <= 254),
  status text not null check (status in ('reserved', 'sold', 'cancelled')),
  reserved_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists transactions_buyer_idx
  on public.transactions (buyer_id, created_at desc);
create index if not exists transactions_seller_idx
  on public.transactions (seller_id, created_at desc);
create index if not exists transactions_listing_idx
  on public.transactions (listing_id);

-- updated_at maintenance reuses the shared trigger function from 001
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at ();

-- keep transactions in lockstep with the listing's transaction state: a hold
-- opens a reserved row, a sale promotes it (or records a walk-up sale), and a
-- release cancels the open hold. security definer so the listing owner's
-- privileges are sufficient and clients never write transactions directly.
create or replace function public.sync_listing_transaction ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  if new.status = 'reserved' then
    if old.status is distinct from 'reserved'
      or new.reserved_for is distinct from old.reserved_for then
      update public.transactions
        set status = 'cancelled', updated_at = now()
        where listing_id = new.id
          and status = 'reserved'
          and buyer_id is distinct from new.reserved_for;

      if not exists (
        select 1
        from public.transactions
        where listing_id = new.id
          and status = 'reserved'
          and buyer_id is not distinct from new.reserved_for
      ) then
        insert into public.transactions (
          listing_id, listing_title, price, unit,
          seller_id, seller_name, buyer_id, buyer_name,
          status, reserved_at
        ) values (
          new.id, new.title, new.price, new.unit,
          new.user_id, new.seller_name, new.reserved_for, new.reserved_for_name,
          'reserved', coalesce(new.reserved_at, now())
        );
      end if;
    end if;
  elsif new.status = 'sold' and old.status is distinct from 'sold' then
    update public.transactions
      set status = 'sold',
          sold_at = coalesce(new.sold_at, now()),
          buyer_id = new.sold_to,
          buyer_name = new.sold_to_name,
          updated_at = now()
      where listing_id = new.id
        and status = 'reserved'
        and buyer_id is not distinct from new.sold_to;

    if not found then
      insert into public.transactions (
        listing_id, listing_title, price, unit,
        seller_id, seller_name, buyer_id, buyer_name,
        status, sold_at
      ) values (
        new.id, new.title, new.price, new.unit,
        new.user_id, new.seller_name, new.sold_to, new.sold_to_name,
        'sold', coalesce(new.sold_at, now())
      );
    end if;

    -- a sale closes every other open hold on the listing
    update public.transactions
      set status = 'cancelled', updated_at = now()
      where listing_id = new.id
        and status = 'reserved'
        and buyer_id is distinct from new.sold_to;
  elsif new.status = 'active' and old.status = 'reserved' then
    update public.transactions
      set status = 'cancelled', updated_at = now()
      where listing_id = new.id and status = 'reserved';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_sync_transaction on public.listings;
create trigger listings_sync_transaction
  after insert or update on public.listings
  for each row
  execute function public.sync_listing_transaction ();

alter table public.transactions enable row level security;

-- participants read their own transactions; writes happen only through the
-- definer trigger, so there are deliberately no insert/update/delete policies
create policy "transactions_select_participant"
  on public.transactions
  for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- backfill a transaction for listings already reserved/sold before this table
insert into public.transactions (
  listing_id, listing_title, price, unit,
  seller_id, seller_name, buyer_id, buyer_name,
  status, reserved_at, sold_at, created_at
)
select
  l.id,
  l.title,
  l.price,
  l.unit,
  l.user_id,
  l.seller_name,
  case when l.status = 'sold' then l.sold_to else l.reserved_for end,
  case when l.status = 'sold' then l.sold_to_name else l.reserved_for_name end,
  case when l.status = 'sold' then 'sold' else 'reserved' end,
  l.reserved_at,
  l.sold_at,
  coalesce(l.sold_at, l.reserved_at, l.created_at)
from public.listings l
where l.status in ('sold', 'reserved')
  and not exists (
    select 1 from public.transactions t where t.listing_id = l.id and t.status <> 'cancelled'
  );
