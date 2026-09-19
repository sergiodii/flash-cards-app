import { getSupabase } from "../lib/supabase";

const AUDIO_BUCKET = "flash-app";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Mints a short-lived signed URL for a private audio object.
 *
 * The `flash-app` bucket is private, so the app never stores a permanent URL;
 * it asks Storage for one on demand (the storage policy only allows reading
 * the caller's own `audios/<user_id>/...` folder).
 */
export async function getAudioSignedUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(AUDIO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to sign audio URL: ${error?.message ?? "empty response"}`,
    );
  }

  return data.signedUrl;
}