# Roadmap

Status: re-implementation roadmap updated with completed Phases 0–9, the approved `0.1.0` release identity, reconciled configuration boundary and supported runtime matrix in Phase 10, and the remaining proposed Phase 10–13 work for validation, release governance and controlled first publication, 2026-11-27. Priorities are proposals and remain subject to approval.

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

**Status: complete.** All blocker decisions are resolved. The adopted parser is AGPL-3.0-only and ADR-032 aligns the project licence with it; npm publication remains a Phase 13 authorization gate.

Tasks:

- [x] Resolve the parser licence policy described in `docs/PARSER_INTEGRATION.md`: adopted AGPL-3.0-only by user decision in ADR-032, superseding the earlier MIT plan.
- [x] Obtain approval for a complete `AGENTS.md` section 9.
- [x] Resolve the repository `LICENSE` mismatch described in `docs/DECISIONS.md`.
- [x] Select and approve the test tooling; install the pinned scaffold dependencies.
- [x] Select the exact parser npm version, record provenance and validate compatibility.
- [x] Select and pin authoritative Strudel source versions for metadata generation.
- [x] Record the historical upstream parser licence contradiction; no MIT-corrected release is needed after the AGPL-3.0-only project decision.

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

**Status: quick fixes, rename, document symbols, workspace symbols, semantic tokens, formatting and inline-constant refactoring implemented and verified; the remaining candidates remain under evaluation.**

Dependencies: Phase 6.

Candidate extended capabilities, evaluate and implement only where justified:

- [x] Quick fixes.
- [x] Rename.
- [x] Document symbols.
- [x] Workspace symbols (bounded on-demand workspace scan with open-document overrides).
- [x] Semantic tokens.
- [x] Formatting.
- [x] Code actions and refactoring (narrow inline-constant refactor; broader refactorings remain deferred).

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

Document symbols are derived from the current semantic snapshot: declared variables, functions, parameters and import bindings are returned with exact selection ranges, and a named function owns the declarations in its function scope as children. Catalog-only symbols and declarations whose recorded range no longer matches the source are omitted.

Document symbol exit criteria:

- [x] `documentSymbolProvider` is advertised and `textDocument/documentSymbol` is implemented.
- [x] Feature and stdio tests cover source ranges, inferred type details, function-scope children, catalog-only exclusion and incomplete input.

Workspace symbols use a bounded on-demand scan of workspace folders instead of a persistent index or an open-documents-only search. At request time the server discovers `.strudel` files with file-count, file-size and depth limits, skips hidden and generated directories, parses and analyzes unopened files, and replaces any scanned file with its current in-memory document when that file is open. Results are the verified declarations from each document outline, flattened with container names and matched using relaxed, case-insensitive LSP subsequence matching. No cross-file module graph is inferred and no symbol resolution capability is claimed.

Workspace symbol exit criteria:

- [x] `workspaceSymbolProvider` is advertised and `workspace/symbol` is implemented without resolve support.
- [x] File discovery is deterministic and bounded, and open documents override stale file contents.
- [x] Feature and stdio tests cover relaxed matching, container names, result limits, open-document overrides, unopened workspace files and non-Strudel file exclusion.
- [x] The strategy supersedes the earlier deferral and is recorded in `docs/DECISIONS.md` and `docs/LSP_FEATURES.md`.

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

Code actions remain conservative. Quick fixes continue to cover only validated mini-notation diagnostics. The first refactoring is `refactor.inline`: a single-use `const` binding with a literal initializer is removed, and its one resolved value reference is replaced with the exact initializer source text. Calls, imported or parameter bindings, multiple or assignment references, exported or multi-declarator statements, template substitutions, malformed documents and stale ranges produce no action. The LSP adapter advertises only `quickfix` and `refactor.inline`, with no resolve support.

Code action and refactoring exit criteria:

- [x] `codeActionProvider` advertises only the two implemented kinds and `resolveProvider: false`.
- [x] Inline edits remove the declaration statement and replace exactly one verified literal use.
- [x] Feature and stdio tests cover successful inlining, range filtering, unsafe bindings and malformed input.
- [x] Broader refactorings remain deferred until a usefulness and safety case is recorded.

## Phase 8 — Performance harness and targets

Dependencies: working syntax/semantic pipeline and completed Phase 7 providers.

**Status: implemented and verified with an advisory CI check; performance is not a blocking correctness gate.**

The harness imports compiled layer modules and measures 18 deterministic workloads over synthetic Strudel fixtures. It reports p50, p95 and p99 using nearest-rank percentiles within batches and the median across batches, stores a machine-readable baseline with environment metadata, and compares current runs with measured warning thresholds. Filesystem-backed workspace-symbol discovery is timed as part of that request; fixture preparation and result consumption are excluded from other samples. No production code path or published package contents were changed for instrumentation.

Phase 8 exit criteria:

- [x] Representative small, medium, large, incomplete and workspace fixtures are committed with provenance.
- [x] p50, p95 and p99 are measured for parsing, incremental updates, diagnostics, completion, hover, definition, signature help, document and workspace symbols, formatting, semantic tokens, quick fixes, inline refactoring and rename.
- [x] Numeric warning thresholds are derived from the baseline and documented in `docs/PERFORMANCE.md`.
- [x] `npm run benchmark`, `npm run benchmark:check` and Makefile wrappers are available without new dependencies.
- [x] CI reports benchmark regressions as advisory, preserving correctness checks as the blocking gate.

## Phase 9 — Packaging and release

Dependencies: validated core capabilities and performance baseline.

**Status: complete.** The packaging foundation and local distributable verification are complete; first-release gates and publication are tracked in Phases 10–13.

The package is already ESM with a stdio executable at `dist/src/server.js`, an `AGPL-3.0-only` project licence and a controlled `files` allowlist. Phase 9 replaces the stale prototype README with authoritative package documentation and adds `scripts/verify-package.mjs`, exposed as `npm run verify:package` and `make verify-package`. That check packs the built server, verifies the tarball contents, performs a clean runtime-only offline installation from a temporary project with the committed lockfile, checks the installed licence metadata and text, and exercises the installed executable with an LSP initialize/shutdown handshake. The same command now runs in CI after the package-contents preview.

Tasks:

- [x] Keep editor-specific examples separate.
- [x] Verify AGPL-compatible parser licensing before redistribution: the project and pinned parser are both `AGPL-3.0-only` under ADR-032.
- [x] Verify a clean offline installation with `npm run verify:package`.

Publication was removed from this phase and moved to Phase 13 so the remaining release gates can be implemented and verified as explicit phases.

The pinned `tree-sitter-strudel@2.0.2` declares `AGPL-3.0-only` and bundles a matching AGPL licence, so the earlier MIT-corrected release requirement is superseded. No `npm publish` has been performed or authorized.

## Release baseline and open gaps

The following findings define the starting state for Phases 10–13. Each open gap is assigned to a phase below rather than left in a flat checklist.

- The package name `strudel-lsp-server` returned 404 from the npm registry on 2026-11-27; availability must be rechecked at release time.
- Runtime support is now declared as Node 24/26 with npm 11 in ADR-035; CI still tests only those Node majors on Ubuntu, so cross-platform validation remains for Phase 11.
- The manifest version is now `0.1.0` under ADR-033, but the repository has no Git tags.
- Diagnostic enablement/severity and Strudel version selection were documented ambiguously; they are now explicitly deferred for `0.1.0` in ADR-034 and the feature documentation.
- Parser validation still has an unchecked real-Strudel-corpus item; committed benchmark fixtures are synthetic and measure layer boundaries rather than an editor process.
- CI verifies correctness and package contents but has no controlled publish workflow or provenance/trusted-publishing configuration.

## Phase 10 — Release identity and compatibility metadata

Dependencies: Phase 9 packaging foundation.

**Status: in progress. The release identity is approved under ADR-033; compatibility metadata remains.**

Tasks:

- [x] Decide the release identity: the first public version is `0.1.0`, tags use `vX.Y.Z`, and pre-1.0 SemVer is recorded in ADR-033. `1.0.0` remains reserved for a documented stability commitment.
- [x] Reconcile configuration documentation with behaviour: no custom configuration channel exists in `0.1.0`; diagnostic overrides and Strudel version selection are explicitly deferred in ADR-034, while standard LSP formatting options remain the only user preference.
- [x] Define and declare supported runtimes: both Node 24 and 26 are release-supported with npm 11; `engines` is declared and the required Linux x64, macOS arm64 and Windows x64 matrix is recorded in ADR-035.
- [ ] Final README and manifest review: installation command, supported versions, known limitations, legacy prototype separation, and accurate `repository`, `homepage` and `bugs` metadata.

Exit criteria:

- [x] Version, tag format and SemVer policy are recorded and approved in ADR-033.
- [x] Configuration documentation matches implemented behaviour and explicitly deferred items in ADR-034.
- [x] `engines.node`, `engines.npm` and the supported runtime/OS matrix are documented in ADR-035.
- [ ] README and manifest metadata accurately describe the first-release scope.

## Phase 11 — Compatibility and robustness validation

Dependencies: Phase 10 runtime and OS matrix.

**Status: not started. The required validation matrix is defined in ADR-035.**

Tasks:

- [ ] Perform clean-room installs on every required OS/Node/npm combination from ADR-035. Test both `npm install` with scripts enabled and the existing `--ignore-scripts` path; confirm native parser prebuilds load without requiring a compiler.
- [ ] Exercise the installed `strudel-lsp-server` executable's stdio handshake on Linux, macOS and Windows, using the platform-specific bin shim where applicable.
- [ ] Validate the parser and semantic engine against a small corpus of real Strudel compositions from authoritative documentation or examples, without copying those compositions into the package.
- [ ] Complete a protocol robustness review for stdout purity, malformed JSON-RPC, unknown methods, invalid parameters, `$/cancelRequest`, rapid edits, no-workspace and multi-root initialization, document closure, shutdown and exit codes.

Exit criteria:

- [ ] Every required OS/Node/npm combination in ADR-035 passes clean-room installation with and without install scripts where applicable.
- [ ] Native parser prebuilds work without requiring a local compiler.
- [ ] Installed executable handshakes pass on every required platform in ADR-035.
- [ ] Real-corpus validation and protocol robustness evidence are recorded, with no copied compositions in the package.

## Phase 12 — Release governance and automation

Dependencies: Phases 10 and 11.

**Status: not started.**

Tasks:

- [ ] Recheck npm namespace/ownership immediately before publication, including account access, 2FA or trusted-publisher setup, and the exact unscoped package name.
- [ ] Complete a licensing/provenance sign-off: AGPL notices in the distributed artifact, pinned dependency licences, generated metadata provenance, no copied grammar/parser/binding source, no secrets, and a public source URL in package metadata and README. This is a release review, not legal advice.
- [ ] Re-run the final dependency and secret audit on the release commit: `npm audit --omit=dev` as a blocking gate, full `npm audit` reviewed, prototype client audit reviewed, and a runtime check confirming no telemetry or network use by the stdio server.
- [ ] Add a controlled release workflow: tag or GitHub release trigger, manual approval environment, pinned actions, immutable release commit, npm trusted publishing/OIDC with automatic provenance, no automatic publish from ordinary commits, and no long-lived npm token when trusted publishing is available. Source: <https://docs.npmjs.com/trusted-publishers>.
- [ ] Run `npm publish --dry-run` from the exact release commit and compare its file list, licence, manifest and executable entry point with `npm pack --dry-run` and `scripts/verify-package.mjs`.
- [ ] Prepare versioned `CHANGELOG.md` entries and GitHub release notes covering supported Strudel/Node versions, implemented capabilities, explicit limitations, installed-package verification and known issues.
- [ ] Decide and document rollback policy before publishing: npm versions are immutable, so define whether a correction uses a patch release, deprecation or unpublish request, and how users will be notified.
- [ ] Define the post-publication smoke plan: verify registry metadata and licence, install from the public registry on a clean machine, run the stdio handshake, confirm the documented launch command, and create the Git/GitHub release record.

Exit criteria:

- [ ] Licensing, provenance and audit sign-offs are recorded with evidence.
- [ ] The release workflow is validated without publishing and produces provenance.
- [ ] Publish dry-run matches the verified package contents and manifest.
- [ ] Changelog, release notes, rollback policy and post-publication plan are ready for the exact release commit.

## Phase 13 — Controlled first publication

Dependencies: Phases 10–12 and explicit release authorization.

**Status: blocked pending explicit release authorization.**

Tasks:

- [ ] Obtain explicit authorization naming the exact version to publish and the operator who will run the release.
- [ ] Confirm every blocking gate is checked or has an explicit, approved exception recorded in `docs/DECISIONS.md`.
- [ ] Confirm CI is green on the exact tagged release commit, including package verification and dependency audit.
- [ ] Tag the validated commit and create the GitHub release record.
- [ ] Publish through the controlled workflow with provenance and no ordinary-commit publication path.
- [ ] Execute the post-publication smoke plan: verify registry metadata and licence, install from the public registry on a clean machine, run the stdio handshake, confirm the documented launch command, and verify release notes/tag.

Exit criteria:

- [ ] Explicit authorization for the exact version is recorded.
- [ ] Publication uses the controlled workflow and provenance is generated.
- [ ] Public registry metadata, licence and installed executable smoke checks pass.
- [ ] Git tag, GitHub release record and versioned changelog are present.

## Release-quality backlog (recommended, not blocking)

These items may be pulled into Phases 10–12 when capacity allows. Deferring one does not block first publication, but each deferral should be intentional and visible in release notes where user-facing.

- [ ] Perform editor-level smoke tests with at least two independent LSP clients using configuration kept outside the server core. Record which client behaviours were checked, not editor-specific implementation details in the server.
- [ ] Add deterministic stdio error-path tests for malformed input and cancellation; current cancellation coverage is strongest at the semantic-engine layer.
- [ ] Add a bounded soak test with rapid edits, repeated initialize/shutdown cycles and memory-growth observation to catch live-coding lifecycle leaks.
- [ ] Review workspace-symbol discovery for symlinks, path traversal, multi-root folders, unreadable files and size/depth limits; add tests where behaviour is currently assumed.
- [ ] Measure at least one end-to-end request path through JSON-RPC and the installed binary. The committed benchmark is deliberately layer-level and should not be presented as full editor latency.
- [ ] Decide whether to include `CHANGELOG.md`, TypeScript sources or source maps in the npm `files` allowlist. The current allowlist is intentionally minimal; any change must be reflected in package verification.
- [ ] Record a dependency-update policy for Strudel, the parser and Node: what triggers compatibility retesting and when the pinned metadata snapshot may be regenerated.
- [ ] Consider a generated SBOM or release attestation. This is optional for the first release and must not introduce a dependency without separate approval.
- [ ] Add issue templates or a support section that tells users which diagnostics and server logs to include, while preserving privacy and avoiding secret disclosure.
- [ ] Verify installation when the consumer does not inherit this repository's `.npmrc`, especially the `legacy-peer-deps=true` setting.

## Deferred until after the first release

- [ ] Replace synthetic benchmark fixtures with representative real-world workloads once provenance and redistribution terms are confirmed.
- [ ] Optimise incremental semantic reuse; current large-document updates rebuild the semantic snapshot and are documented in `docs/PERFORMANCE.md`.
- [ ] Add production-side timing hooks or live-editor telemetry only if a concrete latency question requires them; no telemetry is part of the first release.
- [ ] Continue evaluating folding, selection ranges, inlay hints, call hierarchy, completion resolution, range formatting, broader refactoring and cross-file navigation under the existing deferred-capability policy.

## Deferred / explicitly not planned

- Complete JavaScript or TypeScript compiler/type checker.
- Standalone binary distribution in the initial release.
- Editor-specific dependencies in the server core.
- Folding, selection ranges, inlay hints and call hierarchy until their value is demonstrated.

## Transition constraint

The six tracked files modified before preparation remain user work and must be preserved. Later changes made with approval include `LICENSE`, `package.json`, `package-lock.json`, the completed `AGENTS.md` section 9 and documents under `docs/`. Prototype source files are not removed or overwritten until an explicit retirement decision is made and the user changes are preserved.
