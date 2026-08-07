# 100 Letters Project API — developer commands.
# Run `make` or `make help` for targets.

.DEFAULT_GOAL := help

.PHONY: help lint lint-fix format typecheck test test-coverage build build-all package-all preflight security install-all

help: ## Help@show targets
	@printf '100 Letters Project API — make <target>\n\n'
	@grep -E '^[a-zA-Z0-9_-]+:.* ## ' Makefile \
		| grep -v '^help:' \
		| awk 'BEGIN {FS = ":.* ## "} \
		{ split($$2, p, "@"); \
		  if (p[1] != g) { if (g != "") print ""; printf "%s\n", p[1]; g = p[1] } \
		  printf "  %-20s %s\n", $$1, p[2] }'

# ── Quality ────────────────────────────────────────────────────────

lint: ## Quality@ESLint all src
	npm run lint:all

lint-fix: ## Quality@ESLint with --fix
	npm run lint:all:fix

format: ## Quality@Prettier write
	npm run format

typecheck: ## Quality@tsc --noEmit
	npm run typecheck

test: ## Quality@Jest with coverage
	npm run test:all

test-coverage: test ## Quality@alias for test

build: ## Quality@webpack smoke build (getLetters)
	npm run build-pkg -- getLetters

build-all: ## Quality@webpack build all routes
	npm run build-all

package-all: ## Quality@zip all route dist folders
	npm run package:all

preflight: ## Quality@lint + typecheck + test + representative build
	./scripts/preflight.sh

security: ## Quality@npm audit (no --force)
	npm audit --audit-level=high || npm audit

# ── Setup ──────────────────────────────────────────────────────────

install-all: ## Setup@install root + all route packages
	npm run install:all
