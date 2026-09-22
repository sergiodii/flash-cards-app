-- =============================================================================
-- Flash Cards App :: user-private card tags
--
-- Cards are global content, so `flashcards.tags` is shared by every user. This
-- adds a per-user tagging layer: a user can attach their own tags to any global
-- card without affecting anyone else.
--   * user_flashcard_tags -> (user_id, flashcard_id, tag), private to the owner
--   * next_flashcards     -> the tag filter also matches the caller's own tags
--   * get_flashcard_stats -> the per-tag breakdown includes the caller's own tags
--
-- Tags are normalized (trimmed + lowercased) and scoped to auth.uid() by RLS.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
create table public.user_flashcard_tags (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  tag text not null check (
    tag = lower(btrim(tag))
    and char_length(tag) between 1 and 40
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, flashcard_id, tag)
);

comment on table public.user_flashcard_tags is
  'Per-user tags attached to a global card. Private: only the owner can read or change them.';

create index user_flashcard_tags_tag_idx
  on public.user_flashcard_tags (user_id, tag);
create index user_flashcard_tags_flashcard_idx
  on public.user_flashcard_tags (flashcard_id);

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
alter table public.user_flashcard_tags enable row level security;

create policy "user_flashcard_tags_select_own"
  on public.user_flashcard_tags
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_flashcard_tags_insert_own"
  on public.user_flashcard_tags
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_flashcard_tags_delete_own"
  on public.user_flashcard_tags
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Weighted card selection: tag filter also matches the caller's own tags
-- ----------------------------------------------------------------------------
drop function if exists public.next_flashcards(integer, text[], boolean);

create function public.next_flashcards(
  p_limit integer default 20,
  p_tags text[] default '{}',
  p_only_mine boolean default false
)
returns setof public.flashcards
language sql
volatile
as $$
  select f.*
  from public.flashcards f
  left join public.user_flashcards uf
    on uf.flashcard_id = f.id
   and uf.user_id = auth.uid()
  where f.deleted_at is null
    and (
      coalesce(cardinality(p_tags), 0) = 0
      or f.tags && p_tags
      or exists (
        select 1
        from public.user_flashcard_tags t
        where t.flashcard_id = f.id
          and t.user_id = auth.uid()
          and t.tag = any(p_tags)
      )
    )
    and (
      not coalesce(p_only_mine, false)
      or f.created_by = auth.uid()
    )
  order by
    -ln(1 - random()) / public.flashcard_weight(
      coalesce(uf.left_count, 0),
      coalesce(uf.right_count, 0)
    ),
    f.id
  limit greatest(coalesce(p_limit, 20), 1);
$$;

comment on function public.next_flashcards(integer, text[], boolean) is
  'Returns global cards ordered by weighted random sampling using the caller''s own counters. p_tags matches global tags and the caller''s private tags; p_only_mine limits to cards created by the caller.';

-- ----------------------------------------------------------------------------
-- Progress metrics: per-tag breakdown includes the caller's own tags
-- ----------------------------------------------------------------------------
drop function if exists public.get_flashcard_stats(boolean);

create function public.get_flashcard_stats(
  p_only_mine boolean default false
)
returns jsonb
language sql
stable
as $$
  with base as (
    select
      (
        select array_agg(distinct t)
        from unnest(
          f.tags || coalesce(ut.tags, '{}'::text[])
        ) as t
      ) as tags,
      coalesce(uf.left_count, 0) as left_count,
      coalesce(uf.right_count, 0) as right_count,
      coalesce(uf.seen_count, 0) as seen_count
    from public.flashcards f
    left join public.user_flashcards uf
      on uf.flashcard_id = f.id
     and uf.user_id = auth.uid()
    left join lateral (
      select array_agg(t.tag) as tags
      from public.user_flashcard_tags t
      where t.flashcard_id = f.id
        and t.user_id = auth.uid()
    ) ut on true
    where f.deleted_at is null
      and (
        not coalesce(p_only_mine, false)
        or f.created_by = auth.uid()
      )
  ),
  cards as (
    select
      coalesce(tags, '{}'::text[]) as tags,
      left_count,
      right_count,
      seen_count,
      case
        when seen_count = 0 then 'new'
        when left_count > right_count then 'struggling'
        when right_count > left_count then 'learned'
        else 'neutral'
      end as status
    from base
  ),
  totals as (
    select
      count(*)::int as total,
      count(*) filter (where status = 'new')::int as new_count,
      count(*) filter (where status = 'struggling')::int as struggling_count,
      count(*) filter (where status = 'learned')::int as learned_count,
      count(*) filter (where status = 'neutral')::int as neutral_count,
      coalesce(sum(left_count), 0)::int as left_count,
      coalesce(sum(right_count), 0)::int as right_count,
      coalesce(sum(seen_count), 0)::int as seen_count
    from cards
  ),
  tag_rows as (
    select
      t.tag,
      count(*)::int as total,
      count(*) filter (where c.status = 'new')::int as new_count,
      count(*) filter (where c.status = 'struggling')::int as struggling_count,
      count(*) filter (where c.status = 'learned')::int as learned_count,
      count(*) filter (where c.status = 'neutral')::int as neutral_count,
      coalesce(sum(c.left_count), 0)::int as left_count,
      coalesce(sum(c.right_count), 0)::int as right_count,
      coalesce(sum(c.seen_count), 0)::int as seen_count
    from cards c
    cross join lateral unnest(c.tags) as t(tag)
    group by t.tag
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(t) from totals t),
    'tags', coalesce(
      (select jsonb_agg(to_jsonb(tr) order by tr.total desc, tr.tag) from tag_rows tr),
      '[]'::jsonb
    )
  );
$$;

comment on function public.get_flashcard_stats(boolean) is
  'Aggregated progress for the current user over the global deck, including the caller''s private tags. When p_only_mine is true, only cards created by the caller are counted.';

-- ----------------------------------------------------------------------------
-- Grants: authenticated only
-- ----------------------------------------------------------------------------
revoke all on public.user_flashcard_tags from anon;
grant all on public.user_flashcard_tags to authenticated;

revoke all on function public.next_flashcards(integer, text[], boolean)
  from public, anon;
grant execute on function public.next_flashcards(integer, text[], boolean)
  to authenticated;

revoke execute on function public.get_flashcard_stats(boolean)
  from public, anon;
grant execute on function public.get_flashcard_stats(boolean)
  to authenticated;