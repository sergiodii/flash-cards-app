import type { Tables } from "./database.types";

export type SwipeDirection = "left" | "right";

type FlashcardRow = Tables<"flashcards">;

/**
 * Domain representation of a flashcard.
 *
 * The database speaks snake_case and the app speaks camelCase, so rows are
 * mapped at the boundary instead of leaking persistence details inward.
 */
export interface Flashcard {
  id: string;
  english: string;
  portuguese: string;
  phonetic: string | null;
  example: string | null;
  notes: string | null;
  tags: string[];
  audioPath: string | null;
  leftCount: number;
  rightCount: number;
  seenCount: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewFlashcard {
  english: string;
  portuguese: string;
  phonetic?: string | null;
  example?: string | null;
  notes?: string | null;
  tags?: string[];
}

export function toFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    english: row.english,
    portuguese: row.portuguese,
    phonetic: row.phonetic,
    example: row.example,
    notes: row.notes,
    tags: row.tags ?? [],
    audioPath: row.audio_path,
    leftCount: row.left_count,
    rightCount: row.right_count,
    seenCount: row.seen_count,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
