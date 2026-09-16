-- 004_forum.sql
-- Community forum: discussion posts, flat comment threads, heart reactions.
-- Author names are snapshotted at write time because profiles and the avatars
-- bucket are owner-read-only under RLS (same reason listings carry seller_name).

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- the display name can fall back to the account email, so the bound is
  -- generous rather than the 60-char profile-name limit
  author_name text not null check (char_length(author_name) between 1 and 254),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  heart_count integer not null default 0 check (heart_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 254),
  body text not null check (char_length(body) between 1 and 2000),
  heart_count integer not null default 0 check (heart_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

-- one heart per user per target; exactly one of post_id / comment_id is set
create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.forum_posts (id) on delete cascade,
  comment_id uuid references public.forum_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);

create index if not exists forum_posts_created_idx on public.forum_posts (created_at desc);
create index if not exists forum_comments_post_created_idx on public.forum_comments (post_id, created_at);
create unique index if not exists forum_reactions_post_user_idx
  on public.forum_reactions (post_id, user_id) where post_id is not null;
create unique index if not exists forum_reactions_comment_user_idx
  on public.forum_reactions (comment_id, user_id) where comment_id is not null;

-- content edits only: counter updates from reactions/comments must not mark a
-- post as edited
create or replace function public.set_forum_post_edited_at ()
  returns trigger
  language plpgsql
as $$
begin
  if new.title is distinct from old.title or new.body is distinct from old.body then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_set_edited_at on public.forum_posts;
create trigger forum_posts_set_edited_at
  before update on public.forum_posts
  for each row
  execute function public.set_forum_post_edited_at ();

create or replace function public.set_forum_comment_edited_at ()
  returns trigger
  language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists forum_comments_set_edited_at on public.forum_comments;
create trigger forum_comments_set_edited_at
  before update on public.forum_comments
  for each row
  execute function public.set_forum_comment_edited_at ();

-- denormalized heart counters: security definer so the reacting user's
-- privileges never block the counter write on another user's row
create or replace function public.sync_forum_heart_count ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if tg_op = 'DELETE' then
    if old.comment_id is null then
      update public.forum_posts set heart_count = heart_count + delta where id = old.post_id;
    else
      update public.forum_comments set heart_count = heart_count + delta where id = old.comment_id;
    end if;
    return old;
  end if;
  if new.comment_id is null then
    update public.forum_posts set heart_count = heart_count + delta where id = new.post_id;
  else
    update public.forum_comments set heart_count = heart_count + delta where id = new.comment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_reactions_sync_count on public.forum_reactions;
create trigger forum_reactions_sync_count
  after insert or delete on public.forum_reactions
  for each row
  execute function public.sync_forum_heart_count ();

-- comment counter follows visible (non soft-deleted) comments only; cascade
-- deletes from a removed post update a row that is already gone, a no-op
create or replace function public.sync_forum_comment_count ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.forum_posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.forum_posts set comment_count = comment_count - 1 where id = old.post_id;
    end if;
    return new;
  end if;
  if old.deleted_at is null then
    update public.forum_posts set comment_count = comment_count - 1 where id = old.post_id;
  end if;
  return old;
end;
$$;

drop trigger if exists forum_comments_sync_count on public.forum_comments;
create trigger forum_comments_sync_count
  after insert or update of deleted_at or delete on public.forum_comments
  for each row
  execute function public.sync_forum_comment_count ();

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_reactions enable row level security;

-- posts and comments: public read of visible rows, owners write their own.
-- no delete policies: removal is always a soft delete via update
create policy "forum_posts_select_visible"
  on public.forum_posts
  for select
  using (deleted_at is null);

create policy "forum_posts_insert_own"
  on public.forum_posts
  for insert
  with check (auth.uid() = user_id);

create policy "forum_posts_update_own"
  on public.forum_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "forum_comments_select_visible"
  on public.forum_comments
  for select
  using (deleted_at is null);

create policy "forum_comments_insert_own"
  on public.forum_comments
  for insert
  with check (auth.uid() = user_id);

create policy "forum_comments_update_own"
  on public.forum_comments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- reactions: public counts, owners add and remove their own heart
create policy "forum_reactions_select_all"
  on public.forum_reactions
  for select
  using (true);

create policy "forum_reactions_insert_own"
  on public.forum_reactions
  for insert
  with check (auth.uid() = user_id);

create policy "forum_reactions_delete_own"
  on public.forum_reactions
  for delete
  using (auth.uid() = user_id);
