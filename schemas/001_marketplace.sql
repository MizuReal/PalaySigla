-- 001_marketplace.sql
-- Marketplace: farmer listings with location and photo.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 2000),
  price numeric(12, 2) check (price >= 0),
  unit text not null check (unit in ('kg', 'sack', 'cavan', 'lot')),
  category text not null check (category in ('palay', 'rice', 'seeds', 'machinery', 'other')),
  quantity numeric(12, 2) check (quantity >= 0),
  lat double precision not null,
  lng double precision not null,
  location_label text not null,
  seller_name text not null,
  status text not null default 'active' check (status in ('active', 'sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, position)
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_user_idx on public.listings (user_id);
create index if not exists listings_location_idx on public.listings (lat, lng);

-- updated_at maintenance
create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row
  execute function public.set_updated_at ();

-- private storage bucket for listing photos
insert into storage.buckets (id, name, public)
values ('listings', 'listings', false)
on conflict (id) do nothing;

-- RLS on all tables
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- listings: everyone reads visible rows, owners write their own
create policy "listings_select_visible"
  on public.listings
  for select
  using (deleted_at is null);

create policy "listings_insert_own"
  on public.listings
  for insert
  with check (auth.uid() = user_id);

create policy "listings_update_own"
  on public.listings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- listing_images: everyone reads, owners of the listing write
create policy "listing_images_select_all"
  on public.listing_images
  for select
  using (true);

create policy "listing_images_insert_own"
  on public.listing_images
  for insert
  with check (
    exists (
      select 1
      from public.listings
      where listings.id = listing_images.listing_id
        and listings.user_id = auth.uid()
    )
  );

create policy "listing_images_update_own"
  on public.listing_images
  for update
  using (
    exists (
      select 1
      from public.listings
      where listings.id = listing_images.listing_id
        and listings.user_id = auth.uid()
    )
  );

create policy "listing_images_delete_own"
  on public.listing_images
  for delete
  using (
    exists (
      select 1
      from public.listings
      where listings.id = listing_images.listing_id
        and listings.user_id = auth.uid()
    )
  );

-- storage: everyone reads listing photos, owners write under their uid path
create policy "listings_storage_select_all"
  on storage.objects
  for select
  using (bucket_id = 'listings');

create policy "listings_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listings_storage_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listings_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
