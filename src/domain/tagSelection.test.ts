import { isTagSelected, toggleTag } from "./tagSelection";

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
