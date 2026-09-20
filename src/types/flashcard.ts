import type { Tables } from "./database.types";

export type SwipeDirection = "left" | "right";

type FlashcardRow = Tables<"flashcards">;
type UserFlashcardRow = Tables<"user_flashcards">;

/**
 * Domain representation of a flashcard.
 *
 * Cards are global content shared by every user; the learning state lives in
 * `FlashcardProgress`, keyed by `(user, card)`.
 *
 * The database speaks snake_case and the app speaks camelCase, so rows are
 * mapped at the boundary instead of leaking persistence details inward.
 */
export interface Flashcard {
  id: string;
  createdBy: string | null;
  english: string;
  portuguese: string;
  phonetic: string | null;
  example: string | null;
  notes: string | null;
  tags: string[];
  audioPath: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The signed-in user's learning state for one card. */
export interface FlashcardProgress {
  flashcardId: string;
  leftCount: number;
  rightCount: number;
  seenCount: number;
  lastReviewedAt: string | null;
}

export function toFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    createdBy: row.created_by,
    english: row.english,
    portuguese: row.portuguese,
    phonetic: row.phonetic,
    example: row.example,
    notes: row.notes,
    tags: row.tags ?? [],
    audioPath: row.audio_path,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toFlashcardProgress(row: UserFlashcardRow): FlashcardProgress {
  return {
    flashcardId: row.flashcard_id,
    leftCount: row.left_count,
    rightCount: row.right_count,
    seenCount: row.seen_count,
    lastReviewedAt: row.last_reviewed_at,
  };
}
