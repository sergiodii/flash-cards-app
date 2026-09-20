import type { Tables } from "./database.types";
import { toFlashcard, toFlashcardProgress } from "./flashcard";

const row: Tables<"flashcards"> = {
  id: "8f14e45f-ceea-467a-9c1b-2b3f4a5d6e7f",
  created_by: null,
  english: "It is worth a shot.",
  portuguese: "Vale a tentativa.",
  phonetic: "/ɪt ɪz wɜːrθ ə ʃɑːt/",
  example: "It may not work, but it is worth a shot.",
  notes: null,
  tags: ["idioms"],
  audio_path: null,
  deleted_at: null,
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-18T10:00:00.000Z",
};

const progressRow: Tables<"user_flashcards"> = {
  user_id: "user-1",
  flashcard_id: row.id,
  left_count: 2,
  right_count: 1,
  seen_count: 3,
  last_reviewed_at: "2026-09-18T10:00:00.000Z",
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-18T10:00:00.000Z",
};

describe("toFlashcard", () => {
  it("maps snake_case columns to camelCase fields", () => {
    const card = toFlashcard(row);

    expect(card).toEqual({
      id: row.id,
      createdBy: null,
      english: row.english,
      portuguese: row.portuguese,
      phonetic: row.phonetic,
      example: row.example,
      notes: row.notes,
      tags: ["idioms"],
      audioPath: null,
      deletedAt: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  it("falls back to an empty tag list", () => {
    const card = toFlashcard({ ...row, tags: null as unknown as string[] });

    expect(card.tags).toEqual([]);
  });

  it("maps the audio path when the card has audio", () => {
    const card = toFlashcard({
      ...row,
      audio_path: "audios/user-1/card-1.mp3",
    });

    expect(card.audioPath).toBe("audios/user-1/card-1.mp3");
  });
});

describe("toFlashcardProgress", () => {
  it("maps the per-user counters to camelCase", () => {
    expect(toFlashcardProgress(progressRow)).toEqual({
      flashcardId: row.id,
      leftCount: 2,
      rightCount: 1,
      seenCount: 3,
      lastReviewedAt: progressRow.last_reviewed_at,
    });
  });
});
