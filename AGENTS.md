# Flash Cards App — agent guide

English → Portuguese flashcard app for studying phrases by swiping.
Expo / React Native (iOS, Android, web) + TypeScript, backed by Supabase
(Postgres + Auth + Storage + Edge Functions). See `.opencode/PROJECT.md` for the
full picture and `.opencode/STANDARDS.md` for the coding conventions.

## Workflow — plan first, then act

- **Every chat starts with a plan.** Before editing files or running anything
  that changes state, present a short, concrete plan (steps + affected files)
  and stop.
- **No edits without explicit written approval.** Wait for the user to write an
  approval ("yes", "go ahead", "execute the plan", "approved"). A question, a
  comment, or silence is **not** approval.
- **Stay in scope.** Once approved, do exactly that plan. If the scope changes,
  stop and present a new plan before continuing.
- **Read-only work needs no approval.** Reading, searching, listing and
  read-only commands are always fine.
- This rule is stricter than the permission config (`opencode.json`): even when
  a tool is allowed there, do not act until the user approves the plan in
  writing.

## Commands

- `make help` — list every target
- `make setup` — install deps and create `.env` from `.env.example`
- `make web` / `make ios` / `make android` — run the app
- `make validate` — `typecheck` + `lint` + `test` (same as CI)
- `make export.web` — build the static web bundle (deployed by `wrangler.jsonc`)
- `make db.start` / `make db.reset` / `make db.status` — local Supabase
- `make db.link` / `make db.push` / `make db.pull` — hosted Supabase project
- `make db.seed` — apply `supabase/seed.sql` to the linked project (idempotent; `db.push --include-seed` only records the seed hash, it does not run the seed remotely)
- `make db.types` — regenerate `src/types/database.types.ts` from the DB
- `make db.migration NAME=my_change` — create a migration
- `make fn.serve` / `make fn.deploy` / `make fn.secrets` — edge functions
- `make test-audio` — generate starter-deck TTS into `supabase/assets/start_audios` (`test-audio.mjs`, skips existing files)
- `make audio.upload` — upload starter-deck audio to the `flash-app` bucket under `audios/default`

Node 22, Yarn 4 (Corepack), strict TypeScript. Never edit
`src/types/database.types.ts` by hand — regenerate it.

## Architecture (src/)

- `config/` — environment access
- `lib/` — infrastructure clients (Supabase)
- `services/` — I/O against the backend (Supabase DB/RPC, Storage, edge functions)
- `types/` — domain models + row→domain mappers
- `domain/` — pure, framework-free rules (repetition + tag selection), unit-tested
- `hooks/` — stateful screen logic
- `context/` — React context providers (auth, study preferences, toast)
- `navigation/` — navigators and param lists
- `screens/` — route-level components (Login, Register, Study, AddCard, Stats, Settings)
- `components/` — reusable UI (SwipeDeck, FlashcardFace, CardDetailModal,
  AddWithAIModal, AudioButton, TagToggleRow, TextField, Toast)
- `theme/` — colors, spacing, radii, typography, shadow
- `i18n/` — user-facing strings (English defaults)

Backend lives in `supabase/migrations/*.sql` plus `supabase/seed.sql`; Deno edge
functions live in `supabase/functions/`.

## Conventions that matter here

- Dependencies point inward: screens/hooks → services → lib. Domain stays pure.
- Map DB `snake_case` to app `camelCase` at the boundary (`toFlashcard`,
  `toFlashcardStats`, `toStudyPreferences`); do not leak row shapes into screens.
- Keep the repetition rules duplicated in two intentionally-linked places:
  `public.flashcard_weight` (SQL) and `src/domain/repetition.ts` (TS). If you
  change one, change and test the other. The same applies to the tag-selection
  helper in `src/domain/tagSelection.ts`.
- UI text goes through `src/i18n/strings.ts`, not inline literals.
- Styling uses `StyleSheet.create` and the `theme` tokens; no magic numbers,
  no hardcoded hex colors outside `theme/theme.ts`.
- Server functions (`next_flashcards`, `record_swipe`, `get_flashcard_stats`)
  are the only supported entry points for study data; they enforce `auth.uid()`
  scoping. `next_flashcards(p_limit, p_tags)` filters by tag overlap when
  `p_tags` is non-empty. RLS is per-user — new tables need policies.
- Card audio is a private Storage object in the `flash-app` bucket
  (`audios/<user_id>/<id>.mp3`); the app never stores a public URL, it mints a
  signed URL on demand (`services/storage.ts`).
- AI card creation goes through the `generate-flashcard` edge function
  (`supabase/functions/`), which calls OpenRouter for enrichment + TTS and
  writes with the service role scoped to the JWT-verified user id.
- Tests sit next to the code as `*.test.ts` and cover pure logic/mappers.
  `yarn test --no-coverage -q` is the quiet default.
- Every time you need to read anything in the local folder or its children, you
  don't need to require permission.

## Do not

- Do not commit `.env` or any `SUPABASE_*` server-only value.
- Do not add `EXPO_PUBLIC_` to a secret (it is bundled into the client).
- Do not expose `OPENROUTER_API_KEY` to the app; it is a server secret pushed
  with `make fn.secrets` and only read inside the edge function.
- Do not bypass RLS or write raw SQL against `flashcards` from the app.
- Do not require permission when you just need to read anything in the local
  folder or its children.
