# Roadmap

Status: re-implementation roadmap updated with resolved blocker decisions, 2026-11-25. Priorities are proposals and remain subject to approval.  
Authority: `AGENTS.md` sections 2–9 and the other documents in `docs/`.

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

**Status: dependency installation approved; scaffold replacement not yet performed.**

Dependencies: Phase 1 testing decision is resolved; dependency installation approval is complete.

Tasks:

- [ ] Replace the multi-project VS Code extension scaffold with a single npm package for the server.
- [ ] Configure strict TypeScript and ESM.
- [ ] Configure ESLint with TypeScript-aware rules and Prettier.
- [ ] Establish scripts for type checking, linting, formatting verification, tests and benchmarks.
- [ ] Keep the existing ESLint config working during transition by retaining `@stylistic/eslint-plugin`.
- [ ] Resolve the current prototype lint, type-check and test failures recorded in `docs/TESTING_STRATEGY.md`.
- [ ] Choose editor/client examples outside the server core.

Exit criteria:

- [ ] Clean install from committed `package-lock.json`.
- [ ] All validation commands run successfully.
- [ ] Editor-specific code is not required by the server core.

## Phase 3 — Syntax layer

Dependencies: Phase 1 parser version/compatibility validation, Phase 2 scaffold.

Tasks:

- [ ] Integrate the pinned parser dependency as an adapter.
- [ ] Implement incremental parse/update and stable source ranges.
- [ ] Build separate parser/grammar integration tests.
- [ ] Validate recovery on incomplete and malformed input.

Exit criteria:

- [ ] Parser-independent syntax representation available.
- [ ] Parser tests pass independently of semantic tests.
- [ ] No grammar, generated parser or bindings copied into this repository.

## Phase 4 — Semantic engine

Dependencies: Phase 3.

Tasks:

- [ ] Implement scopes, symbols, references and the limited Strudel-specific type model.
- [ ] Implement versioned semantic snapshots and incremental invalidation.
- [ ] Keep all Tree-sitter types behind the syntax adapter boundary.

Exit criteria:

- [ ] Semantic engine tests pass without parser API types in their contracts.
- [ ] Incremental updates reuse unaffected state.
- [ ] Cancellation behaviour is testable.

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
