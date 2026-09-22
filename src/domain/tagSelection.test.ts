import { isTagSelected, sortTags, toggleTag } from "./tagSelection";

describe("toggleTag", () => {
  it("adds a missing tag at the end", () => {
    expect(toggleTag(["idioms"], "work")).toEqual(["idioms", "work"]);
  });

  it("removes an already selected tag", () => {
    expect(toggleTag(["idioms", "work"], "idioms")).toEqual(["work"]);
  });

  it("does not mutate the input", () => {
    const selected = ["idioms"];
    toggleTag(selected, "work");
    expect(selected).toEqual(["idioms"]);
  });
});

describe("isTagSelected", () => {
  it("reports membership", () => {
    expect(isTagSelected(["idioms"], "idioms")).toBe(true);
    expect(isTagSelected(["idioms"], "work")).toBe(false);
  });
});

describe("sortTags", () => {
  it("sorts alphabetically from A to Z", () => {
    expect(sortTags(["work", "idioms", "daily"])).toEqual([
      "daily",
      "idioms",
      "work",
    ]);
  });

  it("does not mutate the input", () => {
    const tags = ["work", "idioms"];
    sortTags(tags);
    expect(tags).toEqual(["work", "idioms"]);
  });
});
