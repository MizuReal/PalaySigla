-- 003_listing_history.sql
-- Selling history: sold timestamp + owner visibility into soft-deleted rows.

alter table public.listings
  add column if not exists sold_at timestamptz;

-- stamp/clear sold_at only on a real status transition
create or replace function public.set_listing_sold_at ()
  returns trigger
  language plpgsql
as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at = now();
  elsif new.status = 'active' and old.status is distinct from 'active' then
    new.sold_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_sold_at on public.listings;
create trigger listings_set_sold_at
  before update on public.listings
  for each row
  execute function public.set_listing_sold_at ();

-- best available proxy for rows sold before this column existed
update public.listings
set sold_at = coalesce(updated_at, created_at)
where status = 'sold' and sold_at is null;

create index if not exists listings_user_created_idx
  on public.listings (user_id, created_at desc);

-- owners keep read access to their own rows after a soft delete
create policy "listings_select_own"
  on public.listings
  for select
  using (auth.uid() = user_id);
