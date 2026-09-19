import type { Tables } from "./database.types";

type StudyPreferencesRow = Tables<"study_preferences">;

/**
 * Domain representation of the user's study settings.
 *
 * The database speaks snake_case and the app speaks camelCase, so rows are
 * mapped at the boundary. An empty `selectedTags` means "study every card".
 */
export interface StudyPreferences {
  selectedTags: string[];
}

export const EMPTY_PREFERENCES: StudyPreferences = { selectedTags: [] };

export function toStudyPreferences(
  row: StudyPreferencesRow | null,
): StudyPreferences {
  return { selectedTags: row?.selected_tags ?? [] };
}
