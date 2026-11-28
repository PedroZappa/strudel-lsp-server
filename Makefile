# Makefile — strudel-lsp-server
#
# Convenience wrapper around the pinned npm scripts in package.json.
# package.json is the authoritative source for build, validation, benchmark and
# packaging logic; this file only groups and delegates those commands.
#
# Read-only inspection of this file needs no approval; changing it does.

#==============================================================================#
#                                  CONFIG                                      #
#==============================================================================#

# Project metadata (documentation only; package.json remains authoritative)
LANGUAGE_NAME := strudel-lsp-server
HOMEPAGE_URL := https://github.com/PedroZappa/strudel-lsp-server

# Directories
SRC_DIR := src
TEST_DIR := test
DOCS_DIR := docs
DOCS_INDEX := $(DOCS_DIR)/api/index.html
SCRIPTS_DIR := scripts
DIST_DIR := dist

# Generated files removed by `make clean`
GENERATED := $(DIST_DIR)/ tsconfig.tsbuildinfo $(DOCS_DIR)/api/

# Tools. Override on the command line, e.g. `make benchmark NODE=node`.
NPM ?= npm
NODE ?= node
HOST_OS := $(shell uname -s)
FALLBACK_BROWSER := $(if $(filter Darwin,$(HOST_OS)),open -a "Google Chrome",xdg-open)
BROWSER ?= $(FALLBACK_BROWSER)

# An inherited BROWSER may be broken; macOS retries with Google Chrome rather than the system default.
ifeq ($(BROWSER),$(FALLBACK_BROWSER))
DOCS_OPEN = $(BROWSER) "$(DOCS_INDEX)"
else
DOCS_OPEN = $(BROWSER) "$(DOCS_INDEX)" || $(FALLBACK_BROWSER) "$(DOCS_INDEX)"
endif

# Audit scope; override with AUDIT_ARGS= to include development dependencies too.
# Audits need network access, so `audit` is deliberately outside the verify gates.
AUDIT_ARGS ?= --omit=dev

# Colors. tput is silenced when TERM is unset (for example in CI), leaving the
# escape sequences empty without polluting every make invocation with errors.
B = $(shell tput bold 2>/dev/null)
RED = $(shell tput setaf 1 2>/dev/null)
GRN = $(shell tput setaf 2 2>/dev/null)
YEL = $(shell tput setaf 3 2>/dev/null)
BLU = $(shell tput setaf 4 2>/dev/null)
MAG = $(shell tput setaf 5 2>/dev/null)
CYA = $(shell tput setaf 6 2>/dev/null)
D = $(shell tput sgr0 2>/dev/null)

# Message vars
_SUCCESS = [$(GRN)SUCCESS$(D)]
_INFO    = [$(BLU)INFO$(D)]

.DEFAULT_GOAL := help

.PHONY: help install install-dev build typecheck lint format format-check test test-parser test-semantic test-metadata test-configuration test-lsp test-features test-mini test-protocol test-soak smoke-clients smoke-clients-write smoke-vscode smoke-nvim validate-corpus validate-corpus-write generate-metadata benchmark benchmark-check benchmark-baseline benchmark-e2e benchmark-e2e-write benchmark-timing pack-check verify-package verify-consumer verify-release check verify verify-all ci check-static audit audit-client clean docs docs-open docs-api docs-api-check

#==============================================================================#
#                                  RULES                                       #
#==============================================================================#

##@ Setup 📦

install:	## Install dependencies from package-lock.json (no lifecycle scripts)
	@echo "$(YEL)Installing dependencies...$(D)"
	@$(NPM) ci --ignore-scripts
	@echo "$(YEL)* $(_SUCCESS) Dependencies installed$(D)"

install-dev: install	## Alias for install (dev tools are pinned in package.json)
	@echo "$(YEL)* $(_INFO) Development tools come from package.json$(D)"

##@ Development 🛠

build:	## Compile TypeScript to ESM via tsc
	@echo "$(YEL)Building TypeScript...$(D)"
	@$(NPM) run build
	@echo "$(YEL)* $(_SUCCESS) TypeScript build completed$(D)"

typecheck:	## Run the strict TypeScript check with no emit
	@echo "$(YEL)Type checking...$(D)"
	@$(NPM) run typecheck
	@echo "$(YEL)* $(_SUCCESS) Type check completed$(D)"

lint:	## Run ESLint with TypeScript-aware rules
	@echo "$(YEL)Linting...$(D)"
	@$(NPM) run lint
	@echo "$(YEL)* $(_SUCCESS) Lint completed$(D)"

format:	## Format managed files with Prettier
	@echo "$(YEL)Formatting source files...$(D)"
	@$(NPM) run format
	@echo "$(YEL)* $(_SUCCESS) Source files formatted$(D)"

format-check:	## Verify Prettier formatting
	@echo "$(YEL)Checking source formatting...$(D)"
	@$(NPM) run format:check
	@echo "$(YEL)* $(_SUCCESS) Source formatting is clean$(D)"

##@ Testing Rules ✅

test:	## Build and run the node:test suite
	@echo "$(YEL)Running tests...$(D)"
	@$(NPM) test
	@echo "$(YEL)* $(_SUCCESS) Tests completed$(D)"

test-parser:	## Build and run parser/grammar integration tests only
	@echo "$(YEL)Running parser integration tests...$(D)"
	@$(NPM) run test:parser
	@echo "$(YEL)* $(_SUCCESS) Parser tests completed$(D)"

test-semantic:	## Build and run semantic engine tests only
	@echo "$(YEL)Running semantic engine tests...$(D)"
	@$(NPM) run test:semantic
	@echo "$(YEL)* $(_SUCCESS) Semantic engine tests completed$(D)"

test-metadata:	## Build and run language database tests only
	@echo "$(YEL)Running language database tests...$(D)"
	@$(NPM) run test:metadata
	@echo "$(YEL)* $(_SUCCESS) Language database tests completed$(D)"

test-configuration:	## Build and run configuration parsing and application tests only
	@echo "$(YEL)Running configuration tests...$(D)"
	@$(NPM) run test:configuration
	@echo "$(YEL)* $(_SUCCESS) Configuration tests completed$(D)"

test-lsp:	## Build and run LSP layer tests only
	@echo "$(YEL)Running LSP layer tests...$(D)"
	@$(NPM) run test:lsp
	@echo "$(YEL)* $(_SUCCESS) LSP layer tests completed$(D)"

test-features:	## Build and run language feature provider tests only
	@echo "$(YEL)Running language feature tests...$(D)"
	@$(NPM) run test:features
	@echo "$(YEL)* $(_SUCCESS) Language feature tests completed$(D)"

test-mini:	## Build and run mini-notation analysis tests only
	@echo "$(YEL)Running mini-notation tests...$(D)"
	@$(NPM) run test:mini
	@echo "$(YEL)* $(_SUCCESS) Mini-notation tests completed$(D)"

test-protocol:	## Build and run raw stdio protocol robustness tests only
	@echo "$(YEL)Running protocol robustness tests...$(D)"
	@$(NPM) run test:protocol
	@echo "$(YEL)* $(_SUCCESS) Protocol robustness tests completed$(D)"

test-soak:	## Build and run the bounded soak/lifecycle suite only
	@echo "$(YEL)Running soak/lifecycle tests...$(D)"
	@$(NPM) run test:soak
	@echo "$(YEL)* $(_SUCCESS) Soak/lifecycle tests completed$(D)"

smoke-clients:	## Run local VS Code and Neovim LSP smoke clients
	@echo "$(YEL)Running editor-client smoke tests...$(D)"
	@$(NPM) run smoke:clients
	@echo "$(YEL)* $(_SUCCESS) Editor-client smoke tests completed$(D)"

smoke-clients-write:	## Refresh the committed editor-client smoke evidence
	@echo "$(YEL)Refreshing editor-client smoke evidence...$(D)"
	@$(NPM) run smoke:clients:write
	@echo "$(YEL)* $(_SUCCESS) Editor-client smoke evidence updated$(D)"

smoke-vscode:	## Run the VS Code LSP smoke client only
	@echo "$(YEL)Running VS Code smoke client...$(D)"
	@$(NPM) run smoke:vscode
	@echo "$(YEL)* $(_SUCCESS) VS Code smoke client completed$(D)"

smoke-nvim:	## Run the Neovim LSP smoke client only
	@echo "$(YEL)Running Neovim smoke client...$(D)"
	@$(NPM) run smoke:nvim
	@echo "$(YEL)* $(_SUCCESS) Neovim smoke client completed$(D)"

validate-corpus:	## Validate syntax and semantics against pinned Strudel documentation examples
	@echo "$(YEL)Validating real Strudel documentation corpus...$(D)"
	@$(NPM) run validate:corpus
	@echo "$(YEL)* $(_SUCCESS) Corpus validation passed$(D)"

validate-corpus-write:	## Deliberately refresh the committed corpus evidence report
	@echo "$(YEL)Regenerating corpus evidence report...$(D)"
	@$(NPM) run validate:corpus:write
	@echo "$(YEL)* $(_SUCCESS) Corpus evidence report regenerated$(D)"

generate-metadata:	## Regenerate the pinned Strudel language database snapshot
	@echo "$(YEL)Generating language database...$(D)"
	@$(NPM) run generate:metadata
	@echo "$(YEL)* $(_SUCCESS) Language database generated$(D)"

benchmark:	## Build and run representative benchmark workloads
	@echo "$(YEL)Running benchmarks...$(D)"
	@$(NPM) run benchmark
	@echo "$(YEL)* $(_SUCCESS) Benchmarks completed$(D)"

benchmark-check:	## Compare current benchmark percentiles with the committed baseline
	@echo "$(YEL)Checking benchmark regressions...$(D)"
	@$(NPM) run benchmark:check
	@echo "$(YEL)* $(_SUCCESS) Benchmark regression check passed$(D)"

benchmark-baseline:	## Regenerate the committed benchmark baseline deliberately
	@echo "$(YEL)Regenerating benchmark baseline...$(D)"
	@$(NPM) run benchmark:baseline
	@echo "$(YEL)* $(_SUCCESS) Benchmark baseline updated$(D)"

benchmark-e2e:	## Run the advisory installed-binary JSON-RPC benchmark
	@echo "$(YEL)Running end-to-end benchmark...$(D)"
	@$(NPM) run benchmark:e2e
	@echo "$(YEL)* $(_SUCCESS) End-to-end benchmark completed$(D)"

benchmark-e2e-write:	## Refresh the committed advisory end-to-end benchmark report
	@echo "$(YEL)Refreshing end-to-end benchmark report...$(D)"
	@$(NPM) run benchmark:e2e:write
	@echo "$(YEL)* $(_SUCCESS) End-to-end benchmark report updated$(D)"

benchmark-timing:	## Run benchmarks with opt-in local-only timing instrumentation
	@echo "$(YEL)Running benchmarks with local timing...$(D)"
	@$(NPM) run benchmark:timing
	@echo "$(YEL)* $(_SUCCESS) Local timing benchmark completed$(D)"

pack-check:	## Preview and verify npm package contents
	@echo "$(YEL)Checking npm package contents...$(D)"
	@$(NPM) run verify:contents
	@echo "$(YEL)* $(_SUCCESS) Package contents previewed$(D)"

verify-package:	## Verify offline install and stdio launch from the npm tarball
	@echo "$(YEL)Verifying packaged server...$(D)"
	@$(NPM) run verify:package
	@echo "$(YEL)* $(_SUCCESS) Packaged server verification passed$(D)"

verify-consumer:	## Verify install without repository npm configuration or legacy peer deps
	@echo "$(YEL)Verifying clean consumer install...$(D)"
	@$(NPM) run verify:consumer
	@echo "$(YEL)* $(_SUCCESS) Clean consumer install verification passed$(D)"

verify-release:	## Verify release identity, immutable tag and matching publish/pack dry-runs
	@echo "$(YEL)Verifying release candidate...$(D)"
	@$(NPM) run verify:release
	@echo "$(YEL)* $(_SUCCESS) Release candidate verification passed$(D)"

##@ Verification ✅

check:	## Run typecheck, lint, format-check, API docs check and test
	@echo "$(YEL)Running correctness checks...$(D)"
	@$(NPM) run check
	@echo "$(YEL)* $(_SUCCESS) Correctness checks passed$(D)"

verify: check	## Alias for check; the core correctness gate
	@echo "$(YEL)* $(_INFO) Core verification gate completed$(D)"

verify-all: verify pack-check verify-package benchmark-check	## Core gate plus package, offline install and benchmark checks
	@echo "$(YEL)* $(_INFO) Extended verification gate completed$(D)"

# `.github/workflows/ci.yml` calls the underlying npm scripts directly and
# additionally runs a runtime dependency audit; this is the local gate.
ci: verify-all validate-corpus build audit-client	## Run the complete local CI gate
	@echo "$(YEL)* $(_SUCCESS) Local CI gate completed$(D)"

check-static:	## Run ESLint and verify shell script syntax
	@echo "$(YEL)Running static checks...$(D)"
	@$(NPM) run lint
	@bash -n "$(SCRIPTS_DIR)/e2e.sh"
	@echo "$(YEL)* $(_SUCCESS) Static checks completed$(D)"

audit:	## Audit runtime dependencies (network access; AUDIT_ARGS overrides scope)
	@echo "$(YEL)Auditing dependencies ($(AUDIT_ARGS))...$(D)"
	@$(NPM) audit $(AUDIT_ARGS)
	@echo "$(YEL)* $(_SUCCESS) Dependency audit completed$(D)"

audit-client:	## Audit prototype client dependencies (network access)
	@echo "$(YEL)Auditing prototype client dependencies...$(D)"
	@$(NPM) audit --prefix client
	@echo "$(YEL)* $(_SUCCESS) Prototype client dependency audit completed$(D)"

##@ Utility Rules 🛠

clean:	## Remove generated output (dist/, tsconfig.tsbuildinfo and docs/api/)
	@echo "$(YEL)Removing generated build output...$(D)"
	$(RM) -r $(GENERATED)
	@echo "$(YEL)* $(_SUCCESS) Generated build output removed$(D)"

##@ Documentation 📚

docs:	## List the project documentation in docs/
	@echo "$(YEL)Documentation in $(DOCS_DIR):$(D)"
	@cd "$(DOCS_DIR)" && ls -1 *.md

docs-open: docs-api	## Generate and open the TypeDoc API reference in a browser (BROWSER overrides the viewer; falls back to Google Chrome on macOS)
	@$(DOCS_OPEN)
	@echo "$(YEL)* $(_SUCCESS) API documentation opened in browser$(D)"

docs-api:	## Generate TypeDoc API reference into docs/api
	@echo "$(YEL)Generating API documentation...$(D)"
	@$(NPM) run docs:api
	@echo "$(YEL)* $(_SUCCESS) API documentation generated$(D)"

docs-api-check:	## Validate TypeDoc comments and links without emitting files
	@echo "$(YEL)Checking API documentation...$(D)"
	@$(NPM) run docs:api:check
	@echo "$(YEL)* $(_SUCCESS) API documentation is valid$(D)"

##@ Help 󰛵

help:	## Display this help page
	@awk 'BEGIN {FS = ":.*##"; \
			printf "\n=> Usage:\n\tmake $(GRN)<target>$(D)\n"} \
		/^[a-zA-Z_0-9-]+:.*?##/ { \
			printf "\t$(GRN)%-18s$(D) %s\n", $$1, $$2 } \
		/^##@/ { \
			printf "\n=> %s\n", substr($$0, 5) } ' Makefile
