-- =============================================================================
-- Flash Cards App :: global cards + per-user progress
--
-- Makes the card content agnostic and moves the learning state to its own
-- relational table, so every card can be shared by every user:
--   * flashcards     -> content only (english, portuguese, ... , created_by)
--   * user_flashcards -> (user_id, flashcard_id) + swipe counters
--
-- A user's progress is created lazily the first time they swipe a card.
-- `review_events` and `starter_flashcards` are dropped: the counters table is
-- now the single source of truth and the starter deck is just seed rows.
--
-- Data migration: existing per-user counters are copied into user_flashcards,
-- and the per-user copies of the starter deck are deduplicated by english text
-- (keeping the earliest row) so the global deck does not repeat phrases.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Per-user learning state
-- ----------------------------------------------------------------------------
create table public.user_flashcards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  left_count integer not null default 0 check (left_count >= 0),
  right_count integer not null default 0 check (right_count >= 0),
  seen_count integer not null default 0 check (seen_count >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, flashcard_id)
);

comment on table public.user_flashcards is
  'Per-user learning state for a card (counters), independent of the shared card content.';

create index user_flashcards_flashcard_id_idx
  on public.user_flashcards (flashcard_id);

create trigger user_flashcards_set_updated_at
before update on public.user_flashcards
for each row
execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Backfill: old per-card counters become per-user progress rows
-- ----------------------------------------------------------------------------
insert into public.user_flashcards (
  user_id,
  flashcard_id,
  left_count,
  right_count,
  seen_count,
  last_reviewed_at
)
select user_id, id, left_count, right_count, seen_count, last_reviewed_at
from public.flashcards
where user_id is not null
on conflict (user_id, flashcard_id) do nothing;

-- ----------------------------------------------------------------------------
-- Deduplicate: the old starter deck was copied once per user, so the same
-- phrase exists many times. Keep the earliest row per english text and point
-- every progress row at it, summing counters when two copies shared a user.
-- ----------------------------------------------------------------------------
do $$
declare
  v_dupe record;
begin
  for v_dupe in
    with ranked as (
      select
        id,
        first_value(id) over (
          partition by lower(english) order by created_at, id
        ) as keep_id,
        row_number() over (
          partition by lower(english) order by created_at, id
        ) as rn
      from public.flashcards
    )
    select id as dupe_id, keep_id
    from ranked
    where rn > 1
  loop
    insert into public.user_flashcards (
      user_id,
      flashcard_id,
      left_count,
      right_count,
      seen_count,
      last_reviewed_at
    )
    select
      user_id,
      v_dupe.keep_id,
      left_count,
      right_count,
      seen_count,
      last_reviewed_at
    from public.user_flashcards
    where flashcard_id = v_dupe.dupe_id
    on conflict (user_id, flashcard_id) do update
      set left_count = public.user_flashcards.left_count + excluded.left_count,
          right_count = public.user_flashcards.right_count + excluded.right_count,
          seen_count = public.user_flashcards.seen_count + excluded.seen_count,
          last_reviewed_at = greatest(
            public.user_flashcards.last_reviewed_at,
            excluded.last_reviewed_at
          );

    delete from public.user_flashcards where flashcard_id = v_dupe.dupe_id;
    delete from public.flashcards where id = v_dupe.dupe_id;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- flashcards becomes content only
-- ----------------------------------------------------------------------------
-- The old per-user policies reference `user_id`, so they must go before the
-- column is dropped.
drop policy if exists "flashcards_select_own" on public.flashcards;
drop policy if exists "flashcards_insert_own" on public.flashcards;
drop policy if exists "flashcards_update_own" on public.flashcards;
drop policy if exists "flashcards_delete_own" on public.flashcards;

alter table public.flashcards
  add column created_by uuid references auth.users (id) on delete set null,
  add column deleted_at timestamptz;

update public.flashcards set created_by = user_id where user_id is not null;

alter table public.flashcards
  drop column user_id,
  drop column left_count,
  drop column right_count,
  drop column seen_count,
  drop column last_reviewed_at;

comment on column public.flashcards.created_by is
  'Author of the card (auth.users.id); null for the seeded starter deck. Attribution only — every authenticated user can study every card.';
comment on column public.flashcards.deleted_at is
  'Soft-delete marker; non-null cards are hidden from study and stats.';

drop index if exists flashcards_user_id_idx;
drop index if exists flashcards_last_reviewed_at_idx;
create index flashcards_created_by_idx on public.flashcards (created_by);
create index flashcards_created_at_idx on public.flashcards (created_at desc);

-- ----------------------------------------------------------------------------
-- Retire the event log, the template table and the starter-deck trigger
-- ----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.seed_starter_flashcards();
drop table if exists public.review_events;
drop table if exists public.starter_flashcards;

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
-- Cards are global: every authenticated user reads them. Only the
-- `generate-flashcard` edge function (service role) writes them.
create policy "flashcards_select_all"
  on public.flashcards
  for select
  to authenticated
  using (deleted_at is null);

alter table public.user_flashcards enable row level security;

create policy "user_flashcards_select_own"
  on public.user_flashcards
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_flashcards_insert_own"
  on public.user_flashcards
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_flashcards_update_own"
  on public.user_flashcards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Weighted card selection: global cards, per-user weight
-- ----------------------------------------------------------------------------
create or replace function public.next_flashcards(
  p_limit integer default 20,
  p_tags text[] default '{}'
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
  order by
    -ln(1 - random()) / public.flashcard_weight(
      coalesce(uf.left_count, 0),
      coalesce(uf.right_count, 0)
    ),
    f.id
  limit greatest(coalesce(p_limit, 20), 1);
$$;

comment on function public.next_flashcards(integer, text[]) is
  'Returns global cards ordered by weighted random sampling using the caller''s own counters. With p_tags, only cards sharing at least one tag are returned; an empty array returns every card.';

-- ----------------------------------------------------------------------------
-- Atomic swipe registration: upsert the caller's progress row
-- ----------------------------------------------------------------------------
drop function if exists public.record_swipe(uuid, public.swipe_direction);

create function public.record_swipe(
  p_flashcard_id uuid,
  p_direction public.swipe_direction
)
returns public.user_flashcards
language plpgsql
as $$
declare
  v_progress public.user_flashcards;
begin
  if not exists (
    select 1
    from public.flashcards
    where id = p_flashcard_id
      and deleted_at is null
  ) then
    raise exception 'flashcard % not found', p_flashcard_id
      using errcode = 'P0002';
  end if;

  insert into public.user_flashcards (
    user_id,
    flashcard_id,
    left_count,
    right_count,
    seen_count,
    last_reviewed_at
  )
  values (
    auth.uid(),
    p_flashcard_id,
    case when p_direction = 'left' then 1 else 0 end,
    case when p_direction = 'right' then 1 else 0 end,
    1,
    now()
  )
  on conflict (user_id, flashcard_id) do update
    set left_count = public.user_flashcards.left_count
          + case when p_direction = 'left' then 1 else 0 end,
        right_count = public.user_flashcards.right_count
          + case when p_direction = 'right' then 1 else 0 end,
        seen_count = public.user_flashcards.seen_count + 1,
        last_reviewed_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

comment on function public.record_swipe(uuid, public.swipe_direction) is
  'Registers a swipe for the current user: upserts the progress row and returns it.';

-- ----------------------------------------------------------------------------
-- Progress metrics: global cards left-joined with the caller's progress
-- ----------------------------------------------------------------------------
create or replace function public.get_flashcard_stats()
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

comment on function public.get_flashcard_stats() is
  'Aggregated progress for the current user over the global deck: totals plus a per-tag breakdown.';

-- ----------------------------------------------------------------------------
-- Grants: authenticated only; flashcards are read-only to clients
-- ----------------------------------------------------------------------------
revoke insert, update, delete on public.flashcards from anon, authenticated;
grant select on public.flashcards to authenticated;

revoke all on public.user_flashcards from anon;
grant all on public.user_flashcards to authenticated;

revoke execute on function public.record_swipe(uuid, public.swipe_direction) from public, anon;
grant execute on function public.record_swipe(uuid, public.swipe_direction) to authenticated;

revoke execute on function public.next_flashcards(integer, text[]) from public, anon;
grant execute on function public.next_flashcards(integer, text[]) to authenticated;

revoke execute on function public.get_flashcard_stats() from public, anon;
grant execute on function public.get_flashcard_stats() to authenticated;
