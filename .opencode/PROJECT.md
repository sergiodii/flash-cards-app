# Project overview — Flash Cards App

English → Portuguese flashcards for practicing phrases by swiping. The app is a
single Expo / React Native codebase that ships to iOS, Android and the web, with
Supabase (Postgres + Auth) as the backend.

## Product in one minute

- A signed-in user gets a personal deck of cards (English phrase, Portuguese
  translation, optional phonetics / example / notes, tags).
- Cards are studied one at a time as a swipeable stack:
  - **swipe left = REVIEW** ("needs practice"), card gets heavier;
  - **swipe right = KNOW**, card gets lighter.
- After each swipe a detail modal shows the translation, phonetics, example and
  the running counters before the next card appears.
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
- `next_flashcards(p_limit)` orders cards by weighted random sampling using
  exponential keys: `-ln(1 - random()) / weight`, ascending.

These two implementations are duplicated **on purpose** and are linked: change
one, change and test the other.

## Architecture

Layers under `src/`, dependencies pointing inward
(`screens/hooks → services → lib`; `domain` is pure and imports nothing but types):

| Folder        | Responsibility                                                       |
| ------------- | -------------------------------------------------------------------- |
| `config/`     | Reads `EXPO_PUBLIC_*` env vars, exposes `env` + configuration guard.  |
| `lib/`        | Infrastructure clients — the lazy Supabase client (`getSupabase`).   |
| `services/`   | Every backend call: auth and flashcards (`rpc`, `insert`, `select`).  |
| `types/`      | Domain models + row→domain mappers + generated DB types.             |
| `domain/`     | Pure, framework-free rules that mirror the DB logic; unit-tested.    |
| `hooks/`      | Stateful screen logic (`useStudyQueue` owns the study session).      |
| `context/`    | React context providers (`AuthProvider`, `useAuth`).                 |
| `navigation/` | Stack/drawer navigators and typed param lists.                       |
| `screens/`    | Route-level components (Login, Register, Study, AddCard, Stats).     |
| `components/` | Reusable UI (SwipeDeck, FlashcardFace, CardDetailModal, TextField).  |
| `theme/`      | Design tokens: colors, spacing, radii, typography, shadow.           |
| `i18n/`       | All user-facing copy (`strings`), English defaults for now.          |

Entry point: `index.ts` → `App.tsx` (providers + `NavigationContainer`) →
`RootNavigator` (swaps the auth stack for the app drawer based on session).

### Data flow (study session)

```
StudyScreen
  → useStudyQueue            (queue, cursor, stats, pending review)
    → services/flashcards    (fetchStudyQueue / recordSwipe)
      → lib/supabase.ts      (RPC: next_flashcards / record_swipe)
        → Postgres functions (auth.uid()-scoped, RLS enforced)
  → SwipeDeck                (gesture + animation, calls onCommit)
  → CardDetailModal          (explains the card before advancing)
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
- `seed.sql` — fills `starter_flashcards` (idempotent) and backfills existing
  users.

`record_swipe` is atomic: it updates the counters and appends a `review_events`
row in one function. The only supported way to read/write study data from the
app is through these server functions — never raw SQL against `flashcards`.

## Tooling

- Expo (`~57`), React 19, React Native 0.86, reanimated 4, gesture-handler.
- Navigation: native-stack + drawer.
- Supabase JS client; session persisted with AsyncStorage; URL polyfill.
- Jest (`jest-expo`) for tests next to the code; ESLint via
  `eslint-config-expo`; `tsc --noEmit` in strict mode.
- `Makefile` is the discoverable entrypoint and delegates JS work to
  `package.json` scripts.
- CI (`.github/workflows/ci.yml`): typecheck + lint + tests, a static web export,
  and a Supabase job that applies migrations/seed and lints the schema.
- `wrangler.jsonc` deploys the `dist/` web export as a static SPA.

See `STANDARDS.md` for the conventions to follow when changing any of this.
