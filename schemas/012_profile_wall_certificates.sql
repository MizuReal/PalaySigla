-- 012_profile_wall_certificates.sql
-- Profile wall content rework: public certificate images with the final section
-- taxonomy, plus two fixes on top of the applied 011 migration.
--
-- 1. Storage-policy subqueries run as the caller, so 011's avatar wall policy
--    could never match another user's profiles row (profiles is owner-only).
--    The policy is rebuilt on a SECURITY DEFINER helper.
-- 2. Certificate/stub images become publicly readable (signed URLs) for any
--    non-deleted profile, for the display tables only. Supporting documents
--    (profile_documents) stay private forever.
--
-- Taxonomy: credential types become BPI Seed Grower / PhilGAP / SRP
-- verification / RMN seal / Other (legacy PhilRice rows migrate to Other);
-- endorsements gain a type (Barangay Agricultural Certification or
-- Cooperative Recognition).
--
-- The wall no longer gates on verification_status: the badge is an
-- independent trust signal. The wall RPCs therefore stop filtering on it and
-- also stop exposing sensitive identifiers (typed RSBSA number, membership
-- IDs).

-- ---------------------------------------------------------------------------
-- avatar wall read fix
-- ---------------------------------------------------------------------------

create or replace function public.profile_exists (p_user text)
  returns boolean
  language sql
  stable
  security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = p_user
      and p.deleted_at is null
  );
$$;

revoke execute on function public.profile_exists (text) from public;
grant execute on function public.profile_exists (text) to authenticated;

drop policy if exists "avatars_storage_select_authenticated" on storage.objects;
create policy "avatars_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.profile_exists((storage.foldername(name))[1])
  );

-- ---------------------------------------------------------------------------
-- taxonomy: credential + endorsement types
-- ---------------------------------------------------------------------------

update public.profile_credentials
set credential_type = 'other'
where credential_type = 'philrice_training';

alter table public.profile_credentials
  drop constraint if exists profile_credentials_credential_type_check;

alter table public.profile_credentials
  add constraint profile_credentials_credential_type_check
  check (
    credential_type in (
      'bpi_seed_grower',
      'philgap',
      'srp_verification',
      'rmn_seal',
      'other'
    )
  );

alter table public.profile_endorsements
  add column if not exists endorsement_type text not null
    default 'barangay_certification'
    check (endorsement_type in ('barangay_certification', 'coop_recognition'));

-- ---------------------------------------------------------------------------
-- public certificate images
-- ---------------------------------------------------------------------------

create or replace function public.certificate_is_public (p_document_path text)
  returns boolean
  language sql
  stable
  security definer set search_path = public
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.rsbsa_document_path = p_document_path
        and p.deleted_at is null
    )
    or exists (
      select 1 from public.profile_credentials c
      join public.profiles p on p.id = c.user_id
      where c.document_path = p_document_path
        and p.deleted_at is null
    )
    or exists (
      select 1 from public.profile_affiliations a
      join public.profiles p on p.id = a.user_id
      where a.proof_path = p_document_path
        and p.deleted_at is null
    )
    or exists (
      select 1 from public.profile_endorsements e
      join public.profiles p on p.id = e.user_id
      where e.document_path = p_document_path
        and p.deleted_at is null
    );
$$;

revoke execute on function public.certificate_is_public (text) from public;
grant execute on function public.certificate_is_public (text) to authenticated;

drop policy if exists "credentials_storage_select_public_certificates" on storage.objects;
create policy "credentials_storage_select_public_certificates"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'credentials'
    and public.certificate_is_public(name)
  );

-- ---------------------------------------------------------------------------
-- wall RPCs: expose document paths, hide sensitive identifiers
-- (return shape changes require drop + recreate)
-- ---------------------------------------------------------------------------

drop function if exists public.farmer_profile (uuid);
create function public.farmer_profile (p_user uuid)
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
    rsbsa_document_path text,
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
    p.rsbsa_document_path,
    p.verification_status,
    p.created_at,
    p.rating_avg,
    p.rating_count
  from public.profiles p
  where p.id = p_user
    and p.deleted_at is null;
$$;

drop function if exists public.farmer_credentials (uuid);
create function public.farmer_credentials (p_user uuid)
  returns table (
    id uuid,
    credential_type text,
    issuing_organization text,
    certificate_number text,
    document_path text,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    c.id,
    c.credential_type,
    c.issuing_organization,
    c.certificate_number,
    c.document_path,
    c.created_at
  from public.profile_credentials c
  join public.profiles p on p.id = c.user_id
  where c.user_id = p_user
    and p.deleted_at is null
  order by c.created_at desc;
$$;

drop function if exists public.farmer_affiliations (uuid);
create function public.farmer_affiliations (p_user uuid)
  returns table (
    id uuid,
    organization_name text,
    proof_path text,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    a.id,
    a.organization_name,
    a.proof_path,
    a.created_at
  from public.profile_affiliations a
  join public.profiles p on p.id = a.user_id
  where a.user_id = p_user
    and p.deleted_at is null
  order by a.created_at desc;
$$;

drop function if exists public.farmer_endorsements (uuid);
create function public.farmer_endorsements (p_user uuid)
  returns table (
    id uuid,
    endorsement_type text,
    municipality text,
    issuing_office text,
    date_issued date,
    document_path text,
    created_at timestamptz
  )
  language sql
  stable
  security definer set search_path = public
as $$
  select
    e.id,
    e.endorsement_type,
    e.municipality,
    e.issuing_office,
    e.date_issued,
    e.document_path,
    e.created_at
  from public.profile_endorsements e
  join public.profiles p on p.id = e.user_id
  where e.user_id = p_user
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
