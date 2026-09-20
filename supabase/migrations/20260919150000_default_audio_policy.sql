-- =============================================================================
-- Flash Cards App :: shared starter-deck audio
--
-- The seeded starter deck is global (created_by = null) and every user studies
-- it, so its audio cannot live in a per-user folder. `make audio.upload` puts
-- the generated files under `audios/default/` in the private `flash-app`
-- bucket, and this policy lets any authenticated user mint signed URLs for
-- them.
--
-- Storage policies are permissive (OR-ed), so this adds to the existing
-- "flash_app_audios_select_own" policy instead of replacing it. The bucket
-- stays private: files are still only reachable through short-lived signed
-- URLs.
-- =============================================================================

create policy "flash_app_default_audios_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'flash-app'
    and (storage.foldername(name))[1] = 'audios'
    and (storage.foldername(name))[2] = 'default'
  );