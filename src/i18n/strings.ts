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
    session: "This session",
    emptyTitle: "No cards yet",
    emptyBody:
      "Add a card with AI help and it will show up here to study.",
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
  audio: {
    play: "Play audio",
    stop: "Stop audio",
    error: "Could not play the audio.",
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
  nav: {
    study: "Study",
    addCard: "Add card",
    stats: "Progress",
    settings: "Settings",
  },
  account: {
    signedInAs: "Signed in as",
    unknownUser: "Unknown user",
    logout: "Log out",
  },
  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to keep studying your cards.",
    registerTitle: "Create your account",
    registerSubtitle: "Start your own deck in a few seconds.",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    loginAction: "Sign in",
    registerAction: "Create account",
    goRegister: "Don't have an account? Sign up",
    goLogin: "Already have an account? Sign in",
    passwordMismatch: "Passwords do not match.",
    confirmationSent:
      "Account created. Check your email to confirm it, then sign in.",
    missingFields: "Fill in email and password.",
  },
  addCard: {
    title: "Add a card",
    subtitle:
      "Type a phrase or word you want to practice. AI fills in the translation, details and audio, and the card is shared with everyone.",
    aiButton: "Add with AI help",
    aiTitle: "Create with AI",
    aiSubtitle:
      "Type a phrase in English or Portuguese. We translate it, fill in the details and record the audio.",
    aiInput: "Phrase (English or Portuguese)",
    aiPlaceholder: "e.g. It is worth a shot.",
    aiSend: "Send",
    aiSending: "Creating...",
    aiCancel: "Cancel",
    aiCreated: "New card created.",
  },
  stats: {
    title: "Your progress",
    loading: "Loading your progress...",
    errorTitle: "Could not load your progress",
    retry: "Try again",
    emptyTitle: "Nothing to measure yet",
    emptyBody: "Study a few cards and your progress will show up here.",
    total: "Cards",
    reviews: "Reviews",
    accuracy: "Accuracy",
    learned: "Learned",
    struggling: "Needs practice",
    fresh: "Not studied",
    neutral: "Even",
    leftSwipes: "To review",
    rightSwipes: "Known",
    byTag: "By tag",
    noTags: "Cards without tags are not counted in the breakdown.",
  },
  settings: {
    title: "Settings",
    subtitle:
      "Choose the tags to study. With none selected, you study every card.",
    allCards: "All cards (no filter)",
    loading: "Loading your tags...",
    errorTitle: "Could not load your tags",
    retry: "Try again",
    emptyTitle: "No tags yet",
    emptyBody: "Add tags to your cards and they will show up here.",
    saveError: "Could not save your selection.",
    selectedCount: (count: number) =>
      count === 1 ? "1 tag selected" : `${count} tags selected`,
  },
} as const;
