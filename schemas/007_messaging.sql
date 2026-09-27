-- 007_messaging.sql
-- Listing-scoped buyer/seller conversations with realtime message delivery.
-- One thread per (listing, buyer); the seller is the listing owner. Names are
-- snapshotted at creation because profiles and the avatars bucket are
-- owner-read-only under RLS (same reason listings carry seller_name and forum
-- posts carry author_name).
--
-- Messages are an append-only, immutable log: there are deliberately no
-- update or delete policies. Read state lives on the conversation as a
-- per-party watermark, and last-message summary columns are denormalized for
-- the inbox list (kept current by a security definer trigger).

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- the listing is the thread's subject; on a hard delete (not done by the app)
  -- the conversation survives with its snapshotted title
  listing_id uuid references public.listings (id) on delete set null,
  listing_title text not null check (char_length(listing_title) between 1 and 120),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  buyer_name text not null check (char_length(buyer_name) between 1 and 254),
  seller_name text not null check (char_length(seller_name) between 1 and 254),
  last_message_at timestamptz,
  last_message_preview text check (
    last_message_preview is null or char_length(last_message_preview) <= 140
  ),
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- one thread per buyer per listing; Postgres treats null listing_ids as
-- distinct, which is fine for threads orphaned by a hard listing delete
create unique index if not exists conversations_listing_buyer_idx
  on public.conversations (listing_id, buyer_id);

create index if not exists conversations_buyer_recent_idx
  on public.conversations (buyer_id, last_message_at desc);

create index if not exists conversations_seller_recent_idx
  on public.conversations (seller_id, last_message_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- the participant-scoped update policy (below) cannot restrict columns, so a
-- trigger pins the thread identity: participants may only move the read
-- watermarks, never re-point a conversation at another listing or user
create or replace function public.freeze_conversation_identity ()
  returns trigger
  language plpgsql
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.listing_title is distinct from old.listing_title
    or new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.buyer_name is distinct from old.buyer_name
    or new.seller_name is distinct from old.seller_name then
    raise exception 'Conversation participants and listing are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_freeze_identity on public.conversations;
create trigger conversations_freeze_identity
  before update on public.conversations
  for each row
  execute function public.freeze_conversation_identity ();

-- inbox summary columns follow every new message; security definer so the
-- sender's privileges never block the write on another participant's row
create or replace function public.sync_conversation_last_message ()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_sync_conversation on public.messages;
create trigger messages_sync_conversation
  after insert on public.messages
  for each row
  execute function public.sync_conversation_last_message ();

-- per-conversation unread count for the signed-in participant: messages from
-- the other party newer than the reader's own watermark. security invoker, so
-- the caller's row policies still apply (mirrors forum_category_counts()).
create or replace function public.unread_message_counts ()
  returns table (conversation_id uuid, unread_count bigint)
  language sql
  stable
  security invoker
  set search_path = public
as $$
  select
    c.id as conversation_id,
    count(m.id) as unread_count
  from public.conversations c
  left join public.messages m
    on m.conversation_id = c.id
   and m.sender_id <> auth.uid()
   and m.created_at > coalesce(
     case when c.buyer_id = auth.uid() then c.buyer_last_read_at
          else c.seller_last_read_at
     end,
     to_timestamp(0)
   )
  where c.buyer_id = auth.uid() or c.seller_id = auth.uid()
  group by c.id;
$$;

grant execute on function public.unread_message_counts () to anon, authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- conversations: only the two participants can read or update them. the buyer
-- opens the thread against an active listing they do not own; seller_id is
-- derived from the listing, never trusted from the client.
create policy "conversations_select_participant"
  on public.conversations
  for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_insert_buyer"
  on public.conversations
  for insert
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.user_id = seller_id
        and l.deleted_at is null
    )
  );

-- participants update only their own read watermark; column-level shaping is
-- not expressible in RLS, so the service writes only that column
create policy "conversations_update_participant"
  on public.conversations
  for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- messages: participants read the thread; a message may only be inserted by its
-- own sender into a conversation they belong to. no update/delete policies:
-- the log is append-only.
create policy "messages_select_participant"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "messages_insert_sender"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- realtime: both tables join the publication so clients can subscribe to
-- inbox changes and per-thread inserts. replica identity full keeps the
-- filter columns (conversation_id, buyer_id, seller_id) in change payloads.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.conversations';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end;
$$;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
