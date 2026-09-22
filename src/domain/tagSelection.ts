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

/** Returns a new list sorted A→Z, leaving the input untouched. */
export function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/** Normalizes a tag the way it is stored: trimmed and lowercased. */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Filters tags by a case-insensitive substring query, keeping A→Z order. */
export function filterTags(tags: string[], query: string): string[] {
  const needle = normalizeTag(query);
  if (!needle) return sortTags(tags);
  return sortTags(tags.filter((tag) => normalizeTag(tag).includes(needle)));
}

/** Merges tag lists into a unique, normalized A→Z list (empties dropped). */
export function mergeTags(...lists: string[][]): string[] {
  const unique = new Set<string>();
  for (const list of lists) {
    for (const tag of list) {
      const normalized = normalizeTag(tag);
      if (normalized) unique.add(normalized);
    }
  }
  return sortTags([...unique]);
}
