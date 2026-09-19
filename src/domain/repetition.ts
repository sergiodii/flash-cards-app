import type { SwipeDirection } from "../types/flashcard";

/**
 * Pure helpers that mirror the repetition rules implemented in the database
 * (`flashcard_weight` and the swipe decision). Keeping them here makes the
 * behaviour testable without a database or a device.
 */

export const MIN_WEIGHT = 0.25;

/**
 * Higher weight means the card should appear more often.
 * Left swipes (needs practice) add weight, right swipes (known) remove it.
 */
export function flashcardWeight(leftCount: number, rightCount: number): number {
  return Math.max(1 + leftCount * 2 - rightCount, MIN_WEIGHT);
}

export function directionFromTranslation(
  translationX: number,
): SwipeDirection {
  "worklet";
  return translationX >= 0 ? "right" : "left";
}

export function shouldCommitSwipe(
  translationX: number,
  threshold: number,
): boolean {
  "worklet";
  return Math.abs(translationX) >= threshold;
}
