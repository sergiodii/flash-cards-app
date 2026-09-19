import type { Json } from "./database.types";

/**
 * Progress buckets used by the stats screen.
 *
 * The classification lives in the database (`get_flashcard_stats`), so both
 * sides must agree on these four values.
 */
export type FlashcardStatus = "new" | "struggling" | "learned" | "neutral";

export interface FlashcardStatsCounts {
  total: number;
  newCount: number;
  strugglingCount: number;
  learnedCount: number;
  neutralCount: number;
  leftCount: number;
  rightCount: number;
  seenCount: number;
}

export interface TagStats extends FlashcardStatsCounts {
  tag: string;
}

export interface FlashcardStats {
  totals: FlashcardStatsCounts;
  tags: TagStats[];
}

export const EMPTY_STATS: FlashcardStats = {
  totals: {
    total: 0,
    newCount: 0,
    strugglingCount: 0,
    learnedCount: 0,
    neutralCount: 0,
    leftCount: 0,
    rightCount: 0,
    seenCount: 0,
  },
  tags: [],
};

/** Share of right swipes among all reviews, as a 0..1 ratio. */
export function accuracy(counts: FlashcardStatsCounts): number {
  const reviews = counts.leftCount + counts.rightCount;
  return reviews === 0 ? 0 : counts.rightCount / reviews;
}

function toCounts(value: Json): FlashcardStatsCounts {
  const record = (value ?? {}) as Record<string, number>;
  return {
    total: record.total ?? 0,
    newCount: record.new_count ?? 0,
    strugglingCount: record.struggling_count ?? 0,
    learnedCount: record.learned_count ?? 0,
    neutralCount: record.neutral_count ?? 0,
    leftCount: record.left_count ?? 0,
    rightCount: record.right_count ?? 0,
    seenCount: record.seen_count ?? 0,
  };
}

export function toFlashcardStats(value: Json): FlashcardStats {
  const record = (value ?? {}) as { totals?: Json; tags?: Json };
  const tags = Array.isArray(record.tags) ? record.tags : [];
  return {
    totals: toCounts(record.totals ?? {}),
    tags: tags.map((tag) => ({
      tag: String((tag as { tag?: unknown }).tag ?? ""),
      ...toCounts(tag),
    })),
  };
}
