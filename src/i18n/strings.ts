/**
 * Product copy.
 *
 * Centralised so a real i18n solution can replace it later without touching the
 * components. Defaults are English for now.
 */
export const strings = {
  appName: "Flash Cards",
  study: {
    progress: (current: number, total: number) => `${current} / ${total}`,
    emptyTitle: "No cards yet",
    emptyBody:
      "Add cards to your Supabase project and they will show up here to study.",
    retry: "Try again",
    errorTitle: "Something went wrong",
  },
  swipe: {
    know: "KNOW",
    review: "REVIEW",
    hintLeft: "Swipe left to review",
    hintRight: "Swipe right if you know it",
  },
  card: {
    tapHint: "Drag the card. Left to review, right to move on.",
    seen: (count: number) => `seen ${count}x`,
  },
  details: {
    title: "Card details",
    translation: "Portuguese",
    phonetic: "Pronunciation",
    example: "Example",
    notes: "Notes",
    tags: "Tags",
    reviewCount: "Reviews",
    knowCount: "Known",
    continue: "Continue",
  },
} as const;
