# Coding standards — Flash Cards App

Conventions observed in this codebase. Follow them when adding or changing code.

## Language and tooling

- TypeScript in strict mode (`tsconfig.json` extends `expo/tsconfig.base` with
  `"strict": true`). No `any` escape hatches without a reason.
- Node 22, Yarn 4 via Corepack. Use `yarn`, not `npm`.
- Format/lint through ESLint (`eslint-config-expo/flat`); `dist`, `coverage`,
  `supabase` and `node_modules` are ignored.
- Run `make validate` (typecheck + lint + test) before considering work done.

## Layering and dependencies

Dependencies point **inward**. Never import a screen from a service, or a
service from `lib`/`config`.

```
screens / components / navigation
        ↓
hooks / context
        ↓
services          (the only place that talks to Supabase, Storage and edge functions)
        ↓
lib / config
        ↓
types / domain    (pure, framework-free)
```

- `domain/` is pure: no React, no Supabase, no I/O. It mirrors database rules
  and is the natural home for anything that deserves a unit test.
- `services/` are thin and explicit: build the request, throw a typed `Error`
  with a useful message, map the result to a domain model, return it.
- `lib/supabase.ts` builds the client lazily (`getSupabase()`) so importing it
  never crashes when env is missing (e.g. during tests).

## Naming and data mapping

- DB speaks `snake_case`; app speaks `camelCase`. Map **at the boundary** with
  dedicated mappers (`toFlashcard`, `toFlashcardStats`). Row shapes must not
  leak into screens or hooks.
- Domain types live in `src/types/` (`Flashcard`, `NewFlashcard`, `SwipeDirection`,
  `FlashcardStats`, …); generated DB types live in `src/types/database.types.ts`
  and are **never edited by hand** — run `make db.types`.
- Use `interface` for object shapes, `type` for unions/aliases. Prefer explicit
  named exports over default exports (the app entry is the exception).

## Repetition rules — single source of truth, two copies

The weight formula exists in exactly two places, intentionally:

- SQL: `public.flashcard_weight` in
  `supabase/migrations/20260918000000_init_flashcards.sql`.
- TS: `flashcardWeight` in `src/domain/repetition.ts`.

If you change one, change and test the other. `src/domain/repetition.test.ts`
locks the TS behaviour.

The tag filter is split the same way: `next_flashcards(p_limit, p_tags)` applies
the overlap (`tags && p_tags`) when the selection is non-empty, while the pure
selection/toggle rules live in `src/domain/tagSelection.ts` and are locked by
`tagSelection.test.ts`.

## UI and styling

- Every string is user-facing copy and goes through `src/i18n/strings.ts`; no
  inline literals in components.
- Styling uses `StyleSheet.create`. Pull colors, spacing, radii, font sizes and
  shadows from `src/theme/theme.ts`. No magic numbers, no raw hex colors outside
  the theme file.
- Interactive elements use `Pressable` with `accessibilityRole="button"` and a
  pressed style. Loading and error states are always handled explicitly
  (`ActivityIndicator`, retry affordances, empty states).
- Reusable presentational pieces live in `src/components/`; shared screen styles
  (e.g. `authStyles.ts`) live next to the screens that use them.
- Animations and gestures use reanimated / gesture-handler worklets; pure
  decision helpers they call (`directionFromTranslation`, `shouldCommitSwipe`)
  stay in `domain/` with the `"worklet"` directive.

## State and effects

- Screen logic that is more than trivial lives in a `hooks/` hook
  (`useStudyQueue` is the reference example), keeping screens declarative.
- Guard async effects with an `active`/`mounted` flag and clean up
  subscriptions; avoid setting state after unmount.
- Optimistic UI is acceptable (the study queue advances immediately and
  persists the swipe in the background, logging a warning on failure).

## Database work

- Schema changes go through `supabase/migrations/*.sql` (`make db.migration
  NAME=...`), never by editing an existing migration that has shipped.
- New tables enable RLS and define policies scoped to `auth.uid()`; grants are
  explicit. Study data is only reached through the server functions
  (`next_flashcards`, `record_swipe`, `get_flashcard_stats`).
- Run `make db.reset` then `make db.types` after schema changes, and keep
  `seed.sql` idempotent.

## Edge functions and storage

- Deno functions live in `supabase/functions/<name>/index.ts`; shared helpers go
  in `supabase/functions/_shared/`.
- The gateway verifies the JWT, but the function still calls
  `admin.auth.getUser(token)` and takes the `user_id` from the token — never
  from the request body. The service role is used only for the trusted write and
  always scoped to that verified id.
- Card audio is a private object in the `flash-app` bucket
  (`audios/<user_id>/<id>.mp3`). The app never stores a public URL; it mints a
  short-lived signed URL on demand (`services/storage.ts`). Storage RLS only
  allows reading your own `audios/<auth.uid()>/...` folder.
- `OPENROUTER_API_KEY` is a server secret read via `Deno.env.get` inside the
  function only.

## Errors

- Services wrap Supabase errors in `new Error("<action>: <message>")`.
- Screens/hooks convert unknown `cause` with
  `cause instanceof Error ? cause.message : String(cause)` and surface it to the
  user; never swallow errors silently (background work may log a warning).

## Tests

- Tests live next to the code as `*.test.ts` and target **pure logic and
  mappers** (`domain/repetition`, `domain/tagSelection`, `types/flashcard`,
  `types/stats`, `types/preferences`).
- Use `describe` / `it` with behaviour-focused names; prefer table-like explicit
  cases over clever abstractions.
- Quiet local runs: `yarn test --no-coverage -q` (or `make test`).

## Security

- `EXPO_PUBLIC_*` values are bundled into the client — only the Supabase URL and
  anon key belong there. The anon key is public; RLS is what protects data.
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` and any
  service-role key are CLI/server-only and must never reach the app bundle.
  `OPENROUTER_API_KEY` is likewise a server secret, pushed with
  `make fn.secrets` and read only inside the edge function.
- Never commit `.env`; keep `.env.example` in sync with new variables.
- Access control relies on `auth.uid()`-scoped RLS — do not add policies that
  bypass it or query the database in ways that do.
