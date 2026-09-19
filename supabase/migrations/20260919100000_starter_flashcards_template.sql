-- =============================================================================
-- Flash Cards App :: starter deck template
--
-- Moves the hardcoded starter deck out of the trigger into a reference table so
-- the content can live in seed.sql and be extended without touching migrations.
--
-- Flow:
--   * seed.sql truncates + fills public.starter_flashcards
--   * on_auth_user_created -> seed_starter_flashcards() copies the template to
--     the new user
-- =============================================================================

create table public.starter_flashcards (
  id uuid primary key default gen_random_uuid(),
  english text not null check (length(btrim(english)) > 0),
  portuguese text not null check (length(btrim(portuguese)) > 0),
  phonetic text,
  example text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.starter_flashcards is
  'Read-only template copied to every new user by the on_auth_user_created trigger. Populated from seed.sql.';

create index starter_flashcards_english_idx
  on public.starter_flashcards (lower(english));

-- No API access: only the security-definer trigger and the seed script read it.
alter table public.starter_flashcards enable row level security;
revoke all on public.starter_flashcards from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Trigger: copy the template to each new user
-- ----------------------------------------------------------------------------
create or replace function public.seed_starter_flashcards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.flashcards (user_id, english, portuguese, phonetic, example, tags)
  select new.id, s.english, s.portuguese, s.phonetic, s.example, s.tags
  from public.starter_flashcards s;

  return new;
end;
$$;

comment on function public.seed_starter_flashcards() is
  'Copies the starter deck template to a brand new user so the app is never empty on first login.';
