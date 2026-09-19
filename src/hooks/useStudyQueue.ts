import { useCallback, useEffect, useRef, useState } from "react";

import { fetchStudyQueue, recordSwipe } from "../services/flashcards";
import type { Flashcard, SwipeDirection } from "../types/flashcard";

const QUEUE_SIZE = 20;
const EXTEND_THRESHOLD = 3;

export interface StudyStats {
  left: number;
  right: number;
}

export interface PendingReview {
  card: Flashcard;
  direction: SwipeDirection;
}

export interface StudyQueueState {
  current: Flashcard | null;
  next: Flashcard | null;
  loading: boolean;
  error: string | null;
  stats: StudyStats;
  pending: PendingReview | null;
  commit: (direction: SwipeDirection) => void;
  dismiss: () => void;
  reload: () => void;
}

/**
 * Owns the study queue: loading, the weighted order, swipe persistence and the
 * detail modal that explains the card before the next one appears.
 */
export function useStudyQueue(): StudyQueueState {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StudyStats>({ left: 0, right: 0 });
  const [pending, setPending] = useState<PendingReview | null>(null);

  const mounted = useRef(true);
  const extending = useRef(false);
  const lastSwipedId = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyFirstPage = useCallback((cards: Flashcard[]) => {
    setQueue(avoidImmediateRepeat(cards, lastSwipedId.current));
    setCursor(0);
  }, []);

  const toMessage = (cause: unknown): string =>
    cause instanceof Error ? cause.message : "Unknown error";

  // Initial load. State is only touched after the first await, so the effect
  // does not trigger a synchronous cascading render.
  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const cards = await fetchStudyQueue(QUEUE_SIZE);
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
  }, [applyFirstPage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchStudyQueue(QUEUE_SIZE);
      if (!mounted.current) return;
      applyFirstPage(cards);
    } catch (cause) {
      if (!mounted.current) return;
      setError(toMessage(cause));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyFirstPage]);

  const extend = useCallback(async () => {
    if (extending.current) return;
    extending.current = true;
    try {
      const cards = await fetchStudyQueue(QUEUE_SIZE);
      if (!mounted.current) return;
      setQueue((previous) => {
        const known = new Set(previous.map((card) => card.id));
        const fresh = cards.filter((card) => !known.has(card.id));
        return fresh.length > 0 ? [...previous, ...fresh] : previous;
      });
    } catch {
      // Extending is best-effort; the user still has cards to study.
    } finally {
      extending.current = false;
    }
  }, []);

  const current = queue[cursor] ?? null;
  const next = queue[cursor + 1] ?? null;

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (!current) return;
      lastSwipedId.current = current.id;
      setPending({ card: current, direction });
      setStats((previous) => ({
        ...previous,
        [direction]: previous[direction] + 1,
      }));
      void recordSwipe(current.id, direction).catch((cause) => {
        console.warn("Failed to persist swipe", cause);
      });
    },
    [current],
  );

  const dismiss = useCallback(() => {
    setPending(null);
    const nextCursor = cursor + 1;

    if (nextCursor >= queue.length) {
      setCursor(0);
      void load();
      return;
    }

    setCursor(nextCursor);
    if (queue.length - nextCursor <= EXTEND_THRESHOLD) {
      void extend();
    }
  }, [cursor, queue.length, load, extend]);

  const reload = useCallback(() => {
    setPending(null);
    void load();
  }, [load]);

  return {
    current,
    next,
    loading,
    error,
    stats,
    pending,
    commit,
    dismiss,
    reload,
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
