-- 011_farmer_verification.sql
-- Farmer profile wall + verification credentials. Extends profiles with
-- location/farming details and a verification state machine, and adds the
-- four record types a farmer submits for review: PhilRice/BPI credentials,
-- FCA/cooperative affiliations, LGU/MAO endorsements, and general supporting
-- documents.
--
-- Documents are private: owners read and write their own records under RLS,
-- while reviewers use the service role (dashboard / SQL editor). The public
-- wall reads a sanitized subset through security definer RPCs, only after
-- staff mark the profile 'verified'. Phone numbers are never exposed.
--
-- Verification is a staff decision. Row-level policies alone would let an
-- owner update any column of their own row, so the verification columns are
-- additionally protected with column-level privileges below.

alter table public.profiles
  add column if not exists barangay text
    check (barangay is null or char_length(barangay) <= 80),
  add column if not exists municipality text
    check (municipality is null or char_length(municipality) <= 80),
  add column if not exists province text
    check (province is null or char_length(province) <= 80),
  add column if not exists farm_size_hectares numeric(8, 2)
    check (
      farm_size_hectares is null
      or (farm_size_hectares >= 0 and farm_size_hectares <= 100000)
    ),
  add column if not exists years_farming_experience smallint
    check (
      years_farming_experience is null
      or years_farming_experience between 0 and 100
    ),
  add column if not exists rice_varieties text[] not null default '{}'
    check (coalesce(array_length(rice_varieties, 1), 0) <= 24),
  add column if not exists rsbsa_number text
    check (
      rsbsa_number is null
      or rsbsa_number ~ '^RSBSA-[0-9]{2}-[0-9]{6}-[0-9]{4}$'
    ),
  add column if not exists rsbsa_document_path text
    check (
      rsbsa_document_path is null
      or char_length(rsbsa_document_path) <= 255
    ),
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified')),
  add column if not exists verified_at timestamptz;

-- an RSBSA number identifies exactly one farmer
create unique index if not exists profiles_rsbsa_number_key
  on public.profiles (upper(rsbsa_number))
  where rsbsa_number is not null;

-- clients may never grant themselves verification or forge rating aggregates
revoke insert (verification_status, verified_at, rating_avg, rating_count)
  on public.profiles from anon, authenticated;
revoke update (verification_status, verified_at, rating_avg, rating_count)
  on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
-- verification records
-- ---------------------------------------------------------------------------

create table if not exists public.profile_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_type text not null
    check (credential_type in ('philrice_training', 'bpi_seed_grower', 'other')),
  issuing_organization text not null
    check (char_length(issuing_organization) between 1 and 120),
  certificate_number text
    check (
      certificate_number is null
      or char_length(certificate_number) <= 60
    ),
  document_path text not null
    check (char_length(document_path) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, document_path)
);

create table if not exists public.profile_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_name text not null
    check (char_length(organization_name) between 1 and 160),
  membership_id text
    check (membership_id is null or char_length(membership_id) <= 60),
  proof_path text not null
    check (char_length(proof_path) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, proof_path)
);

create table if not exists public.profile_endorsements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  municipality text not null
    check (char_length(municipality) between 1 and 80),
  issuing_office text not null
    check (char_length(issuing_office) between 1 and 120),
  date_issued date not null,
  document_path text not null
    check (char_length(document_path) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, document_path)
);

create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  document_path text not null
    check (char_length(document_path) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, document_path)
);

create index if not exists profile_credentials_user_idx
  on public.profile_credentials (user_id, created_at desc);
create index if not exists profile_affiliations_user_idx
  on public.profile_affiliations (user_id, created_at desc);
create index if not exists profile_endorsements_user_idx
  on public.profile_endorsements (user_id, created_at desc);
create index if not exists profile_documents_user_idx
  on public.profile_documents (user_id, created_at desc);

drop trigger if exists profile_credentials_set_updated_at on public.profile_credentials;
create trigger profile_credentials_set_updated_at
  before update on public.profile_credentials
  for each row
  execute function public.set_updated_at ();

drop trigger if exists profile_affiliations_set_updated_at on public.profile_affiliations;
create trigger profile_affiliations_set_updated_at
  before update on public.profile_affiliations
  for each row
  execute function public.set_updated_at ();

drop trigger if exists profile_endorsements_set_updated_at on public.profile_endorsements;
create trigger profile_endorsements_set_updated_at
  before update on public.profile_endorsements
  for each row
  execute function public.set_updated_at ();

drop trigger if exists profile_documents_set_updated_at on public.profile_documents;
create trigger profile_documents_set_updated_at
  before update on public.profile_documents
  for each row
  execute function public.set_updated_at ();

-- first submission moves an unverified profile to pending; a profile staff
-- already verified stays verified until a reviewer changes it back
create or replace function public.mark_profile_pending_verification ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  update public.profiles p
  set verification_status = 'pending'
  where p.id = coalesce(new.user_id, old.user_id)
    and p.verification_status = 'unverified';
  return coalesce(new, old);
end;
$$;

drop trigger if exists profile_credentials_mark_pending on public.profile_credentials;
create trigger profile_credentials_mark_pending
  after insert or update or delete on public.profile_credentials
  for each row
  execute function public.mark_profile_pending_verification ();

drop trigger if exists profile_affiliations_mark_pending on public.profile_affiliations;
create trigger profile_affiliations_mark_pending
  after insert or update or delete on public.profile_affiliations
  for each row
  execute function public.mark_profile_pending_verification ();

drop trigger if exists profile_endorsements_mark_pending on public.profile_endorsements;
create trigger profile_endorsements_mark_pending
  after insert or update or delete on public.profile_endorsements
  for each row
  execute function public.mark_profile_pending_verification ();

drop trigger if exists profile_documents_mark_pending on public.profile_documents;
create trigger profile_documents_mark_pending
  after insert or update or delete on public.profile_documents
  for each row
  execute function public.mark_profile_pending_verification ();

-- RLS: owners manage their records until staff verify the profile; a verified
-- record set is locked so its evidence cannot be swapped after the fact
-- (staff unlock corrections by setting the profile back to 'unverified')
alter table public.profile_credentials enable row level security;
alter table public.profile_affiliations enable row level security;
alter table public.profile_endorsements enable row level security;
alter table public.profile_documents enable row level security;

create policy "profile_credentials_select_own"
  on public.profile_credentials
  for select
  using (auth.uid() = user_id);

create policy "profile_credentials_insert_own"
  on public.profile_credentials
  for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_credentials_update_own"
  on public.profile_credentials
  for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  )
  with check (auth.uid() = user_id);

create policy "profile_credentials_delete_own"
  on public.profile_credentials
  for delete
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_affiliations_select_own"
  on public.profile_affiliations
  for select
  using (auth.uid() = user_id);

create policy "profile_affiliations_insert_own"
  on public.profile_affiliations
  for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_affiliations_update_own"
  on public.profile_affiliations
  for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  )
  with check (auth.uid() = user_id);

create policy "profile_affiliations_delete_own"
  on public.profile_affiliations
  for delete
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_endorsements_select_own"
  on public.profile_endorsements
  for select
  using (auth.uid() = user_id);

create policy "profile_endorsements_insert_own"
  on public.profile_endorsements
  for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_endorsements_update_own"
  on public.profile_endorsements
  for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  )
  with check (auth.uid() = user_id);

create policy "profile_endorsements_delete_own"
  on public.profile_endorsements
  for delete
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_documents_select_own"
  on public.profile_documents
  for select
  using (auth.uid() = user_id);

create policy "profile_documents_insert_own"
  on public.profile_documents
  for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

create policy "profile_documents_update_own"
  on public.profile_documents
  for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  )
  with check (auth.uid() = user_id);

create policy "profile_documents_delete_own"
  on public.profile_documents
  for delete
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verification_status = 'verified'
    )
  );

-- private bucket for verification documents; reviewers read through the
-- service role, never through the client
insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

create policy "credentials_storage_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "credentials_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "credentials_storage_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "credentials_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- the profile wall shows a farmer's avatar to any signed-in viewer; avatars
-- stay private to anonymous visitors
drop policy if exists "avatars_storage_select_authenticated" on storage.objects;
create policy "avatars_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- public-safe reads
-- ---------------------------------------------------------------------------

create or replace function public.farmer_profile (p_user uuid)
  returns table (
    id uuid,
    full_name text,
    avatar_path text,
    barangay text,
    municipality text,
    province text,
    farm_size_hectares numeric,
    years_farming_experience smallint,
    rice_varieties text[],
    rsbsa_number text,
    verification_status text,
    created_at timestamptz,
    rating_avg numeric,
    rating_count integer
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_path,
    p.barangay,
    p.municipality,
    p.province,
    p.farm_size_hectares,
    p.years_farming_experience,
    p.rice_varieties,
    p.rsbsa_number,
    p.verification_status,
    p.created_at,
    p.rating_avg,
    p.rating_count
  from public.profiles p
  where p.id = p_user
    and p.deleted_at is null;
$$;

create or replace function public.farmer_credentials (p_user uuid)
  returns table (
    credential_type text,
    issuing_organization text,
    certificate_number text,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    c.credential_type,
    c.issuing_organization,
    c.certificate_number,
    c.created_at
  from public.profile_credentials c
  join public.profiles p on p.id = c.user_id
  where c.user_id = p_user
    and p.verification_status = 'verified'
    and p.deleted_at is null
  order by c.created_at desc;
$$;

create or replace function public.farmer_affiliations (p_user uuid)
  returns table (
    organization_name text,
    membership_id text,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    a.organization_name,
    a.membership_id,
    a.created_at
  from public.profile_affiliations a
  join public.profiles p on p.id = a.user_id
  where a.user_id = p_user
    and p.verification_status = 'verified'
    and p.deleted_at is null
  order by a.created_at desc;
$$;

create or replace function public.farmer_endorsements (p_user uuid)
  returns table (
    municipality text,
    issuing_office text,
    date_issued date,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    e.municipality,
    e.issuing_office,
    e.date_issued,
    e.created_at
  from public.profile_endorsements e
  join public.profiles p on p.id = e.user_id
  where e.user_id = p_user
    and p.verification_status = 'verified'
    and p.deleted_at is null
  order by e.created_at desc;
$$;

-- the wall is a signed-in surface; anonymous visitors use the sign-in prompt
revoke execute on function public.farmer_profile (uuid) from public;
revoke execute on function public.farmer_credentials (uuid) from public;
revoke execute on function public.farmer_affiliations (uuid) from public;
revoke execute on function public.farmer_endorsements (uuid) from public;

grant execute on function public.farmer_profile (uuid) to authenticated;
grant execute on function public.farmer_credentials (uuid) to authenticated;
grant execute on function public.farmer_affiliations (uuid) to authenticated;
grant execute on function public.farmer_endorsements (uuid) to authenticated;
