import { getSupabase } from "../lib/supabase";
import {
  toStudyPreferences,
  type StudyPreferences,
} from "../types/preferences";

/** Reads the signed-in user's selected study tags (empty means every card). */
export async function fetchStudyPreferences(): Promise<StudyPreferences> {
  const { data, error } = await getSupabase()
    .from("study_preferences")
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load study preferences: ${error.message}`);
  }

  return toStudyPreferences(data);
}

/** Upserts the signed-in user's selected study tags. */
export async function saveSelectedTags(
  tags: string[],
): Promise<StudyPreferences> {
  const { data, error } = await getSupabase()
    .from("study_preferences")
    .upsert({ selected_tags: tags }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save study preferences: ${error.message}`);
  }

  return toStudyPreferences(data);
}

/**
 * Upserts the "only my cards" filter.
 *
 * Kept separate from `saveSelectedTags` so each toggle writes only its own
 * column and never clobbers the other.
 */
export async function saveOnlyMine(
  onlyMine: boolean,
): Promise<StudyPreferences> {
  const { data, error } = await getSupabase()
    .from("study_preferences")
    .upsert({ only_mine: onlyMine }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save study preferences: ${error.message}`);
  }

  return toStudyPreferences(data);
}
