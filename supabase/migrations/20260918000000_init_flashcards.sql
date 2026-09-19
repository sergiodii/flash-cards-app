-- =============================================================================
-- Flash Cards App :: initial schema
--
-- Domain:
--   * flashcards     -> the cards the user studies (EN -> PT-BR)
--   * review_events  -> one row per swipe, used to compute the repetition weight
--
-- Repetition model:
--   * swipe left  (needs practice) -> card becomes heavier, shows up more often
--   * swipe right (already known)  -> card becomes lighter, shows up less often
--   weight = 1 + (left_count * 2) - right_count, clamped to a minimum
--   `next_flashcards` picks cards using weighted random sampling
--   (exponential keys: -ln(1 - random()) / weight, ascending).
--
-- Security note (V1):
--   Authentication is not implemented yet, so policies are intentionally
--   permissive. Before going multi-user, replace them with auth.uid() scoping.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Types
-- ----------------------------------------------------------------------------
create type public.swipe_direction as enum ('left', 'right');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  english text not null check (length(btrim(english)) > 0),
  portuguese text not null check (length(btrim(portuguese)) > 0),
  phonetic text,
  example text,
  notes text,
  tags text[] not null default '{}',
  left_count integer not null default 0 check (left_count >= 0),
  right_count integer not null default 0 check (right_count >= 0),
  seen_count integer not null default 0 check (seen_count >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flashcards is 'English study cards with pt-BR translation, phonetics and example.';

create index flashcards_user_id_idx on public.flashcards (user_id);
create index flashcards_last_reviewed_at_idx on public.flashcards (last_reviewed_at);
create index flashcards_tags_idx on public.flashcards using gin (tags);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now()
);

comment on table public.review_events is 'Immutable log of every swipe, one row per review.';

create index review_events_flashcard_id_idx on public.review_events (flashcard_id);
create index review_events_created_at_idx on public.review_events (created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Repetition weight
-- ----------------------------------------------------------------------------
create or replace function public.flashcard_weight(
  p_left_count integer,
  p_right_count integer
)
returns double precision
language sql
immutable
as $$
  select greatest(1.0 + (p_left_count * 2.0) - p_right_count, 0.25);
$$;

comment on function public.flashcard_weight(integer, integer) is
  'Higher weight means the card should be shown more often. Left swipes add weight, right swipes remove it.';

-- ----------------------------------------------------------------------------
-- Weighted card selection
-- ----------------------------------------------------------------------------
create or replace function public.next_flashcards(p_limit integer default 20)
returns setof public.flashcards
language sql
volatile
as $$
  select *
  from public.flashcards
  order by
    -ln(1 - random()) / public.flashcard_weight(left_count, right_count),
    id
  limit greatest(coalesce(p_limit, 20), 1);
$$;

comment on function public.next_flashcards(integer) is
  'Returns cards ordered by weighted random sampling so heavier cards are more likely to appear.';

-- ----------------------------------------------------------------------------
-- Atomic swipe registration
-- ----------------------------------------------------------------------------
create or replace function public.record_swipe(
  p_flashcard_id uuid,
  p_direction public.swipe_direction
)
returns public.flashcards
language plpgsql
as $$
declare
  v_card public.flashcards;
begin
  update public.flashcards
  set
    left_count = left_count + case when p_direction = 'left' then 1 else 0 end,
    right_count = right_count + case when p_direction = 'right' then 1 else 0 end,
    seen_count = seen_count + 1,
    last_reviewed_at = now()
  where id = p_flashcard_id
  returning * into v_card;

  if v_card.id is null then
    raise exception 'flashcard % not found', p_flashcard_id
      using errcode = 'P0002';
  end if;

  insert into public.review_events (flashcard_id, user_id, direction)
  values (p_flashcard_id, v_card.user_id, p_direction);

  return v_card;
end;
$$;

comment on function public.record_swipe(uuid, public.swipe_direction) is
  'Registers a swipe atomically: updates counters and appends a review event.';

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
alter table public.flashcards enable row level security;
alter table public.review_events enable row level security;

-- V1 is single-user and has no authentication yet, so the anon key needs full
-- access. TODO(v2): drop these policies and scope everything to auth.uid().
create policy "flashcards_v1_anon_access"
  on public.flashcards
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "review_events_v1_anon_access"
  on public.review_events
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on public.flashcards to anon, authenticated;
grant all on public.review_events to anon, authenticated;
grant execute on function public.record_swipe(uuid, public.swipe_direction) to anon, authenticated;
grant execute on function public.next_flashcards(integer) to anon, authenticated;
grant execute on function public.flashcard_weight(integer, integer) to anon, authenticated;
