-- 005_forum_categories.sql
-- Community forum categories: a constrained column on forum_posts, a
-- category-aware feed index, and an aggregate count function for the
-- "Browse by category" section. Existing rows land in 'general'.

alter table public.forum_posts
  add column if not exists category text not null default 'general'
  check (category in ('general', 'planting', 'pests', 'harvesting', 'storage', 'quality', 'market'));

create index if not exists forum_posts_category_created_idx
  on public.forum_posts (category, created_at desc);

-- re-categorizing is a content edit; keep it in the "edited" marker
create or replace function public.set_forum_post_edited_at ()
  returns trigger
  language plpgsql
as $$
begin
  if new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.category is distinct from old.category then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- one call returns every visible category's post count; security invoker so
-- the caller's RLS policy (deleted_at is null) applies
create or replace function public.forum_category_counts ()
  returns table (category text, post_count bigint)
  language sql
  stable
  security invoker
  set search_path = public
as $$
  select category, count(*)::bigint as post_count
  from public.forum_posts
  where deleted_at is null
  group by category;
$$;

grant execute on function public.forum_category_counts () to anon, authenticated;
