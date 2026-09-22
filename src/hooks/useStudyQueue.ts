import { useCallback, useEffect, useRef, useState } from "react";

import { useStudyPreferences } from "../context/StudyPreferencesContext";
import { fetchStudyQueue, recordSwipe } from "../services/flashcards";
import { fetchTagsForCards } from "../services/tags";
import type {
  Flashcard,
  FlashcardProgress,
  SwipeDirection,
} from "../types/flashcard";

const QUEUE_SIZE = 10;
const EXTEND_THRESHOLD = 2;

export interface StudyStats {
  left: number;
  right: number;
}

export interface PendingReview {
  card: Flashcard;
  direction: SwipeDirection;
}

export type ProgressMap = Record<string, FlashcardProgress>;

/** The signed-in user's private tags, keyed by flashcard id. */
export type PrivateTagsMap = Record<string, string[]>;

export interface StudyQueueState {
  current: Flashcard | null;
  next: Flashcard | null;
  loading: boolean;
  error: string | null;
  stats: StudyStats;
  progress: ProgressMap;
  privateTags: PrivateTagsMap;
  pending: PendingReview | null;
  canUndo: boolean;
  commit: (direction: SwipeDirection) => void;
  dismiss: () => void;
  undo: () => void;
  reload: () => void;
  setCardTags: (flashcardId: string, tags: string[]) => void;
}

/** The last committed swipe, kept so it can be brought back once. */
interface LastSwipe {
  card: Flashcard;
  index: number;
}

/**
 * Owns the study queue: loading, the weighted order, swipe persistence and the
 * detail modal that explains the card before the next one appears.
 *
 * The swipe is infinite: cards are fetched in pages of `QUEUE_SIZE`, deduped
 * by id for the current cycle, and when the cycle is exhausted the seen-set is
 * cleared so the deck starts over.
 */
export function useStudyQueue(): StudyQueueState {
  const { selectedTags, onlyMine } = useStudyPreferences();

  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StudyStats>({ left: 0, right: 0 });
  const [progress, setProgress] = useState<ProgressMap>({});
  const [privateTags, setPrivateTags] = useState<PrivateTagsMap>({});
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);

  const mounted = useRef(true);
  const extending = useRef(false);
  const lastSwipedId = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchPage = useCallback(
    () => fetchStudyQueue(QUEUE_SIZE, selectedTags, onlyMine),
    [selectedTags, onlyMine],
  );

  const applyFirstPage = useCallback((cards: Flashcard[]) => {
    const fresh = cards.filter((card) => !seenIds.current.has(card.id));
    // Cycle exhausted: start the deck over from this fresh page.
    if (fresh.length === 0) {
      seenIds.current.clear();
    }
    const usable = fresh.length > 0 ? fresh : cards;
    setQueue(avoidImmediateRepeat(usable, lastSwipedId.current));
    setCursor(0);
  }, []);

  const toMessage = (cause: unknown): string =>
    cause instanceof Error ? cause.message : "Unknown error";

  // Loads the first page. Re-runs when the tag filter changes, which resets the
  // deck so the user never studies a card that the new filter excludes.
  useEffect(() => {
    let active = true;

    const run = async () => {
      // Reset so a filter change never shows a card it excludes.
      seenIds.current.clear();
      setQueue([]);
      setCursor(0);
      setLastSwipe(null);
      setLoading(true);

      try {
        const cards = await fetchPage();
        if (!active || !mounted.current) return;
        applyFirstPage(cards);
        setError(null);
      } catch (cause) {
        if (!active || !mounted.current) return;
        setError(toMessage(cause));
      } finally {
        if (active && mounted.current) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [applyFirstPage, fetchPage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastSwipe(null);
    try {
      const cards = await fetchPage();
      if (!mounted.current) return;
      applyFirstPage(cards);
    } catch (cause) {
      if (!mounted.current) return;
      setError(toMessage(cause));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyFirstPage, fetchPage]);

  const extend = useCallback(async () => {
    if (extending.current) return;
    extending.current = true;
    try {
      const cards = await fetchPage();
      if (!mounted.current) return;
      setQueue((previous) => {
        const known = new Set(previous.map((card) => card.id));
        const fresh = cards.filter(
          (card) => !known.has(card.id) && !seenIds.current.has(card.id),
        );
        return fresh.length > 0 ? [...previous, ...fresh] : previous;
      });
    } catch {
      // Extending is best-effort; the user still has cards to study.
    } finally {
      extending.current = false;
    }
  }, [fetchPage]);

  // Load the caller's private tags for every card currently in the queue, so
  // the deck and the tagging modal can show them without extra round-trips.
  useEffect(() => {
    const ids = queue.map((card) => card.id);
    if (ids.length === 0) return;

    let active = true;
    void fetchTagsForCards(ids)
      .then((tags) => {
        if (!active) return;
        setPrivateTags((previous) => ({ ...previous, ...tags }));
      })
      .catch((cause) => {
        console.warn("Failed to load card tags", cause);
      });

    return () => {
      active = false;
    };
  }, [queue]);

  const current = queue[cursor] ?? null;
  const next = queue[cursor + 1] ?? null;

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (!current) return;
      lastSwipedId.current = current.id;
      setPending({ card: current, direction });
      setLastSwipe({ card: current, index: cursor });
      setStats((previous) => ({
        ...previous,
        [direction]: previous[direction] + 1,
      }));
      setProgress((previous) => ({
        ...previous,
        [current.id]: bumpProgress(previous[current.id], current.id, direction),
      }));
      void recordSwipe(current.id, direction)
        .then((saved) => {
          if (!mounted.current) return;
          setProgress((previous) => ({
            ...previous,
            [saved.flashcardId]: saved,
          }));
        })
        .catch((cause) => {
          console.warn("Failed to persist swipe", cause);
        });
    },
    [current, cursor],
  );

  const dismiss = useCallback(() => {
    setPending(null);
    if (current) {
      seenIds.current.add(current.id);
    }
    const nextCursor = cursor + 1;

    if (nextCursor >= queue.length) {
      // End of the cycle: clear the seen-set and refill so swiping never ends.
      seenIds.current.clear();
      setCursor(0);
      void load();
      return;
    }

    setCursor(nextCursor);
    if (queue.length - nextCursor <= EXTEND_THRESHOLD) {
      void extend();
    }
  }, [current, cursor, queue.length, load, extend]);

  const reload = useCallback(() => {
    setPending(null);
    void load();
  }, [load]);

  const setCardTags = useCallback(
    (flashcardId: string, tags: string[]) => {
      setPrivateTags((previous) => ({ ...previous, [flashcardId]: tags }));
    },
    [],
  );

  // One step back, only while the last card is still the previous slot (a
  // cycle reload resets the cursor, which disables undo).
  const canUndo =
    lastSwipe !== null &&
    pending === null &&
    !loading &&
    cursor === lastSwipe.index + 1 &&
    queue[lastSwipe.index]?.id === lastSwipe.card.id;

  const undo = useCallback(() => {
    if (!canUndo || !lastSwipe) return;

    const { card, index } = lastSwipe;
    seenIds.current.delete(card.id);
    lastSwipedId.current = null;
    setPending(null);
    setCursor(index);
    setLastSwipe(null);
  }, [canUndo, lastSwipe]);

  return {
    current,
    next,
    loading,
    error,
    stats,
    progress,
    privateTags,
    pending,
    canUndo,
    commit,
    dismiss,
    undo,
    reload,
    setCardTags,
  };
}

/** Optimistic counters so the detail modal is correct before the RPC returns. */
function bumpProgress(
  previous: FlashcardProgress | undefined,
  flashcardId: string,
  direction: SwipeDirection,
): FlashcardProgress {
  const base = previous ?? {
    flashcardId,
    leftCount: 0,
    rightCount: 0,
    seenCount: 0,
    lastReviewedAt: null,
  };
  return {
    ...base,
    leftCount: base.leftCount + (direction === "left" ? 1 : 0),
    rightCount: base.rightCount + (direction === "right" ? 1 : 0),
    seenCount: base.seenCount + 1,
  };
}

/** Pushes the card that was just reviewed to the end of the new batch. */
function avoidImmediateRepeat(
  cards: Flashcard[],
  lastId: string | null,
): Flashcard[] {
  if (!lastId || cards.length < 2 || cards[0]?.id !== lastId) {
    return cards;
  }
  const [first, ...rest] = cards;
  return [...rest, first];
}
