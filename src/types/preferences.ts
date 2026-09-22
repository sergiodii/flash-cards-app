import type { Tables } from "./database.types";

type StudyPreferencesRow = Tables<"study_preferences">;

/**
 * Domain representation of the user's study settings.
 *
 * The database speaks snake_case and the app speaks camelCase, so rows are
 * mapped at the boundary. An empty `selectedTags` means "study every card";
 * `onlyMine` limits study and stats to the cards the user created.
 */
export interface StudyPreferences {
  selectedTags: string[];
  onlyMine: boolean;
}

export const EMPTY_PREFERENCES: StudyPreferences = {
  selectedTags: [],
  onlyMine: false,
};

export function toStudyPreferences(
  row: StudyPreferencesRow | null,
): StudyPreferences {
  return {
    selectedTags: row?.selected_tags ?? [],
    onlyMine: row?.only_mine ?? false,
  };
}
