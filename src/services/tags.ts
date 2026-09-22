import { normalizeTag } from "../domain/tagSelection";
import { getSupabase } from "../lib/supabase";
import { fetchFlashcardStats } from "./flashcards";

const TABLE = "user_flashcard_tags";

/**
 * Per-user tags are private to their owner; RLS scopes every row to auth.uid()
 * so these calls never need an explicit user id.
 */

/** Tags the signed-in user attached to one card. */
export async function fetchCardTags(flashcardId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("tag")
    .eq("flashcard_id", flashcardId)
    .order("tag");

  if (error) {
    throw new Error(`Failed to load card tags: ${error.message}`);
  }

  return (data ?? []).map((row) => row.tag);
}

/** Tags the signed-in user attached to many cards, grouped by card id. */
export async function fetchTagsForCards(
  flashcardIds: string[],
): Promise<Record<string, string[]>> {
  if (flashcardIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("flashcard_id, tag")
    .in("flashcard_id", flashcardIds)
    .order("tag");

  if (error) {
    throw new Error(`Failed to load card tags: ${error.message}`);
  }

  const grouped: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (grouped[row.flashcard_id] ??= []).push(row.tag);
  }
  return grouped;
}

/** Attaches a private tag to a card (idempotent at the database level). */
export async function addCardTag(
  flashcardId: string,
  tag: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .insert({ flashcard_id: flashcardId, tag: normalizeTag(tag) });

  if (error) {
    throw new Error(`Failed to add tag: ${error.message}`);
  }
}

/** Removes one of the caller's private tags from a card. */
export async function removeCardTag(
  flashcardId: string,
  tag: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .delete()
    .eq("flashcard_id", flashcardId)
    .eq("tag", normalizeTag(tag));

  if (error) {
    throw new Error(`Failed to remove tag: ${error.message}`);
  }
}

/** Every tag the user can pick from: global card tags plus their private ones. */
export async function fetchTagOptions(): Promise<string[]> {
  const stats = await fetchFlashcardStats();
  return stats.tags.map((tag) => tag.tag);
}