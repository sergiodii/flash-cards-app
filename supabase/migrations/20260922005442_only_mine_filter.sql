-- =============================================================================
-- Flash Cards App :: "only my cards" study filter
--
-- Cards are global content; `flashcards.created_by` already records the author
-- (null for the seeded starter deck). This migration exposes that as a per-user
-- study preference instead of adding a redundant column:
--   * study_preferences.only_mine -> the user's saved choice
--   * next_flashcards(p_only_mine)  -> queue limited to created_by = auth.uid()
--   * get_flashcard_stats(p_only_mine) -> progress limited the same way
--
-- The filter is additive: it combines with the tag overlap using AND, and
-- defaults to false so existing callers keep studying the whole deck.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Preference
-- ----------------------------------------------------------------------------
alter table public.study_preferences
  add column only_mine boolean not null default false;

comment on column public.study_preferences.only_mine is
  'When true, study and stats only include cards created by the caller (flashcards.created_by = auth.uid()).';

-- ----------------------------------------------------------------------------
-- Weighted card selection, now with an optional ownership filter
-- ----------------------------------------------------------------------------
-- The argument list changes, so the old signature must be dropped first.
drop function if exists public.next_flashcards(integer, text[]);

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
  'Returns global cards ordered by weighted random sampling using the caller''s own counters. p_tags filters by tag overlap; p_only_mine limits to cards created by the caller. Both default to no filtering.';

-- ----------------------------------------------------------------------------
-- Progress metrics, now with the same ownership filter
-- ----------------------------------------------------------------------------
drop function if exists public.get_flashcard_stats();

create function public.get_flashcard_stats(
  p_only_mine boolean default false
)
returns jsonb
language sql
stable
as $$
  with cards as (
    select
      f.tags,
      coalesce(uf.left_count, 0) as left_count,
      coalesce(uf.right_count, 0) as right_count,
      coalesce(uf.seen_count, 0) as seen_count,
      case
        when coalesce(uf.seen_count, 0) = 0 then 'new'
        when uf.left_count > uf.right_count then 'struggling'
        when uf.right_count > uf.left_count then 'learned'
        else 'neutral'
      end as status
    from public.flashcards f
    left join public.user_flashcards uf
      on uf.flashcard_id = f.id
     and uf.user_id = auth.uid()
    where f.deleted_at is null
      and (
        not coalesce(p_only_mine, false)
        or f.created_by = auth.uid()
      )
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
  'Aggregated progress for the current user over the global deck. When p_only_mine is true, only cards created by the caller are counted.';

-- ----------------------------------------------------------------------------
-- Grants: authenticated only (same policy as the rest of the schema)
-- ----------------------------------------------------------------------------
revoke all on function public.next_flashcards(integer, text[], boolean)
  from public, anon;
grant execute on function public.next_flashcards(integer, text[], boolean)
  to authenticated;

revoke execute on function public.get_flashcard_stats(boolean)
  from public, anon;
grant execute on function public.get_flashcard_stats(boolean)
  to authenticated;
