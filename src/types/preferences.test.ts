import type { Tables } from "./database.types";
import { EMPTY_PREFERENCES, toStudyPreferences } from "./preferences";

const row: Tables<"study_preferences"> = {
  user_id: "8f14e45f-ceea-467a-9c1b-2b3f4a5d6e7f",
  selected_tags: ["idioms", "work"],
  updated_at: "2026-09-19T12:00:00.000Z",
};

describe("toStudyPreferences", () => {
  it("maps selected_tags to camelCase selectedTags", () => {
    expect(toStudyPreferences(row)).toEqual({
      selectedTags: ["idioms", "work"],
    });
  });

  it("returns an empty selection when there is no row yet", () => {
    expect(toStudyPreferences(null)).toEqual(EMPTY_PREFERENCES);
  });
});
