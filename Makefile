# =============================================================================
# Flash Cards App :: developer commands
#
#   make help          list every available target
#   make setup         install dependencies and prepare .env
#   make web           run the app on the web
#   make validate      typecheck + lint + tests (same checks as CI)
#   make db.reset      recreate the local database from migrations + seed
#
# Anything JS related is delegated to package.json scripts, so the Makefile
# stays a thin, discoverable entrypoint.
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

NAME ?= new_migration
PORT ?= 8081

# Loads .env into the recipe shell so the Supabase CLI receives the tokens and
# database password. Sourcing (instead of `include`) keeps values with special
# characters intact.
LOAD_ENV = set -a; [ -f ./.env ] && . ./.env; set +a;

.PHONY: help setup install env start web android ios typecheck lint test validate \
        export.web db.start db.stop db.status db.reset db.link db.unlink db.push \
        db.push.seed db.pull db.lint db.migration db.types db.new db.clean clean

## ---------------------------------------------------------------------------
## Help
## ---------------------------------------------------------------------------
help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## ---------------------------------------------------------------------------
## Setup
## ---------------------------------------------------------------------------
setup: install env ## Install dependencies and create .env from the example

install: ## Install project dependencies
	npm install

env: ## Create .env from .env.example when missing
	@if [ -f .env ]; then \
		echo ".env already exists, skipping"; \
	else \
		cp .env.example .env && echo "created .env - fill in your Supabase values"; \
	fi

## ---------------------------------------------------------------------------
## App
## ---------------------------------------------------------------------------
start: ## Start the Expo dev server
	npm run start

web: ## Run the app on the web
	npm run web

android: ## Run the app on Android
	npm run android

ios: ## Run the app on iOS
	npm run ios

## ---------------------------------------------------------------------------
## Quality
## ---------------------------------------------------------------------------
typecheck: ## Run the TypeScript compiler without emitting files
	npm run typecheck

lint: ## Run ESLint
	npm run lint

test: ## Run the test suite
	npm run test

validate: typecheck lint test ## Run every check used by CI

export.web: ## Build the static web bundle
	npm run export:web

## ---------------------------------------------------------------------------
## Database (Supabase)
## ---------------------------------------------------------------------------
db.start: ## Start the local Supabase stack
	npm run supabase:start

db.stop: ## Stop the local Supabase stack
	npm run supabase:stop

db.status: ## Show local Supabase status and credentials
	npm run supabase:status

db.reset: ## Recreate the local database (migrations + seed)
	npm run supabase:reset

db.link: ## Link the CLI to the hosted project defined in .env
	@$(LOAD_ENV) npx supabase link --project-ref "$$SUPABASE_PROJECT_ID" -p "$$SUPABASE_DB_PASSWORD"

db.unlink: ## Remove the link to the hosted project
	npx supabase unlink

db.push: ## Push migrations to the linked hosted project
	@$(LOAD_ENV) npx supabase db push --linked

db.push.seed: ## Push migrations AND seed to the linked hosted project
	@$(LOAD_ENV) npx supabase db push --linked --include-seed

db.pull: ## Pull remote schema changes into a new migration
	@$(LOAD_ENV) npx supabase db pull --linked

db.lint: ## Lint the local database schema
	npm run supabase:lint

db.migration: ## Create a new migration file (NAME=my_migration)
	npm run supabase:migration:new -- $(NAME)

db.types: ## Regenerate TypeScript types from the local database
	npm run supabase:types

db.new: db.reset db.types ## Reset the database and regenerate types

## ---------------------------------------------------------------------------
## Housekeeping
## ---------------------------------------------------------------------------
db.clean: ## Stop local Supabase and delete its volumes
	npx supabase stop --no-backup

clean: ## Remove build artifacts and caches
	rm -rf dist web-build .expo coverage
