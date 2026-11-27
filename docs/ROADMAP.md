# Roadmap

Status: re-implementation roadmap updated with resolved blocker decisions, Phase 6 completion, Phase 7 quick fixes, rename, document symbols, semantic tokens and formatting, 2026-11-27. Priorities are proposals and remain subject to approval.

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

**Status: complete; changes are not committed.**

Dependencies: Phase 1 metadata versions, Phase 2 scaffold.

Tasks:

- [x] Define generated, manual and runtime-derived metadata inputs.
- [x] Pin and document source versions.
- [x] Generate reproducible offline-capable metadata.
- [x] Design for future multiple Strudel versions.

`src/languageDatabase/` combines a committed JSDoc-derived snapshot, manually curated semantics and an optional runtime-entry extension point. `scripts/generate-metadata.mjs` validates pinned versions, integrity, licences and repository provenance, then emits deterministic TypeScript. `createCatalogFromLanguageDatabase` adapts the database to the Phase 4 `SemanticCatalog` boundary. Tests run independently via `npm run test:metadata` or `make test-metadata`; regeneration runs via `npm run generate:metadata` or `make generate-metadata`.

Exit criteria:

- [x] Metadata generation is reproducible from pinned inputs.
- [x] Origin and version are documented.
- [x] Offline operation works after installation.

## Phase 6 — Core language intelligence

**Status: complete. The approved core increment and the deferred signature-help and mini-notation items are implemented and verified.**

Dependencies: Phases 4 and 5.

Candidate first capabilities, subject to explicit approval:

- [x] Resilient diagnostics.
- [x] Position-aware completion.
- [x] Hover documentation.
- [x] Signature help.
- [x] Definition and references.
- [x] Mini-notation-aware analysis.

Phase 6 adds an incremental text document store, deferred analysis with superseded-version suppression, and transport-independent providers for diagnostics, completion, hover, signature help, definition and references. Providers consume the Phase 4 semantic model plus the Phase 5 language database. Capabilities are advertised only for implemented features. Signature help uses authoritative generated JSDoc parameter metadata and tracks the innermost active call and parameter. Mini-notation receives a parser-independent token submodel validated against the pinned `@strudel/mini@1.2.6` grammar; only clearly structural faults become warnings, while incomplete live-coding states stay quiet.

Phase 6 exit criteria:

- [x] Capabilities are advertised only when implemented and verified.
- [x] Live-coding resilience requirements in `docs/LSP_FEATURES.md` are covered by tests.
- [x] Signature help derives labels, parameters and documentation from pinned metadata and tracks nested calls.
- [x] Mini-notation tokens, diagnostics and hover follow validated 1.2.6 rules and preserve ranges through incremental reuse.
- [x] Focused protocol, feature and mini-notation suites plus the full validation gate pass.

## Phase 7 — Extended capabilities

**Status: quick fixes, rename, document symbols, semantic tokens and formatting implemented and verified; workspace symbols and the other candidates remain under evaluation.**

Dependencies: Phase 6.

Candidate extended capabilities, evaluate and implement only where justified:

- [x] Quick fixes.
- [x] Rename.
- [x] Document symbols.
- [ ] Workspace symbols (deferred; no workspace index exists).
- [x] Semantic tokens.
- [x] Formatting.
- [ ] Code actions and refactoring.

Quick fixes are limited to validated mini-notation structural diagnostics and produce single-document text edits. Syntax errors, unknown names and incomplete live-coding states do not produce fixes. The LSP adapter advertises only the quick-fix kind and recomputes actions from the current semantic snapshot rather than trusting client-supplied stale diagnostics.

Quick fix exit criteria:

- [x] Fixes use only actionable diagnostics with safe, deterministic edits.
- [x] `textDocument/codeAction` advertises and returns only the quick-fix kind.
- [x] Feature and stdio tests cover edit contents, range filtering and non-actionable diagnostics.

Rename is document-scoped and only applies to resolved user variables, functions, parameters and import bindings. Builtins, pattern methods, unresolved names, invalid names and documents with syntax errors are rejected. `textDocument/prepareRename` advertises the exact token range and current name before any edit is generated.

Rename exit criteria:

- [x] Rename edits use resolved declarations and references with verified source text.
- [x] `renameProvider` advertises `prepareProvider` and both requests are implemented.
- [x] Feature and stdio tests cover declaration and reference edits, non-user symbols, invalid names and incomplete input.

Document symbols are derived from the current semantic snapshot: declared variables, functions, parameters and import bindings are returned with exact selection ranges, and a named function owns the declarations in its function scope as children. Catalog-only symbols and declarations whose recorded range no longer matches the source are omitted. Workspace symbols are deferred because there is no workspace index or authoritative cross-file module graph; searching only open documents would be incomplete and misleading to clients.

Document symbol exit criteria:

- [x] `documentSymbolProvider` is advertised and `textDocument/documentSymbol` is implemented.
- [x] Feature and stdio tests cover source ranges, inferred type details, function-scope children, catalog-only exclusion and incomplete input.
- [x] Workspace-symbol deferral is recorded in `docs/DECISIONS.md` and `docs/LSP_FEATURES.md`.

Semantic tokens are emitted only for classifications backed by the semantic model or the pinned mini-notation lexer: resolved user and library symbols, inferred declarations, mini-notation numbers and operators. Unresolved identifiers, ordinary mini-notation steps, syntax errors and unknown characters receive no semantic token. The LSP legend contains only types and modifiers actually used by the provider, and range-based token requests are not advertised.

Semantic token exit criteria:

- [x] `semanticTokensProvider` advertises the exact legend, full-document requests and no range or delta support.
- [x] Feature and stdio tests cover declaration and default-library modifiers, unresolved names, mini-notation tokens and incomplete input.
- [x] Tokens use verified UTF-16 ranges and are never inferred from raw text alone.

Formatting is deliberately narrow: it rewrites only the leading indentation of syntax-verified statements, statement-position comments and block braces. `tabSize` and `insertSpaces` come from standard LSP formatting options, so editor settings provide user preferences without a custom configuration channel. Code text, line breaks, trailing whitespace, string and template contents, multi-line comment bodies and continuation lines are never changed. Documents with syntax errors are left untouched to avoid disrupting live coding; range formatting and whole-expression reflow are not advertised.

Formatting exit criteria:

- [x] `documentFormattingProvider` is advertised and `textDocument/formatting` returns deterministic UTF-16 edits.
- [x] Feature and stdio tests cover statement and nested-block indentation, tab and space preferences, protected string/template/comment content, clean documents, unchanged documents and syntax errors.
- [x] Formatting changes no code tokens and makes no edits when the existing indentation is already correct.

## Phase 8 — Performance harness and targets

Dependencies: working syntax/semantic pipeline.

CI already runs the benchmark runner in a dedicated job, but no workloads, measured percentiles or numeric thresholds exist yet, so performance is not a blocking regression gate.

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
