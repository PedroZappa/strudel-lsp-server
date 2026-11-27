# Roadmap

Status: re-implementation roadmap complete through Phase 15, with Phases 16–22 complete. `strudel-lsp-server@0.4.0` was published on 2026-11-27 from tag `v0.4.0` at commit `1d39c14cba2152116ce1c2c5d5b827bf6af5c144` through the controlled OIDC workflow with `pedrozappa` as operator and is the latest release; `0.3.0`, `0.2.0` and `0.1.0` remain available. ADR-060 records the exact publication authorization and ADR-061 records the registry, signature, provenance and smoke evidence for `0.2.0`. ADR-051 records the scope and deferred work, ADR-052 records the configuration contract, ADR-053 records the filesystem boundary, ADR-054 records the `.npmrc` removal, ADR-055 records hermetic pack caching, ADR-056 records the advisory soak/lifecycle design, ADR-057 records the separate advisory benchmark report, ADR-058 records the independent editor-client smoke evidence, ADR-059 records the release-preparation authorization, ADR-062 records publication-state-aware verification, ADR-063 records the initial v1 stability charter, ADR-064 records the Phase 17 package, support and SBOM decisions, and ADR-065 records the Phase 18 parser, metadata and platform compatibility closure, ADR-066 authorizes the exact Phase 19 publication, ADR-067 records its publication and smoke evidence, ADR-070 records the registry-visibility wait, ADR-071 authorizes the exact Phase 22 publication and ADR-072 records its publication and smoke evidence. Missing provenance for the operator-managed first publish is recorded in ADR-050. The feature-expanded route below describes proposed work through `v1.0.0`, split into `v0.3.0`, `v0.4.0`, `v0.5.0` and `v1.0.0` increments. Phases 16–22 are complete; Phases 23–27 remain proposed and subject to approval.

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

**Status: complete.** All blocker decisions are resolved. The adopted parser is AGPL-3.0-only and ADR-032 aligns the project licence with it. Publication was a Phase 13 authorization gate; the `0.2.0` publication was later authorized and completed under ADR-060 and ADR-061.

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

The pinned `tree-sitter-strudel@2.0.2` declares `AGPL-3.0-only` and bundles a matching AGPL licence, so the earlier MIT-corrected release requirement is superseded. At the Phase 9 baseline, no `npm publish` had been performed or authorized; later publications are recorded in ADR-050 and ADR-061.

## Release baseline and open gaps

The following findings define the starting state for Phases 10–13. Each open gap is assigned to a phase below rather than left in a flat checklist.

- The package name `strudel-lsp-server` returned 404 from the npm registry on 2026-11-27; availability must be rechecked at release time.
- Runtime support is now declared as Node 24/26 with npm 11 in ADR-035; CI still tests only those Node majors on Ubuntu, so cross-platform validation remains for Phase 11.
- At that baseline, the manifest version was `0.1.0` under ADR-033 and the repository had no Git tags.
- Diagnostic enablement/severity and Strudel version selection were documented ambiguously; they are now explicitly deferred for `0.1.0` in ADR-034 and the feature documentation.
- Real-Strudel-corpus validation is complete against 484 pinned documentation examples with derived evidence in `validation/real-corpus.json`; committed benchmark fixtures remain synthetic and measure layer boundaries rather than an editor process.
- CI verifies correctness and package contents but has no controlled publish workflow or provenance/trusted-publishing configuration.

## Phase 10 — Release identity and compatibility metadata

Dependencies: Phase 9 packaging foundation.

**Status: complete. The release identity, configuration boundary, runtime matrix and final package review are recorded.**

Tasks:

- [x] Decide the release identity: the first public version is `0.1.0`, tags use `vX.Y.Z`, and pre-1.0 SemVer is recorded in ADR-033. `1.0.0` remains reserved for a documented stability commitment.
- [x] Reconcile configuration documentation with behaviour: no custom configuration channel exists in `0.1.0`; diagnostic overrides and Strudel version selection are explicitly deferred in ADR-034, while standard LSP formatting options remain the only user preference.
- [x] Define and declare supported runtimes: both Node 24 and 26 are release-supported with npm 11; `engines` is declared and the required Linux x64, macOS arm64 and Windows x64 matrix is recorded in ADR-035.
- [x] Final README and manifest review: installation command, supported versions, known limitations and legacy prototype separation are explicit; `repository`, `homepage` and `bugs` metadata are accurate and covered by a package metadata contract test.

Exit criteria:

- [x] Version, tag format and SemVer policy are recorded and approved in ADR-033.
- [x] Configuration documentation matches implemented behaviour and explicitly deferred items in ADR-034.
- [x] `engines.node`, `engines.npm` and the supported runtime/OS matrix are documented in ADR-035.
- [x] README and manifest metadata accurately describe the first-release scope.

## Phase 11 — Compatibility and robustness validation

Dependencies: Phase 10 runtime and OS matrix.

**Status: clean-install, installed-handshake, real-corpus and protocol robustness validation are complete.**

Tasks:

- [x] Perform clean-room installs on every required OS/Node/npm combination from ADR-035. The six-job matrix passed both install modes, native parser prebuild loading and a no-compilation check in run `45990023185`.
- [x] Exercise the installed `strudel-lsp-server` executable's stdio handshake on Linux, macOS and Windows, using the platform-specific bin shim where applicable. Each matrix job completed the installed handshake.
- [x] Validate the parser and semantic engine against a small corpus of real Strudel compositions from authoritative documentation or examples, without copying those compositions into the package. All 484 non-empty JSDoc examples in pinned `@strudel/reference@1.2.2` were parsed, analyzed and incrementally updated with zero invariant failures; derived evidence is in `validation/real-corpus.json` and findings are in `docs/PARSER_INTEGRATION.md` and ADR-037.
- [x] Complete a protocol robustness review for stdout purity, malformed JSON-RPC, unknown methods, invalid parameters, `$/cancelRequest`, rapid edits, no-workspace and multi-root initialization, document closure, shutdown and exit codes. Eight raw stdio tests in `test/protocolRobustness.test.ts` cover every listed path; findings and decisions are in `docs/TESTING_STRATEGY.md` and ADR-038.

Exit criteria:

- [x] Every required OS/Node/npm combination in ADR-035 passes clean-room installation with and without install scripts where applicable, recorded in run `45990023185`.
- [x] Native parser prebuilds work without requiring a local compiler; no parser `build` directory was created in any matrix job.
- [x] Installed executable handshakes pass on every required platform in ADR-035.
- [x] Real-corpus validation evidence is recorded in `validation/real-corpus.json` with no copied compositions in the package.
- [x] Protocol robustness evidence is recorded in `docs/TESTING_STRATEGY.md` and ADR-038, with the deterministic suite exposed as `npm run test:protocol` and `make test-protocol`.

## Phase 12 — Release governance and automation

Dependencies: Phases 10 and 11.

**Status: complete. Phase 12 preparation and its publication-dependent validation were completed during Phase 13; evidence and the provenance limitation are recorded in ADR-050.**

Tasks:

- [x] Recheck npm namespace/ownership immediately before publication, including account access, 2FA or trusted-publisher setup, and the exact unscoped package name. Verified on 2026-11-27: exact unscoped name `strudel-lsp-server` remains unregistered on `https://registry.npmjs.org/`, repository ownership is `PedroZappa`, `npm whoami` returns `pedrozappa`, and `npm profile get` reports `two-factor auth: auth-and-writes` after operator setup. Trusted publishing cannot be configured until the package exists, so 2FA satisfies this gate; name availability must be rechecked immediately before publication. Evidence: ADR-039.
- [x] Complete a licensing/provenance sign-off: AGPL notices in the distributed artifact, pinned dependency licences, generated metadata provenance, no copied grammar/parser/binding source, no secrets, and a public source URL in package metadata and README. This is a release review, not legal advice. Verified against the 132-file tarball, exact-pinned lockfile, regenerated metadata, tracked-file secret scan and installed-package check; evidence and repeat-before-publication requirement in ADR-040.
- [x] Re-run the final dependency and secret audit on the release commit: `npm audit --omit=dev` as a blocking gate, full `npm audit` reviewed, prototype client audit reviewed, and a runtime check confirming no telemetry or network use by the stdio server. Both root audits and both prototype audits reported zero findings; a tracked-file secret scan found zero hits; an instrumented stdio handshake produced zero network API calls. Evidence for commit `c6a9200` in ADR-041.
- [x] Add a controlled release workflow: tag or GitHub release trigger, manual approval environment, pinned actions, immutable release commit, npm trusted publishing/OIDC with automatic provenance, no automatic publish from ordinary commits, and no long-lived npm token when trusted publishing is available. `.github/workflows/release.yml` publishes only from `v*` tags after `npm-release` approval, with OIDC `id-token: write`, pinned actions and no token reference; `scripts/verify-release.mjs` enforces tag/commit integrity and dry-run parity. Source: <https://docs.npmjs.com/trusted-publishers>. Design, validation evidence and the unresolved first-publish bootstrap decision are in ADR-042.
- [x] Run `npm publish --dry-run` from the exact release commit and compare its file list, licence, manifest and executable entry point with `npm pack --dry-run` and `scripts/verify-package.mjs`. Verified on the current candidate (HEAD `c6a9200`, no tag yet): `npm run verify:release` compared both dry-runs in an isolated copy across 132 files, manifest, AGPL licence and node shebang entry point; `npm run verify:package` passed both offline install modes. Point-in-time evidence in ADR-043; repeat on the exact tagged commit before publication.
- [x] Prepare versioned `CHANGELOG.md` entries and GitHub release notes covering supported Strudel/Node versions, implemented capabilities, explicit limitations, installed-package verification and known issues. `CHANGELOG.md` now has a versioned `0.1.0` section and `.github/RELEASE_TEMPLATE.md` is the prepared GitHub release body; both must be confirmed on the exact tagged commit. Evidence and rationale in ADR-044.
- [x] Decide and document rollback policy before publishing: npm versions are immutable, so define whether a correction uses a patch release, deprecation or unpublish request, and how users will be notified. Corrections use a new patch tag through the controlled workflow; known-bad versions are deprecated; dist-tag changes and unpublishing are exceptional operator actions requiring explicit authorization. Notification uses npm deprecation warnings, changelog, GitHub release notes and a linked issue. Policy and official npm evidence in ADR-045; the user-facing summary is in `.github/RELEASE_TEMPLATE.md`.
- [x] Define the post-publication smoke plan: verify registry metadata and licence, install from the public registry on a clean machine, run the stdio handshake, confirm the documented launch command, and create the Git/GitHub release record. The executable checklist is in `docs/TESTING_STRATEGY.md`; the release may be drafted after tagging but is published only after the checks pass. Decision and failure handling in ADR-046.

Exit criteria:

- [x] Licensing, provenance and audit sign-offs are recorded with evidence in ADR-040 and ADR-041.
- [x] The release workflow is validated without publishing. Exact-tag run `46015208619` succeeded with the publish job skipped for `v0.1.0` under ADR-049. Provenance was not produced for the operator-managed first publish; its absence is recorded under ADR-042, ADR-049 and ADR-050, and later OIDC releases use the controlled workflow.
- [x] Publish dry-run matches the verified package contents and manifest. `npm run verify:release` passed on exact tag `v0.1.0`; the published tarball shasum and integrity match the verified artifact (ADR-043, ADR-050).
- [x] Changelog, release notes, rollback policy and the post-publication smoke plan are prepared on the exact release commit and the plan was executed after publication (ADR-044–ADR-046, ADR-050).

## Phase 13 — Controlled first publication

Dependencies: Phases 10–12 and explicit release authorization.

**Status: complete. `0.1.0` was published by operator `pedrozappa` from the exact `v0.1.0` commit, GitHub release `v0.1.0` is published, and smoke checks passed. ADR-047–ADR-050 record authorization, gate review, bootstrap exception and publication evidence.**

Tasks:

- [x] Obtain explicit authorization naming the exact version to publish and the operator who will run the release. Authorized on 2026-11-27 for exactly `strudel-lsp-server@0.1.0` with `pedrozappa` as operator; scope, limits and remaining gates in ADR-047.
- [x] Confirm every blocking gate is checked or has an explicit, approved exception recorded in `docs/DECISIONS.md`. ADR-048 records the review, ADR-049 the first-publish bootstrap exception, and ADR-050 the exact-tag, GitHub-setting and smoke evidence.
- [x] Confirm CI is green on the exact tagged release commit, including package verification and dependency audit. Run `46015208619` succeeded on commit `271da3738ce1e81161fd0087c17ebe06e7870b06`; the publish job was skipped for `v0.1.0`.
- [x] Tag the validated commit and create the GitHub release record. Local tag `v0.1.0` was pushed; release <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.1.0> was drafted first and published after smoke checks.
- [x] Publish `0.1.0` with the ADR-049 operator-managed bootstrap and no workflow publish or ordinary-commit publication path. Operator `pedrozappa` performed the publish and confirmed trusted publishing was configured afterward for later controlled OIDC releases; the agent handled no credential or 2FA value.
- [x] Execute the post-publication smoke plan defined in ADR-046 and `docs/TESTING_STRATEGY.md`: registry metadata/licence, signed tarball, clean installs, installed stdio handshake, documented launch command, tag and release notes all verified; provenance absence recorded (ADR-050).

Exit criteria:

- [x] Explicit authorization for the exact version is recorded in ADR-047: `strudel-lsp-server@0.1.0`, operator `pedrozappa`.
- [x] `0.1.0` publication uses the approved ADR-049 bootstrap with no workflow publish; no provenance attestation was produced, and its absence is recorded under ADR-042, ADR-049 and ADR-050.
- [x] Public registry metadata, licence, tarball identity, signatures and installed executable smoke checks pass (ADR-050).
- [x] Git tag `v0.1.0`, published GitHub release and versioned changelog section are present.

## Phase 14 — v0.2.0 hardening and configuration

Dependencies: Phase 13 and explicit approval of the v0.2.0 scope recorded in ADR-051. This phase prepares changes; it does not publish a release.

**Status: all Phase 14 tasks are implemented and verified, including the final documentation reconciliation and full validation gate. Phase 14 itself did not publish a release; the resulting `0.2.0` release was separately authorized and completed in Phase 15.**

Tasks:

- [x] Add a focused diagnostics configuration through standard `workspace/configuration`: a global enable flag, optional per-code severity overrides including suppression, and defaults unchanged from `0.1.0` when the client has no configuration capability. Cover `syntax-error`, `unknown-global`, `unknown-pattern-method` and the four mini-notation issue codes. Do not expose internal engine settings, and cover dynamic changes through `workspace/didChangeConfiguration`. Implemented with isolated parsing/application, provider and quick-fix integration, feature/configuration/protocol/stdio regression coverage and ADR-052; the other Phase 14 tasks are tracked below.
- [x] Harden bounded workspace-symbol discovery for symlinks, path traversal, unreadable files and file-size/depth limits. Preserve open-document overrides and deterministic results; do not introduce a persistent index, file watcher or cross-file module graph. Implemented with normalized roots, explicit symlink and unsafe-name rejection, locale-independent ordering, an injectable filesystem test seam, three `test/lsp/` regression tests and ADR-053.
- [x] Verify installation in a clean consumer environment that does not inherit this repository's `.npmrc`, especially `legacy-peer-deps=true`. Narrow or remove that setting only after compatibility is demonstrated, and record the decision with evidence. Implemented with `npm run verify:consumer`, `make verify-consumer`, CI coverage, removal of `.npmrc` and ADR-054.
- [x] Add a bounded soak/lifecycle test covering rapid edits, repeated initialize/shutdown cycles and memory-growth observation. `test/soakLifecycle.test.ts` runs three process cycles with 64 rapid edits each, asserts clean transport, final document state and exit codes, and reports RSS observations from `ps` as advisory diagnostics without production telemetry; see ADR-056.
- [x] Add one end-to-end JSON-RPC/installed-binary workload to the benchmark suite. `scripts/benchmark-e2e.mjs` packs and installs the built tarball offline, drives `textDocument/didChange` plus `textDocument/documentSymbol` through the installed bin, and writes p50/p95/p99 to the separate advisory `benchmarks/end-to-end.json`; see ADR-057.
- [x] Execute two independent LSP-client smoke tests with client configuration kept outside the server core. `scripts/smoke-clients.mjs` runs VS Code through `vscode-languageclient` and Neovim through its built-in LSP client against the built stdio server; `validation/client-smoke.json` records six behaviours and passing results for both. See ADR-058.
- [x] Update `docs/LSP_FEATURES.md`, `docs/TESTING_STRATEGY.md`, `docs/PERFORMANCE.md`, README and CHANGELOG as each behaviour lands. The final reconciliation corrected configuration delivery wording, current test counts, advisory benchmark descriptions, command/layout lists and historical point-in-time evidence; no planned behaviour is described as implemented. The final gate passed 85/85 tests plus focused suites, corpus validation, package verification, audits, benchmarks and both client smoke runs.

Exit criteria:

- [x] Diagnostics configuration is implemented, documented and covered by feature, protocol and stdio tests; default behaviour remains unchanged.
- [x] Workspace-symbol filesystem edge cases have deterministic regression coverage and bounded limits remain enforced.
- [x] Consumer installation without inherited npm configuration passes, and the `.npmrc` decision is recorded.
- [x] Bounded soak evidence is recorded without new core dependencies or production telemetry, and two-client editor smoke evidence records passing VS Code and Neovim runs outside the published server.
- [x] A separate advisory `benchmarks/end-to-end.json` records JSON-RPC p50/p95/p99 from the installed binary. This refines the earlier "baseline and advisory check" wording: per ADR-051 the result is reported separately and has no thresholds, while `benchmark:check` keeps its 18 layer-level workloads.
- [x] Full validation gate passes after the changes, and documentation matches implementation. `make verify-all`, focused suites, corpus validation, consumer install verification, advisory benchmarks, dependency audits and both client smoke runs passed; the final reconciliation is recorded in `docs/TESTING_STRATEGY.md`.

## Phase 15 — v0.2.0 controlled release

Dependencies: Phase 14, the release-preparation authorization in ADR-059 naming `0.2.0` and operator `pedrozappa`, and the exact publication authorization in ADR-060 for the controlled OIDC workflow.

**Status: completed. `0.2.0` was published on 2026-11-27 from `v0.2.0` at `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488`. The exact-tag validation job passed and the controlled publish job ran with `npm-release` approval; the original run's final verification step failed only because npm had not yet made the version visible, and the checks were repeated successfully from a clean install. A validation-only dispatch after publication fails at dry-run parity because the immutable version now exists on the registry. Evidence and the workflow-verification limitation are recorded in ADR-061.**

Tasks:

- [x] Repeat type checking, linting, formatting, focused suites, full tests, package verification, dependency audit and benchmark check on the exact release commit. The candidate gate passed 85/85 tests, all focused suites, package and consumer-install verification, 18/18 benchmarks, corpus validation, audits and both client smoke runs; evidence is in `docs/TESTING_STRATEGY.md`.
- [x] Prepare a versioned `CHANGELOG.md` section and GitHub release notes from `.github/RELEASE_TEMPLATE.md`; state what changed and what remains deferred. The published notes supersede the candidate wording and link to the versioned changelog section.
- [x] Tag the validated commit as `v0.2.0` after explicit authorization and run the controlled workflow with `npm-release` approval; the ADR-049 bootstrap exception did not apply. Workflow run `46038153400` published the exact version; no local publish occurred.
- [x] Verify the OIDC provenance attestation exists and matches the package, repository, workflow and commit. The SLSA v1 attestation subject digest, `refs/tags/v0.2.0`, repository, workflow path and resolved commit all matched; absence or mismatch would have blocked completion.
- [x] Run the ADR-046 post-publication smoke plan against the public registry and publish the GitHub release only after it passes. Registry metadata, tarball identity, signatures, provenance, clean installs and installed stdio handshake passed.

Exit criteria:

- [x] Exact-tag validation CI was green before publication and the publish job ran through the controlled workflow with `npm-release` approval, not an operator-managed local publish. The original run's final verification step failed transiently after publication; see ADR-061.
- [x] Published `0.2.0` metadata, tarball identity, signatures and provenance attestation are verified and recorded in ADR-061 and `docs/TESTING_STRATEGY.md`.
- [x] Clean installs, installed stdio handshake, documented launch command, tag and release notes pass smoke checks. The GitHub release is `v0.2.0` with no binary assets.
- [x] The published release notes state the remaining deferred work, and no unapproved registry mutation occurs. No deprecation, dist-tag change, unpublish or retag was performed.

Post-release hardening: ADR-062 makes `npm run verify:release` publication-state aware. Future tags and workflow dispatches from the updated tree with `ref: v0.2.0` verify registry artifact identity instead of calling `npm publish --dry-run`, which npm rejects for immutable versions; a rerun of the historical tag itself still uses its old workflow. This does not change the published `0.2.0` artifact, tag or GitHub release.

## Proposed feature-expanded route to `v1.0.0`

**Status: Phases 16–22 are complete; Phases 23–27 are proposed only and are not authorized for implementation or release.** This route includes every optional capability identified after `0.2.0` and splits the work into four independently verifiable increments. Each controlled release requires its own ADR naming the exact version, tag and operator; no release below is approved by the roadmap alone.

| Increment | Phases | Theme                                                  |
| --------- | ------ | ------------------------------------------------------ |
| `v0.3.0`  | 16–19  | Contract, compatibility and release-process foundation |
| `v0.4.0`  | 20–22  | Semantic depth and mini-notation structure             |
| `v0.5.0`  | 23–25  | Editor ergonomics, navigation and scale                |
| `v1.0.0`  | 26–27  | Stability freeze and controlled publication            |

Dependency chain:

```text
16 → 17 → 18 → 19
  ↘ 20 → 21 → 22
  ↘ 23 → 24 → 25
19, 22, 25 → 26 → 27
```

### Phase 16 — v1 stability charter (complete, `v0.3.0`)

Dependencies: Phase 15 and ADR-033, which reserves `1.0.0` for a separate stability decision.

**Status: complete for the initial charter. It is a baseline that Phases 20–24 may extend and Phase 26 freezes; it does not authorize feature implementation or publication.**

Tasks:

- [x] Draft a new ADR defining the initial v1 public contract: package name and executable, Node/npm range, LSP capability surface, configuration schema, diagnostic-code naming and severity semantics, parser and language-metadata pins, supported platform matrix, supported Strudel snapshot, non-goals, and SemVer rules for `1.x`. ADR-063 records the baseline contract.
- [x] Revisit ADR-034 and decide whether `strudelLsp.diagnostics.enabled` and severity overrides are stable, additive-only or still provisional. ADR-063 makes the diagnostics surface stable-additive for v1 and leaves Strudel version selection deferred.
- [x] Record the amendment process: Phases 20–24 may extend the contract, and Phase 26 freezes it before `v1.0.0`. ADR-063 records the amendment and SemVer rules.

Exit criteria:

- [x] The stability ADR is accepted and referenced as authoritative for the v1 route.
- [x] Documentation distinguishes stable contract, known limitation, post-v1 candidate and standing non-goal.
- [x] A contract-test plan exists for capabilities, configuration, diagnostic codes and deliberately unsupported capabilities.

### Phase 17 — Documentation, packaging and support readiness (complete, `v0.3.0`)

Dependencies: Phase 16.

**Status: complete. ADR-064 records the retained npm allowlist, support guidance and SBOM decision. It does not authorize a version bump, tag or publication.**

Tasks:

- [x] Reconcile stale `0.1.0`, “unreleased”, “no publish authorized”, historical tag and point-in-time test-count wording in authoritative docs; preserve historical ADRs as explicitly historical rather than rewriting their meaning. The decision index labels pre-publication ADR statements as point-in-time records, and current-status documents now name `0.2.0` as published.
- [x] Decide the npm `files` allowlist: compiled code and licence only, or also changelog, TypeScript sources and source maps. Update package verification to match the decision. ADR-064 retains `['dist/src', 'LICENSE']`; the existing package, release and manifest verifiers are covered by new documentation-contract tests.
- [x] Add support guidance or issue templates describing which diagnostics, server logs and reproduction details users should supply without disclosing secrets. `README.md` now has a stable `Reporting problems` section.
- [x] Decide explicitly whether to generate an SBOM or additional release attestation; do not add a dependency without separate approval. ADR-064 defers SBOM generation to the Phase 26 review and adds no dependency.
- [x] Add machine-checkable documentation-contract tests where the expected wording is stable. `test/releaseWorkflow.test.ts` covers ADR-064, the manifest and verifiers, README support guidance, Phase 17 completion and the immutable release body.

Exit criteria:

- [x] No authoritative document contradicts the current release state or describes planned Phase 16–27 behaviour as already implemented.
- [x] The package allowlist, support policy and SBOM decision are recorded and reflected in validation.
- [x] The published `v0.2.0` release body in `.github/RELEASE_TEMPLATE.md` is not rewritten to describe later work.

### Phase 18 — Parser, metadata and platform compatibility closure (complete, `v0.3.0`)

Dependencies: Phase 17.

**Status: complete. ADR-065 accepts the two pinned upstream parser gaps, names Strudel `1.2.6` as the language snapshot, records the dependency-update policy and confirms the support matrix. It does not authorize a version bump, tag or publication.**

Tasks:

- [x] Resolve or formally accept the two known upstream grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. ADR-065 formally accepts both for `tree-sitter-strudel@2.0.2`; the grammar remains a versioned dependency and is not vendored, patched or locally worked around.
- [x] Name the supported Strudel snapshot explicitly: Strudel `1.2.6` is the language snapshot for core/mini/transpiler, while `@strudel/reference@1.2.2` is only the pinned JSDoc metadata source.
- [x] Record a dependency-update policy covering Strudel, the parser, Tree-sitter and Node: triggers for metadata regeneration, corpus reruns, compatibility reruns and SemVer impact. ADR-065 defines the triggers and ADR-063/ADR-033 supply the SemVer rules.
- [x] Confirm the supported matrix as Linux x64, macOS arm64 and Windows x64 on Node 24/26, with other prebuild platforms explicitly best-effort or separately validated. `.github/workflows/compatibility.yml` covers the confirmed matrix.
- [x] Refresh `validation/real-corpus.json` and document any accepted unresolved-reference baseline. Regeneration from the final pins was byte-identical: 484 examples, 477 clean parses, seven accepted parser gaps and 1,308 unresolved references.

Exit criteria:

- [x] Corpus validation passes on the final pins with no invariant failures.
- [x] Parser integration tests remain separate from semantic-engine tests, and no grammar or generated parser is copied into this repository.
- [x] ADR-065 states whether parser or metadata upgrades are patch, minor or major events under the v1 contract.

### Phase 19 — `v0.3.0` controlled release (complete)

Dependencies: Phases 16–18 and an exact publication ADR naming `strudel-lsp-server@0.3.0`, tag `v0.3.0` and the operator.

Tasks:

- [x] Repeat the full gate on the exact candidate: typecheck, lint, formatting, all test suites, corpus validation, package and consumer verification, benchmarks, audits and client smoke runs. The candidate gate passed with 94/94 tests and the evidence recorded under ADR-066.
- [x] Ensure the release tag carries ADR-062 publication-state-aware verification. The tagged workflow and post-publication rerun compared registry identity rather than calling an immutable publish dry-run.
- [x] Publish only through the controlled OIDC workflow with `npm-release` approval. Run `46049593155` published the exact candidate; no local publish occurred.
- [x] Verify provenance, signatures, registry metadata, tarball identity, clean installs and installed stdio handshake, then publish release notes generated from the exact candidate. Evidence is in ADR-067 and the `v0.3.0` GitHub release.

Exit criteria:

- [x] Exact-tag CI is green before publication and the controlled publish job succeeds. Validation job `140677309030` passed and publish job `140677717483` succeeded; the final verification step failed transiently with `ETARGET` and was independently repeated, as recorded in ADR-067.
- [x] Post-publication evidence is recorded in ADR-067, `CHANGELOG.md`, `.github/RELEASE_NOTES_v0.3.0.md` and the published GitHub release.
- [x] No deprecation, manual dist-tag change, unpublish, retag or other unapproved registry mutation occurred.

### Phase 20 — Semantic depth and reference resolution (complete, unreleased)

Dependencies: Phase 19. ADR-068 records the evidence-backed alias, sample, inference and signature decisions.

Tasks:

- [x] Add deterministic sample-name resolution where metadata supports an unambiguous match, without guessing unresolved names.
- [x] Add usage-based inference for common pattern parameters and preserve conservative suppression when evidence is insufficient.
- [x] Extend signature models with richer labels, overloads, rest parameters and user-defined function signatures where the syntax tree provides reliable evidence.
- [x] Reduce the unresolved-reference baseline in `validation/real-corpus.json` and document every remaining category.
- [x] Add semantic-engine tests that do not depend on Tree-sitter APIs.

Exit criteria:

- [x] New semantic behaviour is covered by focused tests and corpus evidence.
- [x] No new false-positive diagnostics appear in live-coding fixtures with incomplete or malformed input.
- [x] Documentation distinguishes resolved, conservatively suppressed and unresolved cases.

Evidence: ADR-068 records the decisions and deliberate corpus drift. The Phase 20 gate passed with 103/103 tests, focused semantic/metadata/feature suites of 11/6/33 tests, all 18 advisory benchmarks within thresholds, clean package and consumer verification, and zero invariant failures over 484 corpus examples. No version bump, tag or publication occurred; Phase 22 remains the first release gate for these changes.

### Phase 21 — Mini-notation recovery and structured AST (complete, unreleased, `v0.4.0`)

Dependencies: Phase 20.

Tasks:

- [x] Introduce a Strudel-owned mini-notation AST layer over the pinned lexer, keeping the semantic engine independent of direct Tree-sitter node access.
- [x] Add recovery for invalid, partial and rapidly edited mini-notation, with precise ranges for actionable diagnostics and semantic tokens.
- [x] Extend hover, completion and signature help for mini-notation constructs only where authoritative language evidence exists; signature help is deliberately unchanged because the mini grammar has no call signatures.
- [x] Keep parser/lexer integration tests separate from semantic AST tests.

Exit criteria:

- [x] Invalid mini-notation fixtures recover without cascading diagnostics or server errors.
- [x] Corpus validation reports no new invariant failures and records the improved mini-notation coverage.
- [x] The mini-notation contract is documented as an additive improvement, not a claim of full language compilation.

Evidence: ADR-069 records the Strudel-owned recovery AST, absolute-range reuse, conservative feature extension and deliberate non-goals. The mini suite has nine parser-independent tests, including four AST tests; the feature suite has 35 tests with structured hover, exact operator completion, unchanged host signature help and repeated incremental-edit regressions. Corpus validation records 2,034 AST nodes across the unchanged 364 mini-notation arguments with zero invariant failures. No version bump, tag or publication occurred; Phase 22 remains the first release gate for Phases 20 and 21.

### Phase 22 — `v0.4.0` controlled release (complete)

Dependencies: Phase 21 and an exact publication ADR naming `strudel-lsp-server@0.4.0`, tag `v0.4.0` and the operator.

Tasks:

- [x] Repeat the full candidate gate, including the new semantic and mini-notation regression suites.
- [x] Update the changelog, compatibility evidence and release notes from the exact candidate.
- [x] Publish only through the controlled OIDC workflow with `npm-release` approval.
- [x] Verify provenance, signatures, tarball identity, clean installs and installed stdio handshake after publication.

Exit criteria:

- [x] Exact-tag CI is green and post-publication smoke evidence passes.
- [x] Semantic and mini-notation limitations remaining after this release are documented.
- [x] No unapproved registry mutation occurs.

Evidence: ADR-070 hardened `.github/workflows/release.yml` with a bounded registry-visibility wait, and the Phase 22 publish job observed `0.4.0` on attempt 8 before passing its install and signature checks. ADR-071 records the exact authorization; ADR-072 records the green exact-tag run, registry and tarball identity, signatures, SLSA v1 provenance, clean installs, installed stdio handshake and GitHub release. Remaining semantic and mini-notation limitations are documented in `CHANGELOG.md` and `.github/RELEASE_NOTES_v0.4.0.md`.

### Phase 23 — Editor ergonomics and navigation (proposed, `v0.5.0`)

Dependencies: Phase 22.

Tasks:

- [ ] Add folding ranges and selection ranges with deterministic, syntax-aware boundaries.
- [ ] Add inlay hints that are opt-in by default and derived only from resolved semantic information.
- [ ] Add completion resolution for richer documentation and detail where metadata supports it.
- [ ] Add range formatting while preserving the existing conservative full-document behaviour.
- [ ] Add call hierarchy, `workspaceSymbol/resolve` and bounded cross-file navigation for files under an explicit workspace root.
- [ ] Add conservative refactoring support, such as local extract/rename operations, without introducing a JavaScript or TypeScript compiler into the core.
- [ ] Update the capability matrix and contract tests for both added and still-unsupported capabilities.

Exit criteria:

- [ ] Every added capability has feature, protocol and live-coding regression coverage.
- [ ] Negative capability assertions prevent accidental advertisement of unimplemented features.
- [ ] No editor-specific dependency becomes an architectural requirement.
- [ ] Workspace filesystem access remains bounded, deterministic and privacy-preserving.

### Phase 24 — Scale and responsiveness (proposed, `v0.5.0`)

Dependencies: Phase 23.

Tasks:

- [ ] Replace or supplement synthetic benchmark fixtures with representative real-world workloads after confirming provenance and redistribution terms.
- [ ] Implement incremental semantic reuse so large-document edits avoid full semantic snapshots where correctness permits.
- [ ] Add local-only timing instrumentation for diagnosis behind an opt-in boundary; no production telemetry is introduced by default.
- [ ] Decide whether performance thresholds become blocking CI checks or remain advisory with hardware-normalised evidence.
- [ ] Record p50/p95/p99 for layer-level and end-to-end JSON-RPC benchmarks on the final candidate.

Exit criteria:

- [ ] Benchmark evidence shows no unexplained latency regression against the Phase 18 baseline.
- [ ] Soak and rapid-edit tests continue to pass with incremental reuse enabled.
- [ ] The performance promise in `docs/PERFORMANCE.md` matches the measured evidence and the declared advisory/blocking policy.

### Phase 25 — `v0.5.0` controlled release (proposed)

Dependencies: Phase 24 and an exact publication ADR naming `strudel-lsp-server@0.5.0`, tag `v0.5.0` and the operator.

Tasks:

- [ ] Repeat the full candidate gate, including folding, selection ranges, inlay hints, completion resolution, range formatting, navigation and incremental-semantics suites.
- [ ] Update the changelog, capability matrix, performance report and release notes from the exact candidate.
- [ ] Publish only through the controlled OIDC workflow with `npm-release` approval.
- [ ] Verify provenance, signatures, registry metadata, tarball identity, clean installs and installed stdio handshake after publication.

Exit criteria:

- [ ] Exact-tag CI is green and post-publication smoke evidence passes.
- [ ] All capability additions are reflected in documentation and negative capability tests.
- [ ] No unapproved registry mutation occurs.

### Phase 26 — v1 readiness freeze (proposed, `v1.0.0`)

Dependencies: Phases 19, 22 and 25.

Tasks:

- [ ] Update the Phase 16 stability ADR to include every capability added in Phases 20–24 and freeze the v1 capability matrix.
- [ ] Add contract tests for advertised providers, deliberately unsupported capabilities, configuration schema and diagnostic-code identity.
- [ ] Align the release workflow with the full CI gate, including configuration, LSP filesystem, soak, corpus, consumer-install, package, audit and benchmark checks.
- [ ] Decide whether the compatibility matrix must run `verify:consumer` on every supported OS/Node pair.
- [ ] Repeat dependency, licence, provenance and secret audits on the exact v1 candidate.
- [ ] Confirm the package allowlist, SBOM decision, support guidance and performance policy are implemented and documented.
- [ ] Prepare versioned changelog and GitHub release notes from the exact candidate, without reusing point-in-time `0.2.0` evidence as if it were v1 evidence.

Exit criteria:

- [ ] The full candidate gate is green on the exact commit proposed for `v1.0.0`.
- [ ] The v1 contract is accepted and all deviations from earlier planned scope are recorded in `docs/DECISIONS.md`.
- [ ] The v1 tag will contain ADR-062 verification and the final capability contract tests.
- [ ] No planned v1 capability is advertised without implementation evidence.

### Phase 27 — `v1.0.0` controlled release (proposed)

Dependencies: Phase 26 and an exact publication ADR naming `strudel-lsp-server@1.0.0`, tag `v1.0.0` and the operator.

Tasks:

- [ ] Obtain explicit authorization for exactly `1.0.0`, exactly `v1.0.0` and the named operator.
- [ ] Run the controlled OIDC workflow with `npm-release` approval; no local publish is permitted.
- [ ] Verify provenance, signatures, registry metadata, tarball identity, clean installs, documented launch command and installed stdio handshake.
- [ ] Publish the GitHub release only after post-publication verification passes.

Exit criteria:

- [ ] `1.0.0` is published through the controlled workflow with verified SLSA provenance matching the package, repository, workflow and resolved commit.
- [ ] The GitHub release is published with no binary assets and notes matching the versioned changelog section.
- [ ] No deprecation, dist-tag change, unpublish, retag or other unapproved registry mutation occurs.
- [ ] The v1 stability contract takes effect and subsequent changes follow the SemVer rules accepted in Phase 16 and frozen in Phase 26.

## Phase 13 release-quality backlog (post-publication status)

These were the recommended, non-blocking items carried out of first publication. Items assigned to v0.2.0 are complete and recorded in Phase 14. Phase 17 items are complete under ADR-064 and Phase 18 items under ADR-065; the remaining item is mapped to Phase 26 below and stays unscheduled until that phase is authorized.

- [x] **Assigned to Phase 14 and completed.** VS Code and Neovim smoke clients exercise initialization, diagnostics, completion, document symbols, incremental change and shutdown through stdio; client configuration stays in `smoke/` and evidence is in `validation/client-smoke.json`; see ADR-058.
- [x] Add deterministic stdio error-path tests for malformed input and cancellation; `test/protocolRobustness.test.ts` now covers both at the JSON-RPC transport layer in addition to the semantic-engine suite.
- [x] **Assigned to Phase 14 and completed.** A bounded soak test exercises rapid edits and repeated initialize/shutdown cycles, reports advisory RSS observations, and adds no production telemetry; see ADR-056 and `npm run test:soak`.
- [x] **Assigned to Phase 14 and completed.** Workspace-symbol discovery now rejects symlinks, unsafe entry names and paths outside the normalized root, ignores unreadable or oversized files, enforces depth and file-count limits, and uses deterministic ordering; see ADR-053 and `test/lsp/workspaceFiles.test.ts`.
- [x] **Assigned to Phase 14 and completed.** `npm run benchmark:e2e` measures a rapid edit and document-symbol request through stdio JSON-RPC and the installed bin; `benchmarks/end-to-end.json` reports advisory p50/p95/p99 separately from the layer-level baseline; see ADR-057.
- [x] **Assigned to Phase 17 and completed.** The npm `files` allowlist remains intentionally minimal: compiled `dist/src` outputs and `LICENSE`, with mandatory `package.json` and `README.md`. Generated declarations and source maps are existing compiled outputs; see ADR-064.
- [x] **Assigned to Phase 18 and completed.** ADR-065 records dependency-update triggers for Strudel, the parser, Tree-sitter and Node, including metadata regeneration, corpus/compatibility reruns and SemVer impact; no dependency was changed.
- [x] **Assigned to Phase 17 and completed, revisited in Phase 26.** No SBOM or additional attestation tool is added; npm signatures and OIDC SLSA provenance remain the release evidence, and any future tool requires separate dependency approval; see ADR-064.
- [x] **Assigned to Phase 17 and completed.** `README.md` documents the diagnostic, log and reproduction details to include, with explicit credential and privacy redaction; see ADR-064.
- [x] **Assigned to Phase 14 and completed.** Clean consumer installs pass with isolated npm configuration and `legacy-peer-deps=false`; the repository `.npmrc` was removed; see ADR-054 and `npm run verify:consumer`.

## Deferred beyond v0.2.0 (mapped into the proposed v1 route)

These items were deferred after the first release and are not selected for `0.2.0` in ADR-051. The earlier blanket deferral is superseded by the proposed route above for planning purposes only; implementation still requires phase authorization.

- [ ] **Proposed Phase 24.** Replace synthetic benchmark fixtures with representative real-world workloads once provenance and redistribution terms are confirmed.
- [ ] **Proposed Phase 24.** Optimise incremental semantic reuse; current large-document updates rebuild the semantic snapshot and are documented in `docs/PERFORMANCE.md`.
- [ ] **Proposed Phase 24.** Add local-only timing instrumentation for diagnosis behind an opt-in boundary; production telemetry remains excluded by default.
- [ ] **Proposed Phase 23.** Add folding, selection ranges, inlay hints, call hierarchy, completion resolution, range formatting, broader refactoring and bounded cross-file navigation, with contract tests for advertised and unsupported capabilities.

## Standing non-goals (not proposed for v1)

- Complete JavaScript or TypeScript compiler/type checker.
- Standalone binary distribution instead of the npm package.
- Editor-specific dependencies in the server core.

The earlier deferral of folding, selection ranges, inlay hints and call hierarchy is superseded by proposed Phase 23; those capabilities are now included in the feature-expanded route to `v1.0.0`.

## Transition constraint

The six tracked files modified before preparation remain user work and must be preserved. Later changes made with approval include `LICENSE`, `package.json`, `package-lock.json`, the completed `AGENTS.md` section 9 and documents under `docs/`. Prototype source files are not removed or overwritten until an explicit retirement decision is made and the user changes are preserved.
