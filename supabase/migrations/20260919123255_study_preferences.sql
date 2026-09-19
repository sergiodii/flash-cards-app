-- =============================================================================
-- Flash Cards App :: study preferences (tag filter)
--
-- Persists which tags the user wants to study, per user.
-- `next_flashcards` gains a tag filter:
--   * empty selection  -> every card is returned
--   * non-empty array  -> cards sharing at least one selected tag (&& overlap)
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
create table public.study_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  selected_tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

comment on table public.study_preferences is
  'Per-user study settings. selected_tags = {} means "study every card".';

create trigger study_preferences_set_updated_at
before update on public.study_preferences
for each row
execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
alter table public.study_preferences enable row level security;

create policy "study_preferences_select_own"
  on public.study_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "study_preferences_insert_own"
  on public.study_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "study_preferences_update_own"
  on public.study_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Weighted card selection, now with an optional tag filter
-- ----------------------------------------------------------------------------
drop function if exists public.next_flashcards(integer);

create function public.next_flashcards(
  p_limit integer default 20,
  p_tags text[] default '{}'
)
returns setof public.flashcards
language sql
volatile
as $$
  select *
  from public.flashcards
  where user_id = auth.uid()
    and (
      coalesce(cardinality(p_tags), 0) = 0
      or tags && p_tags
    )
  order by
    -ln(1 - random()) / public.flashcard_weight(left_count, right_count),
    id
  limit greatest(coalesce(p_limit, 20), 1);
$$;

comment on function public.next_flashcards(integer, text[]) is
  'Returns the caller''s cards ordered by weighted random sampling. With p_tags, only cards sharing at least one tag are returned; an empty array returns every card.';

-- ----------------------------------------------------------------------------
-- Grants: authenticated only (same policy as the rest of the schema)
-- ----------------------------------------------------------------------------
revoke all on public.study_preferences from anon;
grant all on public.study_preferences to authenticated;

revoke all on function public.next_flashcards(integer, text[]) from public, anon;
grant execute on function public.next_flashcards(integer, text[]) to authenticated;
