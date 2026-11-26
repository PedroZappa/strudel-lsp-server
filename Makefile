.DEFAULT_GOAL := help

.PHONY: help install build typecheck lint format format-check test benchmark check pack-check

help:
	@printf 'Available targets:\n'
	@printf '  install       Install dependencies from package-lock.json\n'
	@printf '  build         Compile TypeScript to ESM\n'
	@printf '  typecheck     Run TypeScript strict-mode check\n'
	@printf '  lint          Run ESLint with TypeScript-aware rules\n'
	@printf '  format        Format managed files with Prettier\n'
	@printf '  format-check  Verify Prettier formatting\n'
	@printf '  test          Build and run the node:test suite\n'
	@printf '  benchmark     Run the benchmark command runner\n'
	@printf '  check         Run typecheck, lint, format-check and test\n'
	@printf '  pack-check    Preview npm package contents\n'

install:
	npm ci --ignore-scripts

build:
	npm run build

typecheck:
	npm run typecheck

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

test:
	npm test

benchmark:
	npm run benchmark

check:
	npm run check

pack-check:
	npm pack --dry-run --ignore-scripts
