import {
  MIN_WEIGHT,
  directionFromTranslation,
  flashcardWeight,
  shouldCommitSwipe,
} from "./repetition";

describe("flashcardWeight", () => {
  it("uses the base weight for a new card", () => {
    expect(flashcardWeight(0, 0)).toBe(1);
  });

  it("grows when the card is swiped left (needs review)", () => {
    expect(flashcardWeight(2, 0)).toBe(5);
  });

  it("shrinks when the card is swiped right (known)", () => {
    expect(flashcardWeight(0, 1)).toBeLessThan(1);
  });

  it("never drops below the minimum weight", () => {
    expect(flashcardWeight(0, 100)).toBe(MIN_WEIGHT);
  });
});

describe("directionFromTranslation", () => {
  it("treats positive translation as right", () => {
    expect(directionFromTranslation(120)).toBe("right");
  });

  it("treats negative translation as left", () => {
    expect(directionFromTranslation(-120)).toBe("left");
  });
});

describe("shouldCommitSwipe", () => {
  const threshold = 100;

  it("does not commit below the threshold", () => {
    expect(shouldCommitSwipe(99, threshold)).toBe(false);
    expect(shouldCommitSwipe(-99, threshold)).toBe(false);
  });

  it("commits when the threshold is reached in either direction", () => {
    expect(shouldCommitSwipe(100, threshold)).toBe(true);
    expect(shouldCommitSwipe(-140, threshold)).toBe(true);
  });
});
