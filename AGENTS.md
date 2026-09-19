# Flash Cards App — agent guide

English → Portuguese flashcard app for studying phrases by swiping.
Expo / React Native (iOS, Android, web) + TypeScript, backed by Supabase
(Postgres + Auth). See `.opencode/PROJECT.md` for the full picture and
`.opencode/STANDARDS.md` for the coding conventions.

## Commands

- `make help` — list every target
- `make setup` — install deps and create `.env` from `.env.example`
- `make web` / `make ios` / `make android` — run the app
- `make validate` — `typecheck` + `lint` + `test` (same as CI)
- `make db.start` / `make db.reset` / `make db.status` — local Supabase
- `make db.types` — regenerate `src/types/database.types.ts` from the DB
- `make db.migration NAME=my_change` — create a migration

Node 22, Yarn 4 (Corepack), strict TypeScript. Never edit
`src/types/database.types.ts` by hand — regenerate it.

## Architecture (src/)

- `config/` — environment access
- `lib/` — infrastructure clients (Supabase)
- `services/` — I/O against the backend (one place that talks to Supabase)
- `types/` — domain models + row→domain mappers
- `domain/` — pure, framework-free rules (mirror of DB logic, unit-tested)
- `hooks/` — stateful screen logic
- `context/` — React context providers (auth)
- `navigation/` — navigators and param lists
- `screens/` — route-level components
- `components/` — reusable UI
- `theme/` — colors, spacing, radii, typography, shadow
- `i18n/` — user-facing strings (English defaults)

Backend lives in `supabase/migrations/*.sql` plus `supabase/seed.sql`.

## Conventions that matter here

- Dependencies point inward: screens/hooks → services → lib. Domain stays pure.
- Map DB `snake_case` to app `camelCase` at the boundary (`toFlashcard`,
  `toFlashcardStats`); do not leak row shapes into screens.
- Keep the repetition rules duplicated in two intentionally-linked places:
  `public.flashcard_weight` (SQL) and `src/domain/repetition.ts` (TS). If you
  change one, change and test the other.
- UI text goes through `src/i18n/strings.ts`, not inline literals.
- Styling uses `StyleSheet.create` and the `theme` tokens; no magic numbers,
  no hardcoded hex colors outside `theme/theme.ts`.
- Server functions (`next_flashcards`, `record_swipe`,
  `get_flashcard_stats`) are the only supported entry points for study data;
  they enforce `auth.uid()` scoping. RLS is per-user — new tables need policies.
- Tests sit next to the code as `*.test.ts` and cover pure logic/mappers.
  `yarn test --no-coverage -q` is the quiet default.

## Do not

- Do not commit `.env` or any `SUPABASE_*` server-only value.
- Do not add `EXPO_PUBLIC_` to a secret (it is bundled into the client).
- Do not bypass RLS or write raw SQL against `flashcards` from the app.
