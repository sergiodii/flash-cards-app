-- =============================================================================
-- Flash Cards App :: authentication + multi-user
--
-- Turns the V1 single-user schema into a per-user one:
--   * user_id defaults to auth.uid() and every policy is scoped to it
--   * next_flashcards / record_swipe only touch the caller's cards
--   * new users receive a starter deck automatically (trigger on auth.users)
--   * get_flashcard_stats() powers the progress screen
--
-- Rows created before this migration keep user_id = null and become invisible;
-- they are intentionally left in place instead of being deleted.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Ownership defaults
-- ----------------------------------------------------------------------------
alter table public.flashcards
  alter column user_id set default auth.uid();

alter table public.review_events
  alter column user_id set default auth.uid();

-- ----------------------------------------------------------------------------
-- Row level security: replace the permissive V1 policies
-- ----------------------------------------------------------------------------
drop policy if exists "flashcards_v1_anon_access" on public.flashcards;
drop policy if exists "review_events_v1_anon_access" on public.review_events;

create policy "flashcards_select_own"
  on public.flashcards
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "flashcards_insert_own"
  on public.flashcards
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "flashcards_update_own"
  on public.flashcards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "flashcards_delete_own"
  on public.flashcards
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "review_events_select_own"
  on public.review_events
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "review_events_insert_own"
  on public.review_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Weighted card selection, now scoped to the caller
-- ----------------------------------------------------------------------------
create or replace function public.next_flashcards(p_limit integer default 20)
returns setof public.flashcards
language sql
volatile
as $$
  select *
  from public.flashcards
  where user_id = auth.uid()
  order by
    -ln(1 - random()) / public.flashcard_weight(left_count, right_count),
    id
  limit greatest(coalesce(p_limit, 20), 1);
$$;

comment on function public.next_flashcards(integer) is
  'Returns the caller''s cards ordered by weighted random sampling so heavier cards are more likely to appear.';

-- ----------------------------------------------------------------------------
-- Atomic swipe registration, now scoped to the caller
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
    and user_id = auth.uid()
  returning * into v_card;

  if v_card.id is null then
    raise exception 'flashcard % not found for the current user', p_flashcard_id
      using errcode = 'P0002';
  end if;

  insert into public.review_events (flashcard_id, user_id, direction)
  values (p_flashcard_id, auth.uid(), p_direction);

  return v_card;
end;
$$;

comment on function public.record_swipe(uuid, public.swipe_direction) is
  'Registers a swipe atomically for the current user: updates counters and appends a review event.';

-- ----------------------------------------------------------------------------
-- Starter deck for new users
-- ----------------------------------------------------------------------------
create or replace function public.seed_starter_flashcards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.flashcards (user_id, english, portuguese, phonetic, example, tags)
  values
    (new.id, 'How have you been?', 'Como você tem passado?', '/haʊ hæv juː biːn/', 'Hey, long time no see! How have you been?', array['greetings']),
    (new.id, 'I could use a hand.', 'Eu poderia usar uma ajuda.', '/aɪ kʊd juːz ə hænd/', 'This box is heavy, I could use a hand.', array['requests', 'idioms']),
    (new.id, 'It slipped my mind.', 'Eu esqueci / me passou pela cabeça.', '/ɪt slɪpt maɪ maɪnd/', 'Sorry, the meeting totally slipped my mind.', array['idioms']),
    (new.id, 'Let me get back to you.', 'Deixa eu te retornar (depois).', '/lɛt miː ɡɛt bæk tuː juː/', 'I need to check the numbers, let me get back to you.', array['work']),
    (new.id, 'That works for me.', 'Isso funciona para mim.', '/ðæt wɜːrks fɔːr miː/', 'Thursday at ten? That works for me.', array['agreement']),
    (new.id, 'I am running late.', 'Estou atrasado.', '/aɪ æm ˈrʌnɪŋ leɪt/', 'Sorry, I am running late, start without me.', array['daily']),
    (new.id, 'Could you speak up, please?', 'Você poderia falar mais alto, por favor?', '/kʊd juː spiːk ʌp pliːz/', 'The line is bad, could you speak up, please?', array['requests']),
    (new.id, 'It is worth a shot.', 'Vale a tentativa.', '/ɪt ɪz wɜːrθ ə ʃɑːt/', 'I do not know if it will work, but it is worth a shot.', array['idioms']),
    (new.id, 'I am looking forward to it.', 'Estou ansioso por isso.', '/aɪ æm ˈlʊkɪŋ ˈfɔːrwərd tuː ɪt/', 'The trip is next month, I am looking forward to it.', array['feelings']),
    (new.id, 'Break a leg!', 'Boa sorte! (antes de uma apresentação)', '/breɪk ə lɛɡ/', 'You have a big presentation today, break a leg!', array['idioms']),
    (new.id, 'It is up to you.', 'Você que decide / depende de você.', '/ɪt ɪz ʌp tuː juː/', 'Pizza or sushi, it is up to you.', array['daily']),
    (new.id, 'I will take your word for it.', 'Vou acreditar no que você disse.', '/aɪ wɪl teɪk jɔːr wɜːrd fɔːr ɪt/', 'You are the expert here, I will take your word for it.', array['idioms']);
  return new;
end;
$$;

comment on function public.seed_starter_flashcards() is
  'Copies the starter deck to a brand new user so the app is never empty on first login.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.seed_starter_flashcards();

-- ----------------------------------------------------------------------------
-- Progress metrics
--
-- Buckets:
--   new        -> never reviewed
--   struggling -> more left than right swipes (needs practice)
--   learned    -> more right than left swipes
--   neutral    -> reviewed, left = right
-- ----------------------------------------------------------------------------
create or replace function public.get_flashcard_stats()
returns jsonb
language sql
stable
as $$
  with cards as (
    select
      f.tags,
      f.left_count,
      f.right_count,
      f.seen_count,
      case
        when f.seen_count = 0 then 'new'
        when f.left_count > f.right_count then 'struggling'
        when f.right_count > f.left_count then 'learned'
        else 'neutral'
      end as status
    from public.flashcards f
    where f.user_id = auth.uid()
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
  'Aggregated progress for the current user: totals plus a per-tag breakdown.';

-- ----------------------------------------------------------------------------
-- Grants: authenticated only from now on
-- ----------------------------------------------------------------------------
revoke all on public.flashcards from anon;
revoke all on public.review_events from anon;
revoke execute on function public.record_swipe(uuid, public.swipe_direction) from anon;
revoke execute on function public.next_flashcards(integer) from anon;
revoke execute on function public.flashcard_weight(integer, integer) from anon;

grant execute on function public.get_flashcard_stats() to authenticated;
