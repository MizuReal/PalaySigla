-- 010_reviews.sql
-- Mutual marketplace reviews, anchored to a sold transaction so a review
-- survives the listing leaving the feed or being soft-deleted. Each party may
-- review the other exactly once per transaction; the buyer reviews the seller
-- and the seller reviews the buyer.
--
-- Reviews are public (a marketplace reputation signal). Writes are limited to
-- a party of a sold transaction via RLS; reviews are append-only (no update or
-- delete policies). An aggregate trigger maintains profiles.rating_avg/count.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  listing_title text not null check (char_length(listing_title) between 1 and 120),
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 254),
  reviewee_id uuid not null references auth.users (id) on delete cascade,
  reviewee_name text not null check (char_length(reviewee_name) between 1 and 254),
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (transaction_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_idx
  on public.reviews (reviewee_id, created_at desc);
create index if not exists reviews_transaction_idx
  on public.reviews (transaction_id);

alter table public.reviews enable row level security;

-- reviews are a public reputation signal
create policy "reviews_select_public"
  on public.reviews
  for select
  using (true);

-- only a party of a sold transaction may review, and only the counterparty of
-- that transaction. the reviewer-role and counterparty checks keep a client
-- from naming an arbitrary reviewee; transactions participant RLS makes the
-- subquery readable by the reviewer.
create policy "reviews_insert_party"
  on public.reviews
  for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewee_id
    and exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and t.status = 'sold'
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
        and reviewee_id = case
          when t.buyer_id = auth.uid() then t.seller_id else t.buyer_id
        end
        and reviewer_role = case
          when t.buyer_id = auth.uid() then 'buyer' else 'seller'
        end
    )
  );

-- profile rating aggregates follow the public reviews; security definer so the
-- reviewer never needs write access to the reviewee's profile row
create or replace function public.sync_profile_rating ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.reviewee_id, old.reviewee_id);
  update public.profiles p
  set
    rating_avg = coalesce(
      (select round(avg(rating)::numeric, 1) from public.reviews where reviewee_id = target),
      0
    ),
    rating_count = (
      select count(*) from public.reviews where reviewee_id = target
    )
  where p.id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_sync_profile_rating on public.reviews;
create trigger reviews_sync_profile_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.sync_profile_rating ();

-- public-safe rating summary for a user (profiles themselves are owner-only);
-- exposes only the aggregate, never the profile row
create or replace function public.user_rating (p_user uuid)
  returns table (rating_avg numeric, rating_count integer)
  language sql
  stable
  security definer set search_path = public
as $$
  select p.rating_avg, p.rating_count
  from public.profiles p
  where p.id = p_user and p.deleted_at is null;
$$;

grant execute on function public.user_rating (uuid) to anon, authenticated;
