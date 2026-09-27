-- 008_listing_transactions.sql
-- Transaction states for marketplace listings: reserve for a buyer and mark
-- sold to a buyer (both chosen from the listing's conversations), plus a
-- terminal sold state. Reviews reference the sold transaction (009).
--
-- Status model: active -> reserved -> sold. Reserving and selling both clear
-- the opposite target columns so a listing never carries contradictory state.
-- A sold listing is final: the status and its sold_to target are immutable.

alter table public.listings
  add column if not exists reserved_at timestamptz,
  add column if not exists reserved_for uuid references auth.users (id) on delete set null,
  add column if not exists reserved_for_name text check (
    reserved_for_name is null or char_length(reserved_for_name) <= 254
  ),
  add column if not exists sold_to uuid references auth.users (id) on delete set null,
  add column if not exists sold_to_name text check (
    sold_to_name is null or char_length(sold_to_name) <= 254
  );

-- the v1 CHECK only allowed active/sold; reserved joins the set
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('active', 'reserved', 'sold'));

create index if not exists listings_sold_to_idx on public.listings (sold_to);
create index if not exists listings_reserved_for_idx on public.listings (reserved_for);

-- transaction state machine. Replaces the 003 sold_at-only trigger: the
-- reserved/sold transitions own reserved_at/sold_at and the target columns,
-- and a sold listing cannot leave the sold state or be re-pointed.
create or replace function public.set_listing_transaction_state ()
  returns trigger
  language plpgsql
as $$
begin
  if old.status = 'sold' then
    if new.status is distinct from 'sold' then
      raise exception 'A sold listing is final and cannot change status';
    end if;
    -- sold_to is frozen once set; only unrelated columns may be updated
    new.sold_to = old.sold_to;
    new.sold_to_name = old.sold_to_name;
    new.sold_at = old.sold_at;
    return new;
  end if;

  if new.status = 'sold' then
    if old.status is distinct from 'sold' then
      new.sold_at = now();
    end if;
    -- the buyer supersedes any hold
    new.reserved_at = null;
    new.reserved_for = null;
    new.reserved_for_name = null;
  elsif new.status = 'reserved' then
    if old.status is distinct from 'reserved' then
      new.reserved_at = now();
    end if;
    new.sold_at = null;
    new.sold_to = null;
    new.sold_to_name = null;
  else
    -- active: release both states
    new.sold_at = null;
    new.sold_to = null;
    new.sold_to_name = null;
    new.reserved_at = null;
    new.reserved_for = null;
    new.reserved_for_name = null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_sold_at on public.listings;
drop trigger if exists listings_set_transaction_state on public.listings;
create trigger listings_set_transaction_state
  before update on public.listings
  for each row
  execute function public.set_listing_transaction_state ();
