# Project overview — Flash Cards App

English → Portuguese flashcards for practicing phrases by swiping. The app is a
single Expo / React Native codebase that ships to iOS, Android and the web, with
Supabase (Postgres + Auth + Storage + Edge Functions) as the backend.

## Product in one minute

- A signed-in user gets a personal deck of cards (English phrase, Portuguese
  translation, optional phonetics / example / notes, tags).
- Cards can be created by hand (AddCard screen) or with AI help: type a phrase
  in English or Portuguese and the `generate-flashcard` edge function translates
  it, fills in the details, tags it and records the English narration.
- Cards are studied one at a time as a swipeable stack:
  - **swipe left = REVIEW** ("needs practice"), card gets heavier;
  - **swipe right = KNOW**, card gets lighter.
- After each swipe a detail modal shows the translation, phonetics, example,
  tags, an audio play button and the running counters before the next card.
- A settings screen lets the user pick the tags to study; an empty selection
  studies the whole deck.
- A progress screen aggregates totals and a per-tag breakdown (learned,
  struggling, not studied, neutral) plus accuracy.
- New accounts automatically receive a curated starter deck so the app is never
  empty on first login.

## Repetition model (the core domain)

Higher weight → shown more often.

```
weight = 1 + (left_count * 2) - right_count      -- clamped to >= 0.25
```

- Implemented in SQL as `public.flashcard_weight(left_count, right_count)`.
- Mirrored in TypeScript as `flashcardWeight()` in `src/domain/repetition.ts`
  (the swipe-threshold helpers `directionFromTranslation` and
  `shouldCommitSwipe` live there too, as reanimated worklets).
- `next_flashcards(p_limit, p_tags)` orders cards by weighted random sampling
  using exponential keys: `-ln(1 - random()) / weight`, ascending, and filters
  by tag overlap when `p_tags` is non-empty.

These two implementations are duplicated **on purpose** and are linked: change
one, change and test the other. The tag-filter rule is pure too and lives in
`src/domain/tagSelection.ts` (unit-tested).

## Architecture

Layers under `src/`, dependencies pointing inward
(`screens/hooks → services → lib`; `domain` is pure and imports nothing but types):

| Folder        | Responsibility                                                       |
| ------------- | -------------------------------------------------------------------- |
| `config/`     | Reads `EXPO_PUBLIC_*` env vars, exposes `env` + configuration guard.  |
| `lib/`        | Infrastructure clients — the lazy Supabase client (`getSupabase`).   |
| `services/`   | Every backend call: auth, flashcards (`rpc`, `insert`, `select`), study preferences, storage signed URLs, edge-function invoke. |
| `types/`      | Domain models + row→domain mappers (`flashcard`, `stats`, `preferences`) + generated DB types. |
| `domain/`     | Pure, framework-free rules that mirror the DB logic (`repetition`, `tagSelection`); unit-tested. |
| `hooks/`      | Stateful screen logic (`useStudyQueue` owns the study session).      |
| `context/`    | React context providers (`AuthProvider`, `StudyPreferencesProvider`, `ToastProvider`). |
| `navigation/` | Stack/drawer navigators and typed param lists.                       |
| `screens/`    | Route-level components (Login, Register, Study, AddCard, Stats, Settings). |
| `components/` | Reusable UI (SwipeDeck, FlashcardFace, CardDetailModal, AddWithAIModal, AudioButton, TagToggleRow, TextField, Toast). |
| `theme/`      | Design tokens: colors, spacing, radii, typography, shadow.           |
| `i18n/`       | All user-facing copy (`strings`), English defaults for now.          |

Entry point: `index.ts` → `App.tsx` (providers + `NavigationContainer`) →
`RootNavigator` (swaps the auth stack for the app drawer based on session).

### Data flow (study session)

```
StudyScreen
  → useStudyQueue            (queue, cursor, stats, pending review)
    → useStudyPreferences    (selected tags feed the queue)
      → services/preferences (fetchStudyPreferences / saveSelectedTags)
    → services/flashcards    (fetchStudyQueue / recordSwipe)
      → lib/supabase.ts      (RPC: next_flashcards / record_swipe)
        → Postgres functions (auth.uid()-scoped, RLS enforced)
  → SwipeDeck                (gesture + animation, calls onCommit)
  → CardDetailModal          (explains the card before advancing)
    → AudioButton            (signed URL + expo-audio playback)
```

### AI card creation flow

```
AddCardScreen
  → AddWithAIModal
    → services/flashcards.generateFlashcard
      → supabase.functions.invoke("generate-flashcard", { text })
        → edge function: OpenRouter chat (fields) + TTS (mp3)
          → Storage upload audios/<user_id>/<id>.mp3
          → insert flashcard with audio_path (service role, scoped to JWT user)
```

### Auth flow

`AuthProvider` restores the persisted session, subscribes to
`onAuthStateChange`, and exposes `signIn` / `signUp` / `signOut` (thin wrappers
in `services/auth.ts`). `RootNavigator` renders the auth stack when there is no
session and the drawer when there is, so signing out returns to login with no
manual navigation.

## Backend (`supabase/`)

- `migrations/20260918000000_init_flashcards.sql` — enum `swipe_direction`,
  tables `flashcards` and `review_events`, `updated_at` trigger,
  `flashcard_weight`, `next_flashcards`, `record_swipe`, permissive V1 RLS.
- `migrations/20260918120000_auth_multiuser.sql` — per-user ownership
  (`user_id` defaults to `auth.uid()`), RLS policies scoped to `auth.uid()`,
  starter-deck trigger on `auth.users`, `get_flashcard_stats()`.
- `migrations/20260919100000_starter_flashcards_template.sql` — moves the
  starter deck into the `starter_flashcards` template table (no API access);
  the trigger copies it to each new user.
- `migrations/20260919123255_study_preferences.sql` — `study_preferences` table
  (per-user `selected_tags`) with RLS, and `next_flashcards(p_limit, p_tags)`
  gains the tag-overlap filter.
- `migrations/20260919130000_flashcard_audio.sql` — `flashcards.audio_path`,
  the private `flash-app` bucket and the storage SELECT policy scoped to
  `audios/<auth.uid()>/...`.
- `seed.sql` — fills `starter_flashcards` (idempotent) and backfills existing
  users.

`record_swipe` is atomic: it updates the counters and appends a `review_events`
row in one function. The only supported way to read/write study data from the
app is through these server functions — never raw SQL against `flashcards`.

### Edge functions (`supabase/functions/`)

- `generate-flashcard/index.ts` — Deno function that verifies the caller's JWT,
  enriches the phrase via OpenRouter, synthesizes English audio, uploads the mp3
  to the private bucket and inserts the card. It uses the service role only for
  this trusted write, always scoped to the JWT-verified `user_id` (never taken
  from the request body).
- `_shared/openrouter.ts` — OpenRouter client (chat + TTS) and defensive parsing
  of the model reply.
- `_shared/cors.ts` — shared CORS headers and JSON responses.

`OPENROUTER_API_KEY` is a server secret pushed with `make fn.secrets`; it never
reaches the app bundle.

## Tooling

- Expo (`~57`), React 19, React Native 0.86, reanimated 4, gesture-handler,
  `expo-audio`, `expo-linear-gradient`.
- Navigation: native-stack + drawer.
- Supabase JS client; session persisted with AsyncStorage; URL polyfill.
- `@openrouter/sdk` powers the edge function and the `test-audio.mjs` smoke
  test (`make test-audio`).
- Jest (`jest-expo`) for tests next to the code; ESLint via
  `eslint-config-expo`; `tsc --noEmit` in strict mode.
- `Makefile` is the discoverable entrypoint and delegates JS work to
  `package.json` scripts.
- CI (`.github/workflows/ci.yml`): typecheck + lint + tests, a static web export,
  and a Supabase job that applies migrations/seed and lints the schema.
- `wrangler.jsonc` deploys the `dist/` web export as a static SPA.

See `STANDARDS.md` for the conventions to follow when changing any of this.
