import { accuracy, toFlashcardStats } from "./stats";

describe("toFlashcardStats", () => {
  it("maps snake_case JSON into the domain shape", () => {
    const stats = toFlashcardStats({
      totals: {
        total: 3,
        new_count: 1,
        struggling_count: 1,
        learned_count: 1,
        neutral_count: 0,
        left_count: 4,
        right_count: 2,
        seen_count: 5,
      },
      tags: [
        {
          tag: "idioms",
          total: 2,
          new_count: 0,
          struggling_count: 1,
          learned_count: 1,
          neutral_count: 0,
          left_count: 3,
          right_count: 1,
          seen_count: 4,
        },
      ],
    });

    expect(stats.totals).toEqual({
      total: 3,
      newCount: 1,
      strugglingCount: 1,
      learnedCount: 1,
      neutralCount: 0,
      leftCount: 4,
      rightCount: 2,
      seenCount: 5,
    });
    expect(stats.tags).toHaveLength(1);
    expect(stats.tags[0]).toMatchObject({
      tag: "idioms",
      learnedCount: 1,
      strugglingCount: 1,
    });
  });

  it("falls back to zeros and an empty tag list", () => {
    const stats = toFlashcardStats({});

    expect(stats.totals.total).toBe(0);
    expect(stats.tags).toEqual([]);
  });
});

describe("accuracy", () => {
  it("returns the right-swipe share", () => {
    expect(
      accuracy({
        total: 0,
        newCount: 0,
        strugglingCount: 0,
        learnedCount: 0,
        neutralCount: 0,
        leftCount: 3,
        rightCount: 1,
        seenCount: 4,
      }),
    ).toBeCloseTo(0.25);
  });

  it("returns zero when there are no reviews", () => {
    expect(
      accuracy({
        total: 0,
        newCount: 0,
        strugglingCount: 0,
        learnedCount: 0,
        neutralCount: 0,
        leftCount: 0,
        rightCount: 0,
        seenCount: 0,
      }),
    ).toBe(0);
  });
});
