/**
 * Pure tag-selection rules for the study filter.
 *
 * An empty selection means "study every card"; otherwise the study queue is
 * limited to cards sharing at least one selected tag.
 */

export function isTagSelected(selected: string[], tag: string): boolean {
  return selected.includes(tag);
}

/** Adds the tag when missing, removes it when present (order preserved). */
export function toggleTag(selected: string[], tag: string): string[] {
  return isTagSelected(selected, tag)
    ? selected.filter((item) => item !== tag)
    : [...selected, tag];
}
