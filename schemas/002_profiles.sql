-- 002_profiles.sql
-- User profiles: display identity (name, PH contact number, avatar) plus
-- rating aggregates reserved for marketplace reviews (placeholder columns;
-- a future reviews table populates them).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 60),
  phone text check (phone is null or phone ~ '^\+63[0-9]{10}$'),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 255),
  rating_avg numeric(2, 1) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

-- new signups get a profile row immediately; name mirrors the metadata the
-- registration form collects (existing users self-heal via upsert on save)
create or replace function public.handle_new_user_profile ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile ();

create index if not exists profiles_created_idx on public.profiles (created_at desc);

-- updated_at maintenance reuses the shared trigger function from 001
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at ();

-- private storage bucket for avatar photos
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- RLS on the profiles table
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id and deleted_at is null);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- storage: owners read and write avatars under their own uid path
create policy "avatars_storage_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
