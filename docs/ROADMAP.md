# Roadmap

Status: re-implementation roadmap updated with resolved blocker decisions and Phase 4 completion, 2026-11-27. Priorities are proposals and remain subject to approval.

Authority: `AGENTS.md` sections 2–18 and the other documents in `docs/`.

## Phase 0 — Preparation

**Status: complete; changes are not committed.**

Outcome:

- Ten source-of-truth documents created under `docs/`.
- Prototype left untouched during preparation.
- Blocker decisions gathered for user resolution.
- No dependencies were installed during the initial preparation step.

Exit criteria:

- [x] Documents created
- [x] Open decisions identified
- [x] No destructive or dependency-changing actions taken during initial preparation

## Phase 1 — Resolve blockers

**Status: complete.** All blocker decisions are resolved. The corrected parser npm tarball remains a packaging release gate rather than a development blocker.

Tasks:

- [x] Resolve the parser licence policy described in `docs/PARSER_INTEGRATION.md`: MIT is authoritative by user decision.
- [x] Obtain approval for a complete `AGENTS.md` section 9.
- [x] Resolve the repository `LICENSE` mismatch described in `docs/DECISIONS.md`.
- [x] Select and approve the test tooling; install the pinned scaffold dependencies.
- [x] Select the exact parser npm version, record provenance and validate compatibility.
- [x] Select and pin authoritative Strudel source versions for metadata generation.
- [x] Close the upstream parser licence blocker as an owner-owned follow-up; user will correct the original repository, with no action against the fork.

Exit criteria:

- [x] Parser licence policy documented with evidence.
- [x] Testing policy authoritative.
- [x] Repository licence metadata consistent with ownership.
- [x] Test tooling approved and installed.
- [x] Parser source, version, provenance and compatibility documented.
- [x] Metadata source versions recorded.
- [x] Development-only npm audit advisories patched.

## Phase 2 — Toolchain scaffold

**Status: complete; changes are not committed.**

Dependencies: Phase 1 testing decision is resolved; dependency installation approval is complete.

Tasks:

- [x] Replace the multi-project VS Code extension scaffold with a single npm package for the server.
- [x] Configure strict TypeScript and ESM.
- [x] Configure ESLint with TypeScript-aware rules and Prettier.
- [x] Establish scripts for type checking, linting, formatting verification, tests and benchmarks.
- [x] Keep the existing ESLint config working during transition by retaining `@stylistic/eslint-plugin`.
- [x] Resolve the current prototype lint, type-check and test failures recorded in `docs/TESTING_STRATEGY.md`.
- [x] Choose editor/client examples outside the server core.
- [x] Add Makefile wrappers for developer and agent workflows.

The prototype's `client/`, `server/` and editor files remain untouched and are excluded from the new package build, lint and test scopes. The existing Neovim prototype file remains outside the server core; no new editor example was added. The Makefile delegates to the root npm scripts and is not a second source of build or validation logic.

Exit criteria:

- [x] Clean install from committed `package-lock.json`.
- [x] All validation commands run successfully.
- [x] Editor-specific code is not required by the server core.

## Phase 3 — Syntax layer

**Status: complete; changes are not committed.**

Dependencies: Phase 1 parser version/compatibility validation, Phase 2 scaffold.

Tasks:

- [x] Integrate the pinned parser dependency as an adapter.
- [x] Implement incremental parse/update and stable source ranges.
- [x] Build separate parser/grammar integration tests.
- [x] Validate recovery on incomplete and malformed input.

Parser integration tests live under `test/parser/` and can be run independently with `npm run test:parser` or `make test-parser`. The native tree is retained only inside the adapter; other layers receive the parser-independent `SyntaxDocument` contract. The adapter targets `tree-sitter-strudel@2.0.2`; its major grammar rewrite was absorbed entirely in `src/syntax/kinds.ts` and `src/syntax/types.ts`.

Exit criteria:

- [x] Parser-independent syntax representation available.
- [x] Parser tests pass independently of semantic tests.
- [x] No grammar, generated parser or bindings copied into this repository.

## Phase 4 — Semantic engine

**Status: complete; changes are not committed.**

Dependencies: Phase 3.

Tasks:

- [x] Implement scopes, symbols, references and the limited Strudel-specific type model.
- [x] Implement versioned semantic snapshots and incremental invalidation.
- [x] Keep all Tree-sitter types behind the syntax adapter boundary.

`src/semantic/` provides an injected `SemanticCatalog` boundary so authoritative Strudel metadata can arrive in Phase 5 without rewriting the engine. Semantic tests under `test/semantic/` hand-build `SyntaxDocument` fixtures and can be run independently with `npm run test:semantic` or `make test-semantic`. Incremental reuse is statement-level; global declaration changes trigger a conservative full rebuild.

Exit criteria:

- [x] Semantic engine tests pass without parser API types in their contracts.
- [x] Incremental updates reuse unaffected state.
- [x] Cancellation behaviour is testable.

## Phase 5 — Language database

Dependencies: Phase 1 metadata versions, Phase 2 scaffold.

Tasks:

- [ ] Define generated, manual and runtime-derived metadata inputs.
- [ ] Pin and document source versions.
- [ ] Generate reproducible offline-capable metadata.
- [ ] Design for future multiple Strudel versions.

Exit criteria:

- [ ] Metadata generation is reproducible from pinned inputs.
- [ ] Origin and version are documented.
- [ ] Offline operation works after installation.

## Phase 6 — Core language intelligence

Dependencies: Phases 4 and 5.

Candidate first capabilities, subject to explicit approval:

- [ ] Resilient diagnostics.
- [ ] Position-aware completion.
- [ ] Hover documentation.
- [ ] Signature help.
- [ ] Definition and references.
- [ ] Mini-notation-aware analysis.

Exit criteria:

- [ ] Capabilities are advertised only when implemented and verified.
- [ ] Live-coding resilience requirements in `docs/LSP_FEATURES.md` are covered by tests.

## Phase 7 — Extended capabilities

Dependencies: Phase 6.

Candidate extended capabilities, evaluate and implement only where justified:

- [ ] Quick fixes.
- [ ] Rename.
- [ ] Document/workspace symbols.
- [ ] Semantic tokens.
- [ ] Formatting.
- [ ] Code actions and refactoring.

## Phase 8 — Performance harness and targets

Dependencies: working syntax/semantic pipeline.

Tasks:

- [ ] Create representative workloads.
- [ ] Measure p50/p95/p99.
- [ ] Establish numeric targets and document them in `docs/PERFORMANCE.md`.
- [ ] Add regression monitoring.

## Phase 9 — Packaging and release

Dependencies: validated core capabilities and performance baseline.

Tasks:

- [ ] Publish the server as an npm package with stdio as the primary transport.
- [ ] Keep editor-specific examples separate.
- [ ] Verify that an MIT-corrected parser npm release is available before redistribution.
- [ ] Verify a clean offline installation.

## Deferred / explicitly not planned

- Complete JavaScript or TypeScript compiler/type checker.
- Standalone binary distribution in the initial release.
- Editor-specific dependencies in the server core.
- Folding, selection ranges, inlay hints and call hierarchy until their value is demonstrated.

## Transition constraint

The six tracked files modified before preparation remain user work and must be preserved. Later changes made with approval include `LICENSE`, `package.json`, `package-lock.json`, the completed `AGENTS.md` section 9 and documents under `docs/`. Prototype source files are not removed or overwritten until an explicit retirement decision is made and the user changes are preserved.
