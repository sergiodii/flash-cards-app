import { getSupabase } from "../lib/supabase";
import {
  toFlashcard,
  type Flashcard,
  type NewFlashcard,
  type SwipeDirection,
} from "../types/flashcard";

/** Cards ordered by weighted random sampling (heavier cards first). */
export async function fetchStudyQueue(limit = 20): Promise<Flashcard[]> {
  const { data, error } = await getSupabase().rpc("next_flashcards", {
    p_limit: limit,
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
