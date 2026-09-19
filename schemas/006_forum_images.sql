-- 006_forum_images.sql
-- Forum post photos: same private-bucket + signed-URL model as marketplace
-- listings. Images are optional; position preserves thumbnail order.

create table if not exists public.forum_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create index if not exists forum_images_post_idx on public.forum_images (post_id);
-- serves the visibility join in the storage select policy
create index if not exists forum_images_storage_path_idx on public.forum_images (storage_path);

-- private storage bucket for forum photos
insert into storage.buckets (id, name, public)
values ('forum', 'forum', false)
on conflict (id) do nothing;

alter table public.forum_images enable row level security;

-- rows: photos of visible posts are readable by everyone; only the post owner writes
create policy "forum_images_select_visible"
  on public.forum_images
  for select
  using (
    exists (
      select 1
      from public.forum_posts
      where forum_posts.id = forum_images.post_id
        and forum_posts.deleted_at is null
    )
  );

create policy "forum_images_insert_own"
  on public.forum_images
  for insert
  with check (
    exists (
      select 1
      from public.forum_posts
      where forum_posts.id = forum_images.post_id
        and forum_posts.user_id = auth.uid()
    )
  );

create policy "forum_images_update_own"
  on public.forum_images
  for update
  using (
    exists (
      select 1
      from public.forum_posts
      where forum_posts.id = forum_images.post_id
        and forum_posts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.forum_posts
      where forum_posts.id = forum_images.post_id
        and forum_posts.user_id = auth.uid()
    )
  );

create policy "forum_images_delete_own"
  on public.forum_images
  for delete
  using (
    exists (
      select 1
      from public.forum_posts
      where forum_posts.id = forum_images.post_id
        and forum_posts.user_id = auth.uid()
    )
  );

-- storage: visitors can sign URLs only for photos of visible posts; owners
-- write and delete under their uid-prefixed path
create policy "forum_storage_select_visible"
  on storage.objects
  for select
  using (
    bucket_id = 'forum'
    and exists (
      select 1
      from public.forum_images
      join public.forum_posts on forum_posts.id = forum_images.post_id
      where forum_images.storage_path = storage.objects.name
        and forum_posts.deleted_at is null
    )
  );

create policy "forum_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'forum'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "forum_storage_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'forum'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "forum_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'forum'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
