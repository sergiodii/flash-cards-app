-- =============================================================================
-- Flash Cards App :: flashcard audio + storage bucket
--
-- Adds the audio side of a card:
--   * flashcards.audio_path -> object path inside the `flash-app` bucket
--     (audios/<user_id>/<flashcard_id>.mp3), null when the card has no audio
--   * the private `flash-app` bucket (idempotent, so local reset and hosted
--     push both converge)
--   * a storage SELECT policy scoped to audios/<auth.uid()>/... so the app can
--     mint signed URLs for its own audio only
--
-- The edge function writes objects and inserts rows with the service role, so
-- no client INSERT/UPDATE policy is granted on storage.objects.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Audio reference on the card
-- ----------------------------------------------------------------------------
alter table public.flashcards
  add column audio_path text;

comment on column public.flashcards.audio_path is
  'Object path inside the flash-app bucket (audios/<user_id>/<id>.mp3); null when the card has no audio.';

-- ----------------------------------------------------------------------------
-- Private bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('flash-app', 'flash-app', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Storage row level security: read your own audios only
-- Path shape: audios/<user_id>/<file>.mp3
-- ----------------------------------------------------------------------------
create policy "flash_app_audios_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'flash-app'
    and (storage.foldername(name))[1] = 'audios'
    and (storage.foldername(name))[2] = auth.uid()::text
  );