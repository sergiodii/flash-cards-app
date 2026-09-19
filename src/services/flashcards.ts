import { getSupabase } from "../lib/supabase";
import {
  toFlashcard,
  type Flashcard,
  type NewFlashcard,
  type SwipeDirection,
} from "../types/flashcard";
import type { Tables } from "../types/database.types";
import { toFlashcardStats, type FlashcardStats } from "../types/stats";

/**
 * Cards ordered by weighted random sampling (heavier cards first).
 *
 * When `tags` is non-empty, only cards sharing at least one tag are returned;
 * an empty list studies the whole deck.
 */
export async function fetchStudyQueue(
  limit = 20,
  tags: string[] = [],
): Promise<Flashcard[]> {
  const { data, error } = await getSupabase().rpc("next_flashcards", {
    p_limit: limit,
    p_tags: tags,
  });

  if (error) {
    throw new Error(`Failed to load study queue: ${error.message}`);
  }

  return (data ?? []).map(toFlashcard);
}

/** Registers a swipe and returns the updated card counters. */
export async function recordSwipe(
  flashcardId: string,
  direction: SwipeDirection,
): Promise<Flashcard> {
  const { data, error } = await getSupabase().rpc("record_swipe", {
    p_flashcard_id: flashcardId,
    p_direction: direction,
  });

  if (error) {
    throw new Error(`Failed to record swipe: ${error.message}`);
  }
  if (!data) {
    throw new Error("Failed to record swipe: empty response");
  }

  return toFlashcard(data);
}

/** Creates a new card to study. */
export async function createFlashcard(
  input: NewFlashcard,
): Promise<Flashcard> {
  const { data, error } = await getSupabase()
    .from("flashcards")
    .insert({
      english: input.english,
      portuguese: input.portuguese,
      phonetic: input.phonetic ?? null,
      example: input.example ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create flashcard: ${error.message}`);
  }

  return toFlashcard(data);
}

/**
 * Asks the `generate-flashcard` edge function to enrich a phrase (English or
 * Portuguese) and narrate it, returning the newly created card.
 */
export async function generateFlashcard(text: string): Promise<Flashcard> {
  const { data, error } = await getSupabase().functions.invoke<{
    flashcard: Tables<"flashcards">;
  }>("generate-flashcard", { body: { text } });

  if (error) {
    throw new Error(`Failed to generate flashcard: ${await describeError(error)}`);
  }
  if (!data?.flashcard) {
    throw new Error("Failed to generate flashcard: empty response");
  }

  return toFlashcard(data.flashcard);
}

/** Lists every card, newest first (useful for a future management screen). */
export async function listFlashcards(): Promise<Flashcard[]> {
  const { data, error } = await getSupabase()
    .from("flashcards")
    .select()
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list flashcards: ${error.message}`);
  }

  return (data ?? []).map(toFlashcard);
}

/** Aggregated progress for the signed-in user (totals plus per-tag). */
export async function fetchFlashcardStats(): Promise<FlashcardStats> {
  const { data, error } = await getSupabase().rpc("get_flashcard_stats");

  if (error) {
    throw new Error(`Failed to load stats: ${error.message}`);
  }

  return toFlashcardStats(data ?? {});
}

/** Prefers the function's own error message over the generic HTTP one. */
async function describeError(error: {
  message: string;
  context?: Response;
}): Promise<string> {
  try {
    const body = (await error.context?.json()) as { error?: unknown } | undefined;
    if (typeof body?.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // Non-JSON body: fall back to the generic message.
  }
  return error.message;
}
