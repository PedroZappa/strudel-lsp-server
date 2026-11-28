# Decisions

Status: decision record for the re-implementation. Resolved decisions are authoritative unless explicitly reopened or superseded; ADR-021 records the Phase 6 deferred-item completion, ADR-022 records Phase 7 quick fixes, ADR-023 records document-scoped rename, ADR-024 records document symbols, ADR-025 records semantic tokens, ADR-026 records conservative formatting, ADR-027 records prototype client dependency remediation, ADR-028 records inline-constant refactoring, ADR-029 records bounded on-demand workspace symbols, ADR-030 records the Phase 8 performance baseline and advisory check, ADR-031 records Phase 9 local packaging verification, ADR-032 records the AGPL-3.0-only project licence decision, ADR-033 records the `0.1.0` release identity and SemVer policy, ADR-034 records the deferred user configuration boundary, ADR-035 records the `0.1.0` supported runtime and OS matrix, ADR-036 records the Phase 11 clean-install validation design, ADR-037 records the real documentation corpus validation design, ADR-038 records the Phase 11 protocol robustness review and transport behaviour, ADR-039 records the npm namespace and publication access review, ADR-040 records the Phase 12 licensing and provenance sign-off, ADR-041 records the Phase 12 dependency and secret audit, ADR-042 records the controlled release workflow design, ADR-043 records the publish/pack dry-run comparison, ADR-044 records the changelog and GitHub release notes preparation, ADR-045 records the rollback and correction policy, ADR-046 records the post-publication smoke plan, ADR-047 records the Phase 13 release authorization, ADR-048 records the Phase 13 gate confirmation, ADR-049 records the first-publish bootstrap exception, ADR-050 records the Phase 13 publication evidence and provenance limitation, ADR-051 records the proposed `0.2.0` scope and deferred work, ADR-052 records the focused diagnostics configuration contract, ADR-053 records the workspace-symbol filesystem boundary, ADR-054 records the clean consumer install and `.npmrc` removal, ADR-055 records hermetic npm cache handling for package verification, ADR-056 records the bounded soak/lifecycle test design, ADR-057 records the separate advisory installed-binary benchmark, ADR-058 records the independent editor-client smoke evidence, ADR-059 records the `0.2.0` release-preparation authorization, ADR-060 records the exact Phase 15 publication authorization, ADR-061 records the Phase 15 publication and smoke evidence, ADR-062 records publication-state-aware release verification, ADR-063 records the initial v1 stability charter and its Phase 26 frozen-baseline amendment, ADR-064 records the Phase 17 package, support and SBOM decisions, ADR-065 records the Phase 18 parser, metadata and platform compatibility closure, ADR-066 records the exact Phase 19 publication authorization, and ADR-067 records the completed `0.3.0` publication and smoke evidence, ADR-068 records the Phase 20 semantic-depth and additive-signature decisions, ADR-069 records the Phase 21 additive mini-notation recovery AST, ADR-070 records the bounded registry-visibility wait, ADR-071 records the exact Phase 22 publication authorization, ADR-072 records the completed `0.4.0` publication and smoke evidence, ADR-073 records the Phase 23 editor-ergonomics capability contract, ADR-074 records the Phase 24 scale, timing and advisory-threshold contract, and ADR-075 records the exact Phase 25 publication authorization, and ADR-076 records the completed publication and smoke evidence; ADR-077 records the v1 scope amendment and post-v1 roadmap, ADR-078 records the Phase 26 compatibility-matrix consumer verification scope, ADR-079 records the Phase 26 candidate audit evidence, ADR-080 confirms the Phase 26 package, support and performance policy, ADR-081 records the candidate changelog and release-note preparation, and ADR-082 re-freezes the final `v1.0.0` capability matrix with all four ADR-077 additions advertised.

Reading historical ADRs: decisions recorded before ADR-060 are point-in-time records. Statements such as “unreleased”, “no publish authorized”, “no package has been published”, old registry observations and older test counts describe the state when the decision was made and are not current release claims. Current publication state is recorded in ADR-076, current planning state in ADR-077, ADR-078 and ADR-082 and the status heading of `docs/ROADMAP.md`; ADR-050 records the first-publish provenance limitation.

## ADR-001 — Clean-slate re-implementation

Status: accepted by `AGENTS.md`.

The existing repository implementation is an experimental prototype, not an architectural foundation. Implementation code, structure, dependencies, build configuration and tests may be replaced. Prototype architecture and behaviour are not preserved merely for compatibility.

Rationale: `AGENTS.md` section 1 explicitly authorises this and requires the approved architecture and specifications to guide the work.

## ADR-002 — Documentation as source of truth

Status: accepted.

Detailed requirements live in the ten documents under `docs/`; `AGENTS.md` defines agent behaviour and development rules. Conflicts are identified and resolved explicitly rather than by selecting a convenient interpretation.

## ADR-003 — Parser licence (historical 1.1.8 decision)

Status: superseded by ADR-032 on 2026-11-27; retained as evidence for the earlier decision.

Historical decision: treat **MIT** as the authoritative licence for the 1.1.8-era parser packages. This was based on the MIT metadata in the published npm packages and in both repositories' `package.json` files, together with the user's confirmation. It does not govern the adopted `tree-sitter-strudel@2.0.2` dependency or the published server.

Verified source facts:

- `PedroZappa/tree-sitter-strdl` and `joshuadanpeterson/tree-sitter-strdl` both contain AGPL-3.0 `LICENSE` files.
- Both repositories' `package.json` files declare MIT.
- npm declares MIT for `tree-sitter-strdl@1.1.8` and `1.3.4`.
- The upstream `LICENSE` was changed to AGPL-3.0 in a signed 2025-07-29 commit by the repository owner.
- `joshuadanpeterson/tree-sitter-strdl` is a fork of `PedroZappa/tree-sitter-strdl`.
- No public issue or pull-request comment was found that resolves the licence contradiction.

Consequences:

- The AGPL `LICENSE` files contradicted the historical MIT metadata. The user planned an owner-owned upstream correction; no issue or pull request was opened, and no action was taken against the fork. That plan is no longer a release gate.
- The exact parser package and runtime are pinned in ADR-013, and compatibility validation passed.
- The already-published `tree-sitter-strudel@1.1.8` npm tarball contains an AGPL `LICENSE`. The 2.0.2 metadata and licence are consistent, which prompted the re-evaluation recorded in ADR-032.

## ADR-004 — Complete `AGENTS.md` section 9

Status: resolved on 2026-11-25.

The user approved drafting the missing section 9. A full "Testing and Verification" section was appended to `AGENTS.md`, covering test scope, separate suites, live-coding fixtures, regression tests, validation gates, honest reporting and benchmark percentiles. `docs/TESTING_STRATEGY.md` is now authoritative rather than provisional.

## ADR-005 — Editor-agnostic stdio npm server

Status: accepted by `AGENTS.md`.

The server is an npm package using standard LSP over stdio as the primary transport. Individual editors are not architectural requirements. Editor-specific clients, configuration and examples remain separate from the core.

## ADR-006 — No general JavaScript/TypeScript compiler

Status: accepted by `AGENTS.md`.

Implement Strudel-specific semantics and only the JavaScript interoperability needed by the language. A complete JS/TS compiler or type checker is out of scope.

## ADR-007 — Semantic engine independent of Tree-sitter

Status: accepted by `AGENTS.md`.

The parser is the syntax layer only. Semantic engine interfaces must not depend on Tree-sitter APIs, allowing future parser or grammar evolution.

## ADR-008 — Test tooling

Status: accepted on 2026-11-25.

The selected baseline is Node's built-in `node:test` runner over compiled ESM JavaScript, with the TypeScript compiler producing test output. This avoids a separate test-framework dependency while still supporting module, protocol and subprocess tests.

Vitest remains a documented alternative if richer ergonomics become necessary. Phase 2 added the first stdio transport smoke test, Phase 4 added the semantic engine suite, Phase 5 added the metadata-generation and language-database suite, and Phase 6 added the language-feature suite and expanded the stdio test into an end-to-end capability integration test.

## ADR-009 — Repository licence metadata

Status: resolved on 2026-11-25; licence identifier amended by ADR-032 on 2026-11-27.

Root `LICENSE` previously carried the Microsoft MIT template notice while manifests identified `Zedro`. It was corrected to MIT with `Copyright (c) 2025-present Zedro`; ADR-032 now replaces the MIT identifier with AGPL-3.0-only while retaining that copyright notice. Repository identity, Git history and ownership information remain preserved.

## ADR-010 — Measured performance targets

Status: accepted by `AGENTS.md`; targets pending measurement.

Performance targets are derived from representative workloads and documented p50/p95/p99 measurements. Arbitrary thresholds are not invented.

## ADR-011 — Scaffold dependency installation

Status: completed on 2026-11-25.

The user explicitly approved installing scaffold dependencies. The root `package.json` was updated to pin the selected toolchain and LSP runtime libraries, and `npm install --ignore-scripts` succeeded. `package-lock.json` was regenerated.

Installed dependencies:

- Runtime: `vscode-languageserver@11.0.1`, `vscode-languageserver-textdocument@1.0.16`
- Development: `@eslint/js@9.33.0`, `@stylistic/eslint-plugin@2.13.0`, `@types/node@26.6.10`, `eslint@9.33.0`, `prettier@3.10.1`, `typescript@6.0.3`, `typescript-eslint@8.74.0`

`@stylistic/eslint-plugin` is retained because the existing ESLint configuration imports it. Prototype source files were not removed. Parser and Tree-sitter runtime dependencies were added later under ADR-013; Strudel metadata sources were added under ADR-014.

`npm audit --omit=dev` reported zero runtime vulnerabilities. The initial full audit found six development-only advisories in transitive tooling packages; ADR-015 records their remediation. Both audits now report zero vulnerabilities.

Current lint, type-check and prototype test failures are pre-existing scaffold issues and are recorded with exact commands in `docs/TESTING_STRATEGY.md`. Prototype sources were not modified to make them pass.

## ADR-012 — TypeScript and ESLint version compatibility

Status: accepted on 2026-11-25.

TypeScript is pinned to `6.0.3` rather than the latest `7.0.2` because `typescript-eslint@8.74.0` declares a peer range of `>=4.8.4 <6.1.0`. ESLint is pinned to `9.33.0` alongside `@eslint/js@9.33.0` to maintain a mutually compatible peer set with `typescript-eslint@8.74.0`.

This is a deliberate compatibility choice, not a rejection of future upgrades. Revisit when `typescript-eslint` supports TypeScript 7.

## ADR-013 — Parser version and runtime

Status: accepted on 2026-11-25; upgraded to 2.0.2 on 2026-11-26 by user direction.

Decision: pin `tree-sitter-strudel@2.0.2` from `PedroZappa/tree-sitter-strdl` and `tree-sitter@0.25.1`.

Rationale:

- `tree-sitter-strudel` is the npm package whose repository field points to the parser project named in `AGENTS.md`. Version 2.0.2 is now the adopted version.
- The 1.1.8 candidate was originally selected because it had prebuilt native bindings and a WASM artifact, while `tree-sitter-strdl@1.3.4` pointed to a fork without prebuilds. The user directed the 2.0.2 upgrade, which retains the same repository and adds prebuilds and WASM.
- The 2.0.2 grammar is a major rewrite with JavaScript-like node names; the adapter's stable contracts absorbed the change without affecting other layers.

Compatibility finding:

- 1.1.8 declared `peerOptional tree-sitter: ^0.22.4` but used `LANGUAGE_VERSION 15` metadata and failed with `tree-sitter@0.22.4`. Runtime 0.25.1 was required.
- 2.0.2 declares `tree-sitter ^0.25.0`, which matches the pinned `tree-sitter@0.25.1`. The stale-peer workaround is no longer specific to the parser.
- Both versions parse successfully with `tree-sitter@0.25.1`, including incremental reparsing and malformed-input recovery.

Consequences:

- `.npmrc` originally set `legacy-peer-deps=true` as a general workaround. The parser-specific rationale no longer applied; ADR-054 removes the file after compatibility was demonstrated without it.
- Phase 3 parser integration tests validate loading, parse structure, non-ASCII ranges, incremental edits and malformed-input recovery with 2.0.2. Results are recorded in `docs/PARSER_INTEGRATION.md`.
- 2.0.2 declares `AGPL-3.0-only` consistently in both `package.json` and its bundled `LICENSE`. The earlier MIT-authoritative decision applied only to 1.1.8 metadata and was superseded by ADR-032 for the adopted parser.

## ADR-014 — Strudel metadata source versions

Status: accepted on 2026-11-25.

Decision: pin these exact development dependencies as authoritative metadata inputs:

- `@strudel/reference@1.2.2`
- `@strudel/core@1.2.6`
- `@strudel/mini@1.2.6`
- `@strudel/transpiler@1.2.6`

Rationale:

- `@strudel/reference` is the headless package explicitly documented as containing metadata for all documented Strudel functions.
- The `1.2.6` core/mini/transpiler versions are a coherent set from the same Strudel repository and match the current latest `@strudel/core` release.
- All four packages come from `git+https://codeberg.org/uzu/strudel.git` and declare `AGPL-3.0-or-later`; this provenance and licence must be recorded with generated metadata.

Pinned package provenance:

| Package               | Version | Tarball                                                                 | Integrity                                                                                         |
| --------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@strudel/reference`  | 1.2.2   | `https://registry.npmjs.org/@strudel/reference/-/reference-1.2.2.tgz`   | `sha512-1zJwv4U2NVWhw/T2fDL6XJjSKi8ltetw9qX79Lum51g7x0CX1naf6imbkdBzS7QKYyKnUYyHCtxsgFIKyGyiDg==` |
| `@strudel/core`       | 1.2.6   | `https://registry.npmjs.org/@strudel/core/-/core-1.2.6.tgz`             | `sha512-FA5Kxv3U+UhNRLIeuEpXck2o2J5AjHZbkAdSAK9Q2N3Az1G9Vnc+bXXfgDFyY3yRH9mXXQvTerz8jr876pGGng==` |
| `@strudel/mini`       | 1.2.6   | `https://registry.npmjs.org/@strudel/mini/-/mini-1.2.6.tgz`             | `sha512-I5GFPLHI3TPcJuD2RdDcurA+lTogaSQ0TB+EimKTgEtSAbU6ZMEkSUOXZIFO5eaAcJcMucgKaBcmTKpD4oZjPA==` |
| `@strudel/transpiler` | 1.2.6   | `https://registry.npmjs.org/@strudel/transpiler/-/transpiler-1.2.6.tgz` | `sha512-NzmyQDS4BqjafOPzHGFowxILDx3ZRAPD47YszxNaPB7PggMA2rMo9t3rLz80G0GxA0ZAyMbVMR3px9jDWnJ5hg==` |

Validation:

- Importing `@strudel/reference` exposes `reference.docs`, an array of 577 JSDoc records with fields such as `name`, `longname`, `kind`, `params`, `examples` and `description`.
- Direct Node ESM imports of `@strudel/core`, `@strudel/mini` and `@strudel/transpiler` fail because their transitive `@kabelsalat/web@0.4.1` package points `main` at a browser IIFE without Node-discoverable named exports. These packages are therefore pinned as source/integrity inputs, not as directly importable runtime modules.
- Generated metadata extraction must use the pinned package files or a bundler-aware process until upstream packaging supports direct Node ESM import. Phase 5 satisfies this with `scripts/generate-metadata.mjs`, which imports only `@strudel/reference` and records the other three packages as integrity inputs.

## ADR-015 — Development dependency advisory remediation

Status: completed on 2026-11-25.

Decision: run `npm audit fix --ignore-scripts` to patch the six development-only advisories without changing direct dependency versions.

The advisories all came from transitive ESLint/tooling dependencies: `@humanfs/node`, `ajv`, `brace-expansion`, `flatted`, `js-yaml` and `minimatch`. `npm audit --omit=dev` had already reported zero runtime vulnerabilities.

Resulting patched versions:

| Package           | Previous | Patched |
| ----------------- | -------- | ------- |
| `@humanfs/node`   | 0.16.6   | 0.16.8  |
| `@humanfs/core`   | 0.19.1   | 0.19.2  |
| `ajv`             | 6.12.6   | 6.15.0  |
| `brace-expansion` | 1.1.12   | 1.1.22  |
| `flatted`         | 3.3.3    | 3.4.4   |
| `js-yaml`         | 4.1.0    | 4.3.2   |
| `minimatch`       | 3.1.2    | 3.1.5   |

`npm audit` and `npm audit --omit=dev` both report zero vulnerabilities. A subsequent `npm install --ignore-scripts` remains clean, and all fifteen direct dependency versions are unchanged. The separate `tree-sitter` peer-range override in ADR-013 remains in force; a full-tree `npm ls --all` reports that stale peer mismatch as expected.

## ADR-016 — Single-package server scaffold

Status: accepted on 2026-11-26.

Decision: the repository root is now the npm package `strudel-lsp-server`. It is ESM, strictly typed, and exposes an executable stdio LSP entry point at `dist/src/server.js`. Source and tests live under `src/` and `test/`; prototype `client/`, `server/`, `dist/` and editor-specific files are excluded from build, lint, format and test scopes. `@stylistic/eslint-plugin` remains a development dependency because the ESLint configuration uses it.

The server entry point explicitly uses `process.stdin`/`process.stdout`. Phase 2 initially advertised only `textDocumentSync: None` to avoid claiming unimplemented features; Phase 6 replaced this with incremental sync and the verified core capabilities described in ADR-020. A stdio integration test verifies that contract. The benchmark script is a runner placeholder; Phase 8 establishes workloads and measured p50/p95/p99 targets.

Consequences:

- Prototype sources and the six tracked files modified before preparation remain untouched.
- A `Makefile` provides the canonical developer and agent entry point, with targets that delegate to the authoritative root npm scripts.
- Pre-existing root `README.md` still describes the prototype and is not authoritative for the npm package; packaging documentation is revisited in Phase 9.
- `npm ci --ignore-scripts`, audits, typecheck, lint, format verification, tests and the combined `npm run check` gate pass. The documented ADR-013 parser peer-range warning remains expected.

## ADR-017 — Parser-independent syntax adapter

Status: accepted on 2026-11-26.

Decision: `src/syntax/` wraps the pinned Tree-sitter adapter behind a parser-independent contract. The native tree is retained in a `WeakMap` keyed by the returned `SyntaxDocument`; other layers receive only `SyntaxNode`, `SyntaxRange` and `SyntaxKind` values.

Rationale:

- ADR-007 requires semantic interfaces to remain independent of Tree-sitter APIs. Parser-specific node names are confined to `kinds.ts`, so grammar changes require adapter updates only. This was exercised by the 1.1.8 → 2.0.2 major grammar rewrite: only `kinds.ts`, `types.ts` and parser tests changed.
- The pinned Node binding reports node indices and edit positions in UTF-16 code units, which match LSP character offsets. `textCoordinates.ts` derives positions directly from document text rather than parser-specific point values; this was verified against source containing non-ASCII characters.
- WeakMap keying avoids retaining stale native trees when a document is superseded while still enabling incremental `update` calls.

Consequences:

- Parser integration tests under `test/parser/` import only the stable `SyntaxAdapter` contract, never Tree-sitter APIs. They run independently via `npm run test:parser`.
- `update` falls back to a full parse when no native tree is associated with the previous document or when edits are empty but text changed. This is a correctness fallback, not a performance claim.
- Grammar/parser/bindings are consumed as npm dependencies only; none are copied into this repository.

## ADR-018 — Phase 4 semantic model boundaries

Status: accepted on 2026-11-27.

Decision: the semantic engine consumes the stable `SyntaxDocument` contract and exposes its own `SemanticDocument`, `SemanticCatalog`, `SemanticEngine` and cancellation contracts. It does not import Tree-sitter APIs, and semantic tests hand-build syntax fixtures rather than invoking the parser adapter.

Strudel-specific knowledge is injected as a `SemanticCatalog`; no authoritative function, method or sample list is hardcoded in Phase 4. Pattern constructors, pattern methods and mini-notation argument positions come from catalog entries, so the Phase 5 language database can supply versioned metadata without rewriting the engine.

Incremental analysis reuses unchanged top-level statements by stable content key and shifts their ranges after edits. A change to the global declaration signature forces a conservative full rebuild, preventing stale global binding types. Cancellation is cooperative and checked at analysis boundaries; a cancelled analysis is never cached.

Mini-notation initially used a flattened context model: the engine recorded string ranges, owner names and `MiniNotationPattern` inference. A richer token submodel was deferred to Phase 6 after language-feature requirements were validated and is recorded in ADR-021.

Rationale: these boundaries satisfy ADR-007, keep the Phase 4 scope to semantics rather than metadata generation or LSP features, and make correctness under live edits more important than maximum reuse granularity. The reuse strategy is deliberately coarse until Phase 8 measurements justify finer invalidation.

Consequences:

- Semantic engine tests are independent of parser/grammar tests and do not import Tree-sitter APIs.
- Phase 5 must produce a `SemanticCatalog` implementation or adapter.
- Phase 6 feature providers must treat `Unknown` and unresolved references as uncertainty, not as diagnostics by default.
- `Boolean` and `SampleName` are part of the type model but have limited inference until metadata and expression coverage expand.

## ADR-019 — Reproducible language database

Status: accepted on 2026-11-27.

Decision: `src/languageDatabase/` owns a committed, versioned metadata snapshot generated from the pinned inputs in ADR-014. `scripts/generate-metadata.mjs` validates package versions, tarball integrity, licences and repository provenance, transforms `reference.docs` into deterministic TypeScript, and excludes machine-specific path data. The snapshot records origin, version and licence for all four Strudel packages.

Metadata is layered:

- Generated records provide documented names, kinds, scopes, parameters, returns, descriptions, examples and conservative `StrudelTypeKind` values.
- Manual entries in `manual.ts` supply curated return types and mini-notation argument positions for common pattern constructors and controls, with evidence from pinned reference examples.
- Runtime-derived entries are an explicit `RuntimeSymbolMetadata` option. No runtime import is used by default, so the server works offline after installation.

`createCatalogFromLanguageDatabase` adapts any registered Strudel version to the Phase 4 `SemanticCatalog` boundary. `LanguageDatabaseOptions.versions` permits additional generated snapshots in future without changing semantic-engine code. Catalog versions include a deterministic hash of manual and runtime layers so semantic caches invalidate when those layers change.

Rationale: the design satisfies the offline requirement, avoids direct Node imports of packages with incompatible browser packaging, and preserves provenance for AGPL-3.0-or-later sources. Generated descriptions and examples are included for future hover and signature features; the project licence is AGPL-3.0-only under ADR-032, with source obligations documented rather than assumed away.

Consequences:

- Regeneration must be deliberate through `npm run generate:metadata` or `make generate-metadata`.
- Metadata tests compare fresh generator output with the committed snapshot and do not access the network.
- Pattern-method types are generated from `memberOf: 'Pattern'` and `scope: 'static'`; sample names remain unavailable because no pinned authoritative sample list exists.
- Generated parameter metadata is consumed by signature help, and token-level mini-notation analysis is implemented in ADR-021; richer signatures and a recovery parser remain future work.

## ADR-020 — Phase 6 core language intelligence

Status: accepted on 2026-11-27; deferred items completed in ADR-021.

Scope decision: implement an approved core increment of resilient diagnostics, position-aware completion, hover documentation, go to definition and references. Signature help and token-level mini-notation analysis were deferred until JSDoc parameter metadata and pinned mini-notation grammar evidence could be validated.

Decision: `src/lsp/` owns a text document store built on `vscode-languageserver-textdocument` and a per-version analysis cache. Each open/change stores one `AnalyzedDocument` combining the text, `SyntaxDocument` and `SemanticDocument`. Single-range changes are forwarded to the parser's incremental `update`; multi-change events and full-text changes fall back to a full parse. Semantic analysis reuses the previous snapshot. Out-of-order versions are discarded to avoid regressing to stale content.

`src/features/` contains transport-independent providers. They consume `FeatureContext` (document text, syntax node at the request offset, semantic model and language database) and return plain result objects that `src/server.ts` maps to LSP types. Provider-layer separation keeps future editors and request types independent of feature logic.

Live-coding policy:

- Outermost non-empty syntax error nodes produce warning diagnostics; missing nodes and speculative semantic conclusions are suppressed.
- Unknown calls and pattern methods produce informational diagnostics only when the syntax tree is clean, so temporary malformed state does not cascade.
- Unresolved value references are not reported because runtime globals may be injected outside the document.
- Builtin and method symbols resolve through the language database and document descriptions, examples and source provenance in hover and completion.
- Builtins have no source declaration, so definition requests correctly return no location.

Request/transport behaviour: updates are analysed on the next event-loop turn. Request handlers await the latest scheduled analysis for the URI and then use the current snapshot. Superseded versions are discarded before diagnostic publication. Capabilities are advertised only for implemented and verified features: incremental sync, completion with a `.` trigger, hover, definition, references and push diagnostics. No pull-diagnostic or unimplemented capability is claimed.

Rationale: incremental reuse, deferred analysis and version suppression protect responsiveness and correctness during rapid edits. Keeping providers out of the LSP layer and the database out of the semantic layer preserves ADR-007 and ADR-019 boundaries.

Consequences:

- Signature help and mini-notation token analysis were added in ADR-021, quick fixes in ADR-022, document-scoped rename in ADR-023, document symbols in ADR-024, semantic tokens in ADR-025 and formatting in ADR-026; completion resolution, workspace symbols, broader refactoring and remaining extended capabilities remain deferred.
- User-facing configuration for diagnostics and Strudel version selection is not exposed; ADR-034 records the explicit first-release deferral.
- The stdio integration test now exercises capability advertisement, all implemented request types, diagnostic publication, document closure and rapid-edit suppression.
- Performance work in Phase 8 must measure this pipeline; no latency target is claimed here.

## ADR-021 — Signature help and mini-notation token analysis

Status: accepted on 2026-11-27.

Decision: complete the two Phase 6 deferred items without adding dependencies or vendoring parser code.

Signature help is a transport-independent provider in `src/features/signatureHelp.ts`. It collects calls containing the request offset, selects the innermost call whose argument node contains that offset, resolves the callee against the language database, and returns a single LSP signature with UTF-16 parameter label ranges and the active parameter index. Global calls use global records and member calls use pattern-method records; calls resolving to user definitions are skipped rather than mislabeled as builtins. `src/server.ts` advertises `signatureHelpProvider` only with `(` and `,` triggers and maps provider results to LSP types. Documentation and parameters come from the committed JSDoc-derived database rather than handwritten signatures.

Mini-notation analysis lives in `src/miniNotation/`, outside the Tree-sitter adapter and semantic engine APIs. It scans the content of plain double-quoted string arguments and emits ordered tokens with absolute document offsets plus conservative structural issues. Empty groups, unmatched or mismatched closers, and missing steps at the start of or between `,` or `|` separators become warnings; unclosed groups, trailing separators, other trailing operators, unsupported characters and template substitutions are not diagnosed during live editing. Unsupported characters still advance the scanner and are represented as `unknown` tokens so analysis cannot stall. Issue ranges and token ranges are cloned and shifted by `cloneStatementAnalysis` when unchanged statements are reused after edits. Diagnostics and hover consume the submodel through `MiniNotationArgument.analysis`.

Evidence:

- `@strudel/mini@1.2.6` `krill.pegjs`: numbers (61–94), step characters (107–110), groups and slices (113–128), operators (132–163), sequences and stacks (166–197), quoted mini notation (205–206), haskellish statements (210–281); confirmed by the shipped generated parser and `mini.test.mjs`.
- `@strudel/core@1.2.6` JSDoc: `*` as `.fast()` (`pattern.mjs:1914`), `/` as `.slow()` (`pattern.mjs:1948`), `~` as silence (`pattern.mjs:1245`), `:` as sample parameters (`controls.mjs:24–31, 97–110`) and Euclidean calls (`euclid.mjs:54–69`).
- `@strudel/reference@1.2.2` is the pinned generated JSDoc source for signature metadata. It is one minor version behind mini/core, so grammar evidence takes precedence for mini-notation token boundaries.
- `@strudel/transpiler@1.2.6` converts double-quoted literals and template literals only, which defines the current string-argument scope.

Rationale: generated JSDoc already carries authoritative parameter names, types and descriptions, so signature help needed no new database. A lexical mini-notation submodel gives useful operator hover and clearly invalid-structure warnings without importing the mini runtime or pretending to reproduce its full PEG recovery behaviour. Suppression rules match the live-coding requirement that incomplete input must not cascade into speculative errors.

Consequences:

- Capabilities are advertised for signature help with `(`, `,` triggers; no `retriggerCharacters` or client-dependent capability is claimed.
- Mini-notation analysis is deliberately not a full AST or haskellish parser; sample-name validation and semantic argument checks remain out of scope.
- The mini-notation suite runs independently via `npm run test:mini` or `make test-mini`; feature and stdio integration tests cover provider mapping, nested calls, active parameters, conservative diagnostics, operator hover and incremental range shifting.
- The added linear token scan has no benchmark yet; Phase 8 must include it in latency workloads.

## ADR-022 — Conservative quick fixes for mini notation

Status: accepted on 2026-11-27.

Decision: implement the first Phase 7 extended capability as quick fixes limited to the four validated mini-notation structural diagnostics. No new dependency or general refactoring provider is introduced.

`src/features/codeActions.ts` recomputes actions from the current semantic snapshot and returns a fix only when the diagnostic range intersects the requested LSP range. `LanguageDiagnostic` carries an optional transport-independent `DiagnosticFix` containing the title, replacement range and replacement text. `src/server.ts` advertises `codeActionProvider` with only `CodeActionKind.QuickFix` and `resolveProvider: false`, then maps each fix to a single-document `WorkspaceEdit`. Client-supplied diagnostics are not used to authorize edits because they may be stale.

Mini-notation issues now supply fix metadata: an empty group is deleted, an unmatched closer is deleted, a redundant separator is deleted, and a mismatched closer records `expectedClose` so it can be replaced with the delimiter demanded by the opener. Syntax errors, unknown calls and methods, unresolved values and incomplete live-coding states produce no actions.

Rationale: the Phase 6 diagnostics policy already identified these four structural faults as reliable enough to report. Their issue ranges are exact and their repairs are deterministic text edits. Broader fixes would require sample-name knowledge, a recovery parser or speculative type information, which would conflict with live-coding resilience and the remaining roadmap evaluation policy.

Consequences:

- `textDocument/codeAction` is an implemented and verified request; no source action kinds are advertised.
- Mismatched-closer fixes use the expected delimiter recorded by the analyzer rather than parsing diagnostic messages.
- Feature tests cover all four edits, non-actionable diagnostics and range filtering; the stdio test covers capability advertisement and edit mapping.
- The code-action path recomputes diagnostics from cached syntax and semantic snapshots and has no measured latency figure; Phase 8 must include it in code-action workloads.

## ADR-023 — Document-scoped rename

Status: accepted on 2026-11-27.

Decision: implement rename for the current document only, using existing semantic resolution, and reject every case that cannot be proven safe from the available model. No workspace index, new dependency or general JavaScript symbol engine is introduced.

`src/features/rename.ts` exposes `prepareRename` and `provideRename`. A symbol is renamable only when it has a declaration and its kind is `variable`, `function`, `parameter` or `import`. Builtins, pattern methods, unresolved names, no-op renames and documents with syntax errors are rejected. New names must match ECMAScript identifier syntax and must not be reserved or strict-mode reserved words. Every replacement range is checked against the original symbol text, so stale incrementally shifted ranges cannot be applied. Edits come from `provideReferences(context, offset, true)` and are mapped to a single-document `WorkspaceEdit` by `src/server.ts`.

`renameProvider` advertises `prepareProvider: true`; `textDocument/prepareRename` returns the exact token range and current placeholder before an edit is requested.

Rationale: the semantic model already resolves local declarations and references reliably, but there is no workspace index or authoritative cross-file module graph. Claiming workspace-wide rename would be incorrect. Restricting rename to verified document-local symbols provides a useful, deterministic capability while preserving live-coding resilience and the editor-agnostic architecture.

Consequences:

- Rename never edits strings, comments, mini-notation content or symbols resolved only through the language database.
- Import binding renames change the local binding only; external module exports are outside this model.
- Feature tests cover declaration and reference edits, parameter rename, prepare ranges, builtin and method rejection, invalid names and incomplete input; the stdio test covers capability advertisement and both requests.
- Rename uses the cached semantic snapshot and has no measured latency figure; Phase 8 must include it in representative request workloads.

## ADR-024 — Document symbols without workspace indexing

Status: accepted on 2026-11-27.

Decision: implement `textDocument/documentSymbol` from the current semantic snapshot and defer `workspace/symbol`. No workspace index, file watcher, new dependency or general JavaScript symbol engine is introduced.

`src/features/documentSymbols.ts` walks scopes and symbols from the semantic document. Only declarations whose source text still matches their recorded range are returned; catalog-only builtins, methods and samples have no declaration and are omitted. A named function owns the declarations in its function scope as children, giving outline hierarchy where the semantic model supports it. Scopes without a declared owner are flattened into the enclosing level. `src/server.ts` advertises `documentSymbolProvider`, handles `textDocument/documentSymbol` and maps the result to hierarchical LSP `DocumentSymbol` values.

Rationale: the semantic model already contains accurate local declarations, scopes and types. Exposing them is useful and deterministic. There is no workspace index or authoritative cross-file module graph, so a workspace-symbol request over open documents only would be incomplete and could mislead clients. Adding an index would be a separate architectural decision with file discovery, persistence and invalidation concerns.

Consequences:

- Document symbols are read-only and work on incomplete live-coding documents; malformed declaration ranges are skipped instead of crashing.
- `detail` reflects the limited Strudel type model, not a JavaScript type checker.
- Feature tests cover function-scope children, type details, catalog-only exclusion, imports and incomplete input; the stdio test covers capability advertisement and response mapping.
- Document-symbol traversal uses the cached semantic snapshot and has no measured latency figure; Phase 8 must include it in representative request workloads.
- `workspace/symbol` was not advertised until a workspace indexing strategy was approved; ADR-029 supersedes this deferral with a bounded on-demand scan.

## ADR-025 — Conservative semantic tokens

Status: accepted on 2026-11-27.

Decision: implement full-document semantic tokens from verified semantic and mini-notation facts, with an exact legend and no range or delta support. No general JavaScript tokenizer, TextMate grammar, new dependency or unvalidated keyword colouring is introduced.

`src/features/semanticTokens.ts` emits tokens for resolved declarations and references, catalog globals, pattern methods, and mini-notation numbers and operators. Symbol kinds map to the `function`, `method`, `variable` and `parameter` legend entries. Declared user symbols carry `declaration`; catalog symbols carry `defaultLibrary`. Mini-notation tokens come from the pinned 1.2.6 lexical model: numbers become `number`, and validated operators and group delimiters become `operator`. Unknown identifiers, ordinary steps, whitespace, syntax errors and stale ranges are skipped. `src/server.ts` advertises `semanticTokensProvider`, maps provider results through `SemanticTokensBuilder` and handles `textDocument/semanticTokens/full`.

Rationale: semantic tokens are valuable only where they convey meaning the client cannot infer reliably from syntax. The semantic model provides authoritative symbol resolution, and the mini-notation analyser provides validated token kinds. Guessing from raw text would duplicate generic highlighting and would produce misleading colours during live coding. A limited legend also avoids advertising modifier or token categories the server cannot support.

Consequences:

- Unresolved names receive no semantic token; clients retain their normal syntax highlighting for them.
- The legend is `function`, `method`, `variable`, `parameter`, `number`, `operator` with `declaration` and `defaultLibrary` modifiers.
- `range: false` and `full: true` are advertised; no incremental delta computation is claimed.
- Feature tests cover classification, unresolved names, mini-notation tokens and incomplete input; the stdio test verifies legend advertisement and encoded response data.
- Semantic-token computation uses the cached semantic snapshot and has no measured latency figure; Phase 8 must include it in representative request workloads.

## ADR-026 — Conservative indentation formatting

Status: accepted on 2026-11-27.

Decision: implement `textDocument/formatting` as a syntax-guided indentation pass only. No external formatter, new dependency, general JavaScript printer or custom configuration channel is introduced. Range formatting, on-type formatting and expression reflow are deferred.

`src/features/formatting.ts` walks the parser-independent `SyntaxDocument` and rewrites only the leading whitespace of statement-level nodes, statement-position comments and block braces. Indentation depth is derived from enclosing block nodes. `tabSize` and `insertSpaces` come from standard LSP `DocumentFormattingParams.options`, defaulting to two spaces with `tabSize` constrained to 1–8. Code tokens, line breaks, trailing whitespace, string and template contents, multi-line comment bodies and expression continuation lines are never edited. Lines with ambiguous candidates and documents with syntax errors produce no edits.

Rationale: Strudel documents are JavaScript-like but depend on literal mini-notation strings and are edited live. A full printer would require a general JavaScript formatter and would risk changing strings or partial expressions. Indentation is useful, deterministic and verifiable from the syntax tree, while LSP formatting options already give users editor-native preferences. Doing nothing on malformed input protects live coding from disruptive edits.

Consequences:

- Formatting output depends only on the current syntax snapshot and client formatting options.
- Already-correct documents produce an empty edit list; no edit ever changes non-whitespace source characters.
- Feature tests cover nested blocks, tab and space preferences, protected strings/templates/comments, blank lines, clean documents and syntax errors; the stdio test verifies capability advertisement and edit mapping.
- Formatting uses the cached syntax snapshot and has no measured latency figure; Phase 8 must include it in representative request workloads.
- Broader refactoring and range formatting require separate usefulness and safety cases before implementation.

## ADR-027 — Prototype client dependency advisories

Status: accepted on 2026-11-27.

Decision: clear all GitHub Dependabot advisories in the preserved prototype VS Code client by upgrading its direct `glob` dependency from `^11.0.0` to `^14.0.6` and regenerating `client/package-lock.json`. No server dependency, server source or client source file is changed.

Root `npm audit` and `npm audit --omit=dev` already reported zero vulnerabilities. All 17 open Dependabot alerts were confined to `client/package-lock.json`: high advisories in `brace-expansion`, `@isaacs/brace-expansion`, `minimatch` and `glob`, and moderate advisories in `glob` and `minimatch`. A non-breaking lockfile refresh cleared the high alerts but left the moderate alerts because both vulnerable ranges extend through the versions allowed by `glob@11`. `glob@14.0.6` uses `minimatch@11`, which is outside those ranges. `npm audit fix --package-lock-only` then patched the remaining nested `minimatch@5` and `brace-expansion` advisories without further direct dependency changes.

Licence: `glob@14.0.6` is `BlueOak-1.0.0`, an OSI-approved permissive licence with an express patent grant and a notice-retention requirement. It remains compatible with the project's AGPL-3.0-only licence; no `glob` source is copied into the published server, and npm lockfile metadata retains the licence identifier. Sources: [OSI approval](https://opensource.org/license/blueoak-1-0-0) and [licence steward](https://blueoakcouncil.org/license/1.0.0).

Compatibility: the `glob.glob(...)` call in `client/src/test/index.ts` remains exported by `glob@14`, and the package supports Node `18 || 20 || >=22`. The prototype client is not part of the published server package.

Consequences:

- `npm audit --prefix client` reports zero vulnerabilities; `npm run check` passes.
- CI audits the client lockfile in addition to the root package, and `make audit-client` exposes the same check locally.
- The client manifest has one intentional breaking major version change; retiring the prototype client would remove it entirely.
- GitHub Dependabot alerts are expected to close after the lockfile change is pushed.

## ADR-028 — Inline-constant refactoring

Status: accepted on 2026-11-27.

Decision: implement the first broader code action as `refactor.inline` for a narrow, verifiable case: a `const` variable with one declaration, exactly one resolved value reference and a literal initializer. All other refactorings remain deferred. No new dependency, workspace index or general JavaScript rewrite engine is introduced.

`src/features/refactorings.ts` derives the action from the current syntax and semantic snapshots. Eligible initializers are strings, numbers, substitution-free templates and the identifiers `true`, `false`, `null` and `undefined`. The provider rejects calls, assignments, imports, parameters, functions, exported declarations, multiple declarators, multiple uses, stale source text and documents with syntax errors. Edits remove the declaration statement and replace the one verified reference with the initializer's exact source text. `src/server.ts` advertises `quickfix` and `refactor.inline` only, with `resolveProvider: false`.

Rationale: broad refactoring in a live-coding language would require a complete JavaScript transformer and reliable mutation analysis. Those are outside the project's semantic scope and would risk disrupting partial patterns. A single-use literal binding is common when prototyping Strudel patterns, and its safety can be established from existing semantic resolution and syntax ranges.

Consequences:

- Clients see one additional deterministic code action kind; no action is applied automatically.
- Inlining preserves expression text and does not reflow or rewrite unrelated code.
- Feature tests cover literal inlining, range filtering, numbers, multi-use, assignment, exported, multi-declarator, call, template-substitution and malformed cases; the stdio test verifies advertisement and response mapping.
- Refactoring computation uses the cached semantic snapshot; its latency is measured by the `refactor-inline-small` workload in the Phase 8 baseline.

## ADR-029 — Bounded on-demand workspace symbols

Status: accepted on 2026-11-27.

Decision: supersede the ADR-024 deferral and implement `workspace/symbol` with a bounded on-demand workspace scan. `src/lsp/workspaceFiles.ts` discovers `.strudel` files beneath the initialized workspace folders, using deterministic traversal with file-count, file-size and depth limits and skipping hidden and generated directories. `src/server.ts` analyzes unopened files at request time, replaces any scanned file with its current in-memory document when open, and uses `src/features/workspaceSymbols.ts` to flatten verified document outlines with container names. Queries use relaxed case-insensitive subsequence matching, and results are limited. No persistent index, watcher, cross-file module graph, symbol resolution or new dependency is introduced.

Rationale: an open-documents-only provider would be incomplete and could mislead clients, while a persistent index with watcher invalidation adds substantial state and failure modes for a single navigation request. A bounded scan is current at request time, uses the same semantic engine and verified declaration ranges as document symbols, and fails safely when individual files are unreadable or oversized.

Consequences:

- `workspaceSymbolProvider` is advertised; `workspaceSymbol/resolve` is not.
- Results reflect unsaved open-document state and on-disk `.strudel` files; files outside workspace folders, other extensions and oversized files are not indexed.
- The scan respects request cancellation and applies explicit limits, so worst-case work is bounded rather than proportional to an unbounded repository.
- Feature tests cover relaxed matching, container names and result limits; stdio tests cover advertisement, scanning of unopened files, open-document overrides and exclusion of non-Strudel files.
- Workspace-symbol scanning is measured by the `workspace-symbols-scan` workload over the committed nested workspace fixture.

## ADR-030 — Performance baseline and advisory regression check

Status: accepted on 2026-11-27.

Decision: use a deterministic in-repository harness with synthetic fixtures as the performance baseline. `scripts/benchmark.mjs` measures 18 transport-independent workloads, reports p50, p95 and p99 using nearest-rank percentiles within five batches and the median across those batches, and stores environment metadata and numeric warning thresholds in `benchmarks/baseline.json`. Thresholds are `max(baseline × 2, 0.05 ms)` for p50, `max(baseline × 2.5, 0.05 ms)` for p95 and `max(baseline × 3, 0.05 ms)` for p99. `npm run benchmark:check` fails locally on a threshold breach or missing workload, while CI runs it with `continue-on-error: true`.

Rationale: a dedicated harness gives repeatable layer-level evidence without adding dependencies, spawning an editor, or exposing internal timing controls in production. Median-of-batches prevents one GC or scheduling pause from setting the committed tail target, while the wider p95/p99 factors absorb remaining observed variance. Multiplying measured percentiles rather than inventing absolute limits accounts for the hardware difference between the development machine and hosted runners. The absolute floor prevents timer noise on sub-millisecond operations from producing false failures. Advisory CI reporting keeps hardware variance from blocking unrelated correctness work while preserving a local regression signal.

Consequences:

- The baseline is environment-specific and must be regenerated deliberately after validated parser, dependency, semantic or hardware changes.
- CI performance output is informational; `npm run check` remains the blocking gate.
- Fixtures and results are kept outside `src/` and the published package.
- Cancellation and superseded-version behaviour remain covered by stdio integration tests rather than latency samples.
- Incremental semantic updates are measured but not yet optimised; the large fixture currently shows the full snapshot rebuild cost.

## ADR-031 — Phase 9 local packaging verification

Status: accepted for local preparation on 2026-11-27; publication awaits explicit release authorization.

Decision: keep the package as a single ESM npm package with a stdio executable at `dist/src/server.js`, replace the stale prototype README with authoritative package documentation, and verify the distributable with `scripts/verify-package.mjs`. The script packs the built tarball, checks the `LICENSE`, `README.md` and compiled server are present while tests and benchmarks are absent, performs a runtime-only `npm ci --offline` followed by an offline install of the tarball, and runs an LSP initialize/shutdown handshake against the installed binary. It is exposed as `npm run verify:package`, `make verify-package` and a CI validation step, and is included in `make verify-all`.

Rationale: a package can pass source-level checks while still shipping the wrong files, missing an executable entry point, or depending on registry access at runtime. Exercising the exact tarball in a temporary offline project verifies the published artifact and the offline-usability requirement without adding dependencies or editor-specific tooling. Keeping prototype instructions in a clearly marked legacy section preserves existing user work while no longer presenting it as package documentation.

Consequences:

- No `npm publish` has been performed; explicit release authorization is still required.
- The parser redistribution gate was resolved by ADR-032: the project and the pinned `tree-sitter-strudel@2.0.2` parser are both AGPL-3.0-only. Publication still requires explicit release authorization.
- The offline verification depends on a populated npm cache from the committed lockfile; it is a packaging check, not a claim that arbitrary machines can install without a cache or registry mirror.
- If the package is released, the README and roadmap release status must be revisited so they no longer describe an unpublished pre-release state.

## ADR-032 — AGPL-3.0-only project licence

Status: accepted by explicit user decision on 2026-11-27; supersedes ADR-003.

Decision: license the root npm package and re-implemented server source under the GNU Affero General Public License, version 3 only (`AGPL-3.0-only`). The root `LICENSE`, root package manifest, committed lockfile metadata and README now use that identifier. Generated Strudel metadata continues to record the accurate `AGPL-3.0-or-later` provenance of its upstream packages. The legacy prototype manifests remain outside the published package and are not changed by this decision.

Rationale: the user asked whether the parser should match "the tree sitter parser and Strudel itself" and whether that licence is GPL-3.0. Verified evidence shows that the exact family is AGPL, not plain GPL, and that the components are not identical:

- Strudel's repository `LICENSE` is AGPL-3.0; `@strudel/core@1.2.6` declares `AGPL-3.0-or-later` in npm and repository metadata.
- The pinned `tree-sitter-strudel@2.0.2` parser declares `AGPL-3.0-only` and bundles an AGPL-3.0 `LICENSE`; its metadata and licence file are consistent.
- The Tree-sitter runtime `tree-sitter@0.25.1` and upstream Tree-sitter repository are MIT, so one identifier cannot match every component named in the question.
- `AGPL-3.0-only` matches the Strudel AGPL family and respects the pinned parser's `-only` term. It is therefore the conservative identifier for the combined project. `AGPL-3.0-or-later` would more literally match Strudel package metadata but would not respect the parser's `-only` term.

Evidence:

- <https://codeberg.org/uzu/strudel/raw/branch/main/LICENSE>
- <https://registry.npmjs.org/@strudel/core/1.2.6>
- <https://registry.npmjs.org/tree-sitter-strudel/2.0.2>
- <https://raw.githubusercontent.com/PedroZappa/tree-sitter-strdl/main/package.json>
- <https://raw.githubusercontent.com/PedroZappa/tree-sitter-strdl/main/LICENSE>
- <https://registry.npmjs.org/tree-sitter/0.25.1>
- <https://raw.githubusercontent.com/tree-sitter/tree-sitter/master/LICENSE>

This is a project-governance and dependency-metadata decision, not legal advice.

Consequences:

- The MIT-authoritative parser decision in ADR-003 and the MIT-corrected parser release gate in `docs/ROADMAP.md` are superseded.
- `npm run verify:package` now checks the installed package's AGPL-3.0-only manifest metadata and AGPL licence text in addition to its existing tarball and stdio checks.
- No `npm publish` has been performed; explicit release authorization is still required.
- This decision can be reopened if the parser dependency is replaced or relicensed under different terms.

## ADR-033 — Initial release identity and SemVer policy

Status: accepted by explicit user decision on 2026-11-27.

Decision: publish the first public version as `0.1.0`, use Git tags of the form `vX.Y.Z` (therefore `v0.1.0` for the first release), and follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The root `package.json` and `package-lock.json` now use `0.1.0`; no tag has been created and no package has been published.

While the package is `0.x`, a MINOR increase may introduce breaking changes, and a PATCH increase is reserved for backward-compatible bug fixes. Backward-compatible additions may also use a MINOR increase. The project makes no stable-API commitment before `1.0.0`; that version requires a separate decision defining the supported public API and compatibility obligations. npm versions are immutable, so corrections after publication use a new version rather than replacing an existing artifact.

Rationale: `0.0.1` was a development placeholder and would misrepresent the first public release. `1.0.0` would claim a stability commitment that has not been approved. `0.1.0` follows the convention for an initial usable pre-1.0 release while leaving room for breaking refinements as real editor feedback arrives.

Consequences:

- Phase 10 release identity is approved; the remaining compatibility-metadata tasks still require completion.
- The release tag, changelog heading and publication authorization must name the same exact version.
- Releases continue to require all Phase 10–12 gates plus the explicit Phase 13 authorization; this ADR is not publication authorization.

## ADR-034 — Deferred user configuration for `0.1.0`

Status: accepted on 2026-11-27 for the first release. The Strudel-version portion remains authoritative for the v1 route; the diagnostics portion was superseded for the unreleased `0.2.0` work by ADR-052, and its stability boundary for v1 is defined by ADR-063.

Decision: do not add a custom configuration channel in `0.1.0`. Diagnostics remain enabled with their provider-defined severities; formatting uses only standard LSP `tabSize` and `insertSpaces` options; language metadata remains pinned to the committed Strudel snapshot. Diagnostic enablement/severity overrides and Strudel compatibility/version selection are deferred.

Rationale: `docs/LSP_FEATURES.md` described diagnostic and Strudel-version options as configuration while the server advertises no dynamic configuration support and the language database contains only one Strudel version. Exposing a version selector would imply support that does not exist, and diagnostic overrides would add a cross-client settings contract before a concrete user requirement has been demonstrated. The conservative diagnostic policy already distinguishes errors, warnings and informational findings, and editor-specific settings remain outside the server core under ADR-005.

Consequences:

- `docs/LSP_FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/TESTING_STRATEGY.md` and the README now state the implemented defaults and deferred options explicitly.
- This is an explicit first-release exception to the broader configuration guidance in `AGENTS.md` section 5; it must be revisited before a stability commitment or when multiple Strudel metadata snapshots exist.
- No capability advertisement, provider behaviour or test suite changes are made by this decision.
- Future settings require configuration contract tests and documentation before implementation; this ADR is not publication authorization.

## ADR-035 — Supported runtime and OS matrix for `0.1.0`

Status: accepted on 2026-11-27.

Decision: support Node.js `^24.0.0 || ^26.0.0` with npm `>=11 <12`, declared through `engines` in `package.json` and the committed lockfile. Both majors are release targets rather than supporting Node 24 alone. The required Phase 11 validation matrix is Linux x64 with glibc, macOS arm64 and Windows x64, tested with the npm version bundled by each supported Node major. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds and are best-effort targets; they are not claimed as supported until validated.

Evidence:

- The Node.js release archive identifies v24.22.3 and v26.13.1 as LTS as of 2026-11-10, with bundled npm v11.19.1 and v11.20.0 respectively: <https://nodejs.org/en/about/previous-releases>, <https://nodejs.org/en/download/archive/v24.22.3> and <https://nodejs.org/en/download/archive/v26.13.1>.
- CI uses a Node 24/26 matrix on Ubuntu; the test globs were corrected after a Node 24 test-discovery failure, so both majors are part of the verified correctness target.
- The pinned `tree-sitter-strudel@2.0.2` package ships prebuilds for `darwin-x64`, `darwin-arm64`, `linux-x64`, `linux-arm64`, `win32-x64` and `win32-arm64`.
- Local development and package verification ran on Node v26.13.1 with npm v11.20.0 on Linux x64.

Rationale: Node 24 and 26 are both maintained LTS lines and CI already covers both, so excluding either would understate the tested runtime. npm 11 is bundled across these Node releases, while earlier npm majors are not part of the supported first-release environment. The required OS subset covers the common platforms where clean-room validation is practical for the first release; the remaining prebuild targets are acknowledged without making an unverified support claim.

Consequences:

- README, `docs/PROJECT_SPEC.md` and the roadmap now state the declared runtime range and required validation matrix.
- Phase 11 must test both Node majors with npm 11 on each required platform, including install paths with and without scripts.
- Supporting additional OS/architecture combinations or Node majors requires validation and an update to this ADR before advertisement.
- This ADR records compatibility policy only; it is not publication authorization.

## ADR-036 — Phase 11 clean-install validation design

Status: accepted on 2026-11-27.

Decision: validate the required runtime matrix with a dedicated GitHub-hosted compatibility workflow instead of assuming that the local Linux x64 host covers every supported platform. The matrix is `ubuntu-latest` for Linux x64 with glibc, `macos-15` for macOS arm64, and `windows-latest` for Windows x64, crossed with Node 24 and 26 using each release's bundled npm 11. Every job builds the package and runs `npm run verify:package`.

`verify-package.mjs` now packs the release candidate once, then installs it in two separate temporary projects: one with `--ignore-scripts` and one with install scripts enabled. Both paths run offline from the npm cache, verify the installed manifest and AGPL licence, load `tree-sitter-strudel` with an actual parse to force the native binding to resolve, assert that no local parser `build` directory was produced, and complete an LSP initialize/shutdown handshake through the platform-specific installed bin shim. The script also asserts that the active Node major is 24 or 26 and that npm is major 11.

Evidence:

- GitHub's hosted-runner reference identifies `ubuntu-latest` as Linux x64, `macos-15` as macOS arm64 and `windows-latest` as Windows x64: <https://docs.github.com/en/actions/reference/runners/github-hosted-runners>.
- Node 24.22.3 and 26.13.1 bundle npm 11.19.1 and 11.20.0 respectively, as recorded in ADR-035.
- The pinned `tree-sitter-strudel@2.0.2` package ships `linux-x64`, `darwin-arm64` and `win32-x64` prebuilds without needing source compilation.
- A local Linux x64 run on Node v26.13.1 and npm 11.20.0 passed both install modes, parser binding load and the installed stdio handshake.

Rationale: the working machine has only Node 26 on Linux x64, Docker access is unavailable, and Node 24 is not installed locally. GitHub-hosted runners provide the declared platforms and Node majors without adding a dependency or a standalone binary requirement. Reusing the packaging verifier keeps the compatibility check aligned with the exact artifact that would be published.

Consequences:

- `.github/workflows/compatibility.yml` runs on pushes to `main`, pull requests and manual dispatch; it does not publish anything.
- The workflow is a blocking correctness matrix, unlike the advisory performance check.
- Phase 11 clean-install and installed-handshake items require a green run of all six jobs before being marked complete.
- The green matrix run on commit `4c3f6b4` recorded both install modes, parser prebuild loading with no compiled `build` directory, and installed stdio handshakes on all six combinations: <https://github.com/PedroZappa/strudel-lsp-server/actions/runs/45990023185>. Detailed platform, Node and npm results are in `docs/TESTING_STRATEGY.md`.
- The first matrix run failed only because Windows `npm.cmd` was spawned without a shell; the verifier now uses the platform shell for npm, and the fix was confirmed by the green run.
- Changes to runner labels, Node majors or npm majors require an update to this ADR and the workflow together.

## ADR-037 — Real documentation corpus validation

Status: accepted on 2026-11-27.

Decision: use the pinned authoritative JSDoc examples in `@strudel/reference@1.2.2` as the Phase 11 real Strudel corpus instead of fetching external `.strudel` files or copying compositions into the repository or npm package. `scripts/validate-corpus.mjs` rechecks the pinned version, tarball, integrity, licence and repository recorded in ADR-014, then feeds all 484 non-empty examples through the production syntax adapter and database-backed semantic engine without rewriting them. For each example it checks parser range and source-text agreement, semantic range bounds, incremental newline append with semantic reuse, and preservation of clean parse state and fact counts. The result is compared with the committed `validation/real-corpus.json`; regeneration is an explicit `npm run validate:corpus:write` operation.

Evidence:

- `@strudel/reference@1.2.2` is generated from the official Strudel repository at `git+https://codeberg.org/uzu/strudel.git`, is pinned by integrity in `package-lock.json`, and exposes 577 documentation records with 484 non-empty examples covering chained patterns, mini notation, user functions, imports, labeled statements and comments.
- The recorded run parsed 484/484 examples without throwing, with 477 clean parses and 7 parser error/missing-node cases; all syntax and semantic ranges matched source text, all 484 incremental updates and reuses completed without throwing, and 347 mini-notation arguments produced zero structural issues.
- Minimal reproductions isolate two upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` in JavaScript expressions and `//` inside string literals such as sample URLs. The seven affected documentation names and SHA-256 identifiers are recorded in the evidence report; no example text is stored.

Rationale: pinned documentation examples are authoritative Strudel source that is already installed as a development dependency, so validation is reproducible and offline without introducing new dependencies, network access at test time or a redistribution question about third-party compositions. Comparing derived facts rather than source text protects the package allowlist while still detecting any parser, corpus or semantic regression.

Consequences:

- `npm run validate:corpus`, `make validate-corpus` and the CI `verify` job on Node 24 and 26 run the deterministic check; report regeneration is deliberate and must be reviewed.
- Upstream parser gaps are documented in `docs/PARSER_INTEGRATION.md` rather than patched in this repository; the grammar remains an external AGPL dependency under ADR-032.
- Unresolved references and conservative mini-notation behaviour are recorded as observations, not new diagnostics.
- This validation decision is not publication authorization; Phase 13 gates still apply.

## ADR-038 — Protocol robustness review

Status: accepted on 2026-11-27.

Decision: keep the `vscode-languageserver@11.0.1` connection as the sole owner of LSP framing, method dispatch, cancellation tokens and lifecycle exit codes, and validate its observable behaviour with a raw stdio harness rather than introducing a custom JSON-RPC layer. Add only three targeted server hardening changes found by the review: tolerant parsing of optional `initialize` fields, capability-gated workspace-folder queries, and rejection of stale document versions before analysis is scheduled.

Evidence:

- `test/protocolRobustness.test.ts` writes raw LSP frames to a spawned server, parses every stdout response frame and asserts framed stdout, valid JSON-RPC envelopes and empty stderr across eight error-path scenarios.
- The review confirmed that malformed JSON bodies are ignored, malformed envelopes produce `window/logMessage`, unknown methods return `-32601`, invalid handler parameters return typed fallbacks without stopping the server, `$/cancelRequest` bounds an in-flight workspace scan, and exit codes are 0 after `shutdown` then `exit` and 1 for `exit` without `shutdown`.
- Before the fix, non-array `workspaceFolders` made `initialize` fail with `-32603`; before capability gating, a minimal no-workspace client could receive `workspace/workspaceFolders`; before the version guard, a version 2 edit following a version 3 edit could be applied after the newer edit. Each case has a regression test.
- `npm run check` passed 63/63 tests, `npm run test:protocol` passed 8/8, `make test-protocol` passed, `npm run verify:package` passed both offline install modes on darwin-arm64, and `npm run benchmark:check` passed all 18 workloads within thresholds.

Rationale: the library already implements the specification-sensitive parts of stdio transport, so a bespoke parser or lifecycle layer would add risk and maintenance cost without evidence of a defect. The observed defects were all in server-owned policy, and the smallest coherent changes fix them at the boundary where the bad input enters the server.

Consequences:

- `npm run test:protocol` and `make test-protocol` are the isolated gates, and the CI `verify` job runs the suite on Node 24 and 26.
- `docs/LSP_FEATURES.md` records the observable protocol lifecycle behaviour; `docs/TESTING_STRATEGY.md` records the review evidence.
- Future transport changes must keep stdout free of non-protocol bytes and extend the raw harness rather than relying only on higher-level feature tests.
- This decision does not authorize publication; Phase 12 and 13 gates still apply.

## ADR-039 — npm namespace and publication access review

Status: accepted on 2026-11-27; gate closed on 2026-11-27 after the operator enabled 2FA. The exact name, ownership and account state should be rechecked immediately before publication under Phase 13.

Decision: retain the exact unscoped name `strudel-lsp-server` for the first release, enable 2FA on the publishing account before publication, and prefer npm trusted publishing through a GitHub Actions OIDC workflow with a protected environment and manual approval over a long-lived npm token. Trusted publishing is configured from the package's settings page, so it cannot be registered until the package exists; first publication may therefore need an operator-supplied token, which must not be stored in the repository or workflow files. The operator supplied account access and enabled 2FA themselves; neither this agent nor the repository performed account changes. No trusted-publisher registration or publication has occurred because Phase 13 has not authorized a release. Sources: <https://docs.npmjs.com/trusted-publishers>, <https://docs.npmjs.com/cli/v11/commands/npm-profile> and <https://docs.npmjs.com/configuring-two-factor-authentication>.

Evidence collected on 2026-11-27:

- `npm config get registry` returned `https://registry.npmjs.org/`; `npm view strudel-lsp-server --json` returned `E404` from that registry, so the exact unscoped name in `package.json` is currently unregistered and available.
- `package.json` declares `name: strudel-lsp-server`, version `0.1.0`, `bin.strudel-lsp-server`, and `repository`, `homepage` and `bugs` URLs under `github.com/PedroZappa/strudel-lsp-server`. The Git remote is `git@github.com:PedroZappa/strudel-lsp-server.git`.
- `gh auth status --hostname github.com` succeeded as account `PedroZappa` with `repo` scope; this confirms repository access only and does not imply npm account access.
- `npm whoami` initially returned `ENEEDAUTH`. The operator subsequently ran `npm login` themselves and `npm whoami` now returns `pedrozappa`, confirming account access. The login credential is held by npm in the operator's `~/.npmrc` outside the repository; it is not recorded here. After login, `npm view strudel-lsp-server --json` still returned `E404`, so the name remains available.
- `npm profile get` initially reported `two-factor auth: disabled` and `npm profile get --json` reported `tfa: false`. The operator enabled 2FA through the npmjs.com web UI; it now reports `two-factor auth: auth-and-writes` and `tfa: {"pending":null,"mode":"auth-and-writes"}`. This satisfies the `2FA or trusted-publisher setup` sub-item. No trusted publisher is registered.
- Trusted publishing is configured from the package's settings page on npmjs.com, but `strudel-lsp-server` is still unregistered; npm issue <https://github.com/npm/cli/issues/8910> confirms the package must be published before a trusted publisher can be added. Consequently 2FA is the only sub-item that can be satisfied before first publication.
- `.github/workflows` contains `ci.yml` and `compatibility.yml` only. No release or publish workflow exists, so no trusted-publisher entry has been configured against a workflow in this repository.

Rationale: the unscoped name is already the documented package identity and is available on the configured registry, so changing it would add needless churn. Trusted publishing is preferred because it removes long-lived tokens and can attach provenance, while an approval-gated environment prevents ordinary commits from publishing. Account access, name availability and 2FA are now verified; the final name recheck and trusted-publisher registration remain release-time operator actions because publication is not authorized.

Consequences:

- Account access, name availability and 2FA are confirmed. The CLI path `npm profile enable-2fa auth-and-writes` failed with `E403` on `POST /-/npm/v1/user` after password prompts; the operator enabled 2FA through the npmjs.com account settings web UI instead. No account security change was made by this agent. Name availability is point-in-time and must be rechecked against the Phase 13 gate.
- The controlled release workflow remains a separate Phase 12 task. It must define the trusted-publisher mapping, the protected environment with manual approval, `id-token: write` for OIDC, provenance generation and no publish path from ordinary commits. Its first-publish path must account for the package not yet existing; trusted publishing is configured after that first publish.
- No publication is authorized by this decision; Phases 12 and 13 gates still apply.

## ADR-040 — Phase 12 licensing and provenance sign-off

Status: accepted on 2026-11-27. This is a release review based on repository and package evidence; it is not legal advice.

Decision: record the first-release licensing and provenance review as complete for the current commit. No licence identifier, dependency or source file was changed for this review.

Evidence:

- Distributed artifact: `npm pack --dry-run --json` produced `strudel-lsp-server-0.1.0.tgz` with 132 files and a size of 146,981 bytes. The file list contains only `LICENSE`, `README.md`, `package.json` and `dist/src/**`. No grammar, generated parser, native binding, parser `build/`, test, benchmark, editor or `.npmrc` file is included. `git ls-files` contains no `grammar.js`, `binding.gyp`, C/C++ source or `build/` entry; the parser remains an external dependency under ADR-032.
- AGPL notices: the root `LICENSE` carries `Copyright (c) 2025-present Zedro`, the AGPL-3.0-only grant text and the full 677-line GNU Affero General Public License version 3 text. `package.json` declares `AGPL-3.0-only`, README documents the project and dependency licences, and `scripts/verify-package.mjs` asserts that the installed manifest has `license: AGPL-3.0-only` and the installed `LICENSE` contains the AGPL heading.
- Dependency licences: all 15 declared runtime and development dependencies are exact-pinned in `package.json` and integrity-pinned in `package-lock.json`. Runtime dependencies are `tree-sitter@0.25.1` (MIT), `tree-sitter-strudel@2.0.2` (AGPL-3.0-only, with a matching bundled AGPL `LICENSE`), `vscode-languageserver@11.0.1` (MIT) and `vscode-languageserver-textdocument@1.0.16` (MIT), each with a registry URL and integrity in the lockfile. The four dev Strudel packages are AGPL-3.0-or-later; remaining dev tooling is MIT or Apache-2.0. These identifiers and the earlier parser history are recorded in ADR-014, ADR-032 and `docs/PARSER_INTEGRATION.md`.
- Generated metadata provenance: `npm run generate:metadata` regenerated `src/languageDatabase/generated.ts` from 576 reference records with no working-tree diff. The generator rechecks each pinned version, tarball integrity, `AGPL-3.0-or-later` licence and Codeberg repository before emitting. The snapshot records package name, version, tarball URL, integrity, licence, repository and role for all four Strudel sources. No compiled source map under `dist/src` contains a local `/Users/zedro` path.
- Real-corpus provenance: ADR-037 records the 484 pinned JSDoc examples; no composition text is copied into the repository or package, only hashes and aggregate counts in `validation/real-corpus.json`.
- No secrets: a scan of all tracked text files for npm/GitHub token patterns, `_authToken`/`_auth`, private-key headers and key/secret/password assignments returned zero hits. `.npmrc` contains only the `legacy-peer-deps=true` setting and its comment, and is excluded from the tarball. No workflow references `secrets.*`.
- Public source URL: `package.json` `repository`, `homepage` and `bugs` URLs and the README source/documentation/issues links all point to `https://github.com/PedroZappa/strudel-lsp-server`. `test/packageScripts.test.ts` asserts the name, licence, bin entry and those URLs.
- Verification: `npm pack --dry-run --json`, `npm run generate:metadata`, `npm run verify:package` (both clean offline install modes, native parser prebuild load, installed AGPL metadata and stdio handshakes, 132 files), `git ls-files`, the tracked-file secret scan and the source-map path scan all passed. No code changed for this review, and `git diff --check` was clean.

Rationale: the evidence is drawn from the actual tarball, lockfile, installed dependency metadata, generated snapshot and committed tests rather than from assumed declarations. Keeping the parser external and the project AGPL-3.0-only maintains the conservative licence position of ADR-032.

Consequences:

- This sign-off is point-in-time. It must be repeated against the exact release commit before publication; a changed dependency, licence field, generated snapshot or tarball file list invalidates it.
- The remaining Phase 12 audit, workflow, dry-run comparison, changelog, rollback and smoke-plan tasks still apply.
- This review does not authorize publication; Phase 13 gates still apply.

## ADR-041 — Phase 12 dependency and secret audit

Status: accepted on 2026-11-27. Release audit evidence for commit `c6a9200d0f7d4aa5fbf2480b6684800cfc13ae7c`; it is not publication authorization.

Decision: record the final dependency and secret audit as complete for the current release candidate, with `npm audit --omit=dev` as the blocking gate. No dependency, lockfile or source change was made for this audit.

Evidence:

- `npm audit --omit=dev --json` exited 0 with `metadata.vulnerabilities` reporting zero info, low, moderate, high and critical findings and no advisories. The blocking gate passes.
- `npm audit --json` for the full tree including development dependencies also exited 0 with zero findings in every severity.
- The unshipped prototype manifests `client/package.json` and `server/package.json` each have a committed `package-lock.json`. `npm audit --json --prefix client` and `npm audit --json --prefix server` both exited 0 with zero findings in every severity. These manifests are excluded from the published tarball under ADR-040.
- A scan of all 123 tracked text files for npm/GitHub token patterns, `_authToken`/`_auth`, PEM private-key headers and key/secret/password assignments found zero hits. No matched values were recorded.
- A static scan of `src/` and `scripts/`, excluding the generated metadata snapshot, found no imports of Node network modules, no `fetch`/`WebSocket` use and no telemetry or analytics identifiers. Occurrences of `segment` in generated Strudel examples are music-pattern text, not network code.
- A runtime guard used a temporary Node `--require` preload that patched `net.Socket.connect`, `http`/`https` `request` and `get`, `dns.lookup` and `resolve*`, `tls.connect`, `dgram.createSocket` and `globalThis.fetch` to log any invocation. The built server was spawned with that preload and completed an `initialize`/`shutdown`/`exit` stdio handshake: exit code 0, both request responses observed, empty stderr and zero probe hits. The harness lives in the approved temporary directory and was not added to the repository or its dependencies.
- `npm run verify:package` passed both offline install modes, native parser prebuild load and installed stdio handshakes on darwin-arm64, as recorded in ADR-040.

Rationale: `npm audit --omit=dev` is the blocking gate because runtime dependencies determine consumer exposure; the full-tree and prototype audits were reviewed as supporting evidence. The runtime guard checks observable behaviour instead of relying only on source inspection.

Consequences:

- This audit is point-in-time for commit `c6a9200`. It must be rerun on the exact release commit; a changed dependency, lockfile, generated snapshot or server code invalidates it.
- No new dependency, npm script or committed test was introduced by the audit.
- This decision does not authorize publication; Phase 13 gates still apply.

## ADR-042 — Controlled release workflow

Status: accepted on 2026-11-27. Source: <https://docs.npmjs.com/trusted-publishers> and <https://docs.npmjs.com/generating-provenance-statements>. This decision adds automation only; it does not authorize or perform publication.

Decision: use a single `.github/workflows/release.yml` with a validate job and a publish job. Pushes of `vX.Y.Z` tags run validation and then the publish job; `workflow_dispatch` is validation-only and requires an explicit version and operator. The publish job requires the protected `npm-release` environment, uses `id-token: write` for npm trusted publishing with automatic provenance, runs on a GitHub-hosted runner, pins `actions/checkout` and `actions/setup-node` to the same commit SHAs as CI, and contains no npm token reference. Ordinary branch commits cannot publish. No `--provenance` flag is used because trusted publishing generates attestations automatically.

Evidence and implementation:

- Workflow triggers are `push.tags: ['v*']` and `workflow_dispatch` inputs `version` and `operator`. The publish job is guarded by `github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')`; the validate job runs for both trigger types. The workflow YAML was parsed and its jobs, triggers, environment and permissions inspected locally.
- The publish job declares `environment.name: npm-release` and `permissions: { contents: read, id-token: write }`. GitHub repository settings must add required reviewers to that environment; this cannot be expressed in the workflow file and remains an operator action. Tag protection is likewise a repository setting.
- `scripts/verify-release.mjs`, exposed as `npm run verify:release` and `make verify-release`, requires npm >= 11.5.1, checks manifest identity and the executable shebang, requires `v${version}` to equal `RELEASE_TAG`, checks that the tag resolves to `HEAD`, rejects tracked worktree changes, requires a named operator for manual validation, and compares `npm pack --dry-run` with `npm publish --dry-run`. Both dry-runs run in a temporary copy because npm normalises `package.json` in place during publish; a local dry-run was observed adding `main`, `directories`, a `git+` repository prefix and a normalised `bin` path, and none of those mutations are retained.
- The comparison covers name, version, filename, size, shasum, integrity and the complete sorted file list. It requires `LICENSE`, `README.md`, `package.json` and `dist/src/server.js`, and rejects tests, prototypes, scripts, parser grammar/binding files, `node_modules` and `.npmrc`. The isolated dry-runs agreed on 132 files for `0.1.0` with shasum `c9e7f8a9b5c5450b03d988e56e119fcb9a3f1daf` in that local run.
- `test/releaseWorkflow.test.ts` asserts the trigger, approval environment, OIDC permission, single publish command, pinned action SHAs, absence of `secrets.`/token names, the post-publish `npm audit signatures` step and the verifier wiring in `package.json` and the `Makefile`. `test/packageScripts.test.ts` was updated to treat it as a root-level test.
- Validation on commit `c6a9200`: `RELEASE_OPERATOR=pedrozappa npm run verify:release`, `npm run check` (66/66), `npm run test:protocol` (8/8), `npm run validate:corpus` (484 examples, zero invariant failures), `npm run verify:package` (132 files, both offline install modes and stdio handshakes), `npm audit --omit=dev` (zero vulnerabilities) and `git diff --check` all passed. No workflow run was triggered and no package was published.

Rationale: a tag trigger gives an immutable commit identity, while the approval environment provides the explicit human gate without editor-specific assumptions. OIDC trusted publishing removes long-lived tokens from repository settings and workflow files. Keeping manual dispatch validation-only avoids a second publish path and the workflow-name ambiguity npm documents for manual publishing. Comparing pack and publish dry-runs in an isolated copy checks the exact artifact contract without altering the candidate.

Consequences:

- Before a release, the operator must create the `npm-release` environment with required reviewers, protect `v*` tags, and register the trusted publisher on npmjs.com with owner `PedroZappa`, repository `strudel-lsp-server`, workflow filename `release.yml`, environment `npm-release` and `npm publish` permission. npm states a new trusted-publisher configuration must complete its first successful publish within two days, so it should be registered close to the authorized release.
- The exact unscoped package is still unregistered, so trusted publishing cannot be configured yet. The first publication therefore needs a separately authorized bootstrap decision: an operator-supplied short-lived credential outside repository files, or an operator-managed publish, with provenance verified afterwards. This workflow cannot provide OIDC authentication until the package exists, and no bootstrap token path is committed. Phase 13 must resolve this explicitly before publication.
- npm requires the published package and source repository to be public and the manifest repository URL to match the source; provenance attestations cannot be generated for a private repository. The manifest currently uses the unsuffixed HTTPS repository URL that npm normalises at publish time; the release-time gate must confirm that normalisation does not break trusted publishing.
- Provenance generation and the `npm audit signatures` verification step cannot be exercised before publication. The roadmap's provenance exit criterion remains open until the first successful release is inspected.
- This decision does not authorize publication; Phase 13 gates still apply.

## ADR-043 — Publish and pack dry-run comparison

Status: accepted on 2026-11-27. This is a release-candidate review on HEAD `c6a9200d0f7d4aa5fbf2480b6684800cfc13ae7c`; it is not publication authorization.

Decision: treat `npm run verify:release` as the canonical `npm pack --dry-run` versus `npm publish --dry-run` comparison, cross-checked against `npm run verify:package`. The publish dry-run executes in an isolated copy because npm normalises `package.json` in place; the comparison therefore leaves the candidate unchanged. No package was published.

Evidence:

- The repository currently has no `v*` tag. HEAD is `c6a9200` and the release-governance changes are uncommitted, so the exact final release commit does not yet exist. This review uses the current candidate state, including the `verify:release` script addition in `package.json`; it must be repeated on the exact tagged commit.
- `RELEASE_OPERATOR=pedrozappa npm run verify:release` passed with npm 11.19.1. It reported version `0.1.0`, 132 dry-run files and matching name, version, filename, size, shasum and integrity from both commands. The local-run shasum was `c9e7f8a9b5c5450b03d988e56e119fcb9a3f1daf`; this is an artifact of that isolated build and is not a stable release identifier.
- The verifier asserts the manifest name, version, `AGPL-3.0-only` licence, public source URLs, `files` allowlist, `dist/src/server.js` bin target and node shebang. It also checks that the packed `LICENSE`, `README.md` and `dist/src/server.js` sizes match the local files, and that `LICENSE` contains the Zedro copyright and full AGPL v3 text.
- `npm run verify:package` passed on darwin-arm64 with Node v26.8.2 and npm 11.19.1: both offline install modes, parser prebuild load, installed `AGPL-3.0-only` manifest and AGPL licence text, a 132-file `strudel-lsp-server-0.1.0.tgz`, and installed stdio initialize/shutdown handshakes.
- `git diff --check` was clean. No workflow was triggered and no registry mutation occurred.

Rationale: dry-run parity checks the artifact contract before the irreversible publish step, while `verify-package.mjs` checks the same tarball after a clean consumer-style install. Running the publish dry-run in a temporary copy prevents npm's manifest normalisation from contaminating the release candidate.

Consequences:

- This comparison is point-in-time. A changed manifest, dependency, generated snapshot or build output invalidates it, and the exact tagged release commit must be rechecked before publication.
- The published tarball must still be verified from the public registry after publication; this review covers only local dry-runs and the locally packed tarball.
- This decision does not authorize publication; Phase 13 gates still apply.

## ADR-044 — Changelog and GitHub release notes preparation

Status: accepted on 2026-11-27. This prepares release text for the planned `0.1.0` publication; it does not create a release, tag or publication.

Decision: keep a versioned `## [0.1.0] - 2026-11-27` section in `CHANGELOG.md` under an empty `Unreleased` heading, and use `.github/RELEASE_TEMPLATE.md` as the prepared body for the GitHub `v0.1.0` release. The changelog is a concise Keep a Changelog record of added, changed, fixed and known-issue items; the release template is the user-facing summary with pinned versions, capabilities, explicit limitations, installed-package verification and links. `test/releaseWorkflow.test.ts` asserts that both artifacts match the manifest version and contain the required release-note sections.

Evidence:

- Version and runtime facts come from `package.json` and ADR-033/ADR-035: version `0.1.0`, `vX.Y.Z` tags, Node `^24.0.0 || ^26.0.0`, npm `>=11 <12`, and the Linux x64/macOS arm64/Windows x64 validation matrix.
- Language facts come from `docs/LANGUAGE_SPECIFICATION.md` and ADR-014: core/mini/transpiler `1.2.6`, reference `1.2.2`, parser `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No Strudel version selection is exposed, as recorded in ADR-034.
- Capability and limitation statements are drawn from `docs/LSP_FEATURES.md`, `docs/SEMANTIC_ENGINE.md` and the README. Known issues include the two upstream grammar gaps behind seven corpus examples recorded in `validation/real-corpus.json` and `docs/PARSER_INTEGRATION.md`.
- Verification statements reuse ADR-036 (six-job compatibility run `45990023185`), ADR-037 (484 examples, 477 clean parses, seven parser gaps, zero invariant failures), ADR-038 (protocol robustness), ADR-043 (dry-run parity) and the recorded `npm run check`/`npm run verify:package` results. No new validation claim is introduced.

Rationale: GitHub populates release bodies from `.github/RELEASE_TEMPLATE.md`, so keeping the prepared notes there avoids a second, conflicting release-note document under `docs/`. The changelog remains the historical package record. `CHANGELOG.md` is not in the current `files` allowlist, so the GitHub release notes are the user-facing summary; changing the allowlist is a separate backlog item.

Consequences:

- The release date, tag, exact commit and `Publication record` line must be confirmed when the authorized release is created. The notes must be reread after any capability, version or verification change; the version-consistency test catches manifest drift but not prose drift.
- Publication and provenance remain unverified and unauthorized under Phase 13. The release template deliberately contains no claim that a publish, signature audit or provenance check has already succeeded.
- This decision does not authorize publication; Phase 13 gates still apply.

## ADR-045 — Rollback and correction policy

Status: accepted on 2026-11-27. This defines policy only; it does not authorize publishing, deprecating, unpublishing or changing dist-tags, and no registry mutation is performed.

Sources: npm's [unpublish policy](https://docs.npmjs.com/policies/unpublish), [`npm unpublish`](https://docs.npmjs.com/cli/v11/commands/npm-unpublish), [`npm deprecate`](https://docs.npmjs.com/cli/v11/commands/npm-deprecate), [dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages) and [version updates](https://docs.npmjs.com/updating-your-published-package-version-number).

Decision:

1. A published `name@version` is never replaced or republished. Corrections to released code are a new SemVer patch version from a new commit and `vX.Y.Z` tag, using the same controlled workflow and gates as the first release. Under the ADR-033 pre-1.0 policy, `0.1.0` corrections are `0.1.1`, `0.1.2`, and so on; `1.0.0` remains reserved for a stability commitment.
2. For an ordinary defect, publish the patch release, add a `CHANGELOG.md` entry, create a GitHub release for the new tag and update `.github/RELEASE_TEMPLATE.md` so the published notes point to the fix.
3. When a released version is known bad, deprecate that specific version with `npm deprecate strudel-lsp-server@X.Y.Z "<message>"`, naming the replacement version and a GitHub issue URL. Deprecation is preferred over unpublishing because it warns installers without breaking existing builds. Deprecate a SemVer range only with explicit approval, since ranges also affect prereleases.
4. A `dist-tag` correction is an exceptional operator action, not an automated rollback: if a newer version was tagged `latest` prematurely and a previously published version is sound, an authorized operator may move the tag. Trusted-publishing dist-tag permission is disabled by default and requires a separate npm configuration and newer CLI than the locally recorded 11.19.1; no workflow change is authorized here.
5. `npm unpublish` is reserved for exceptional security, malware, legal/copyright or credential-exposure cases, or a clearly accidental publication, and only where npm's current criteria allow it. It requires an explicit decision recording the exact version, operator and reason. Unpublishing cannot be undone, the name/version can never be reused, and unpublishing all versions imposes a 24-hour republish wait. Requests outside npm's criteria go through npm support rather than `--force`.
6. Before publication, a failed gate is handled by fixing the candidate on a new commit and rerunning validation; there is nothing to roll back in the registry. Git `v*` tags and released commits are not deleted or rewritten to hide a bad release.
7. User notification uses, as applicable: the npm deprecation warning, a versioned changelog entry, the GitHub release and release notes for the correction, and a linked GitHub issue. Notices must state the affected and replacement versions and must not expose credentials or private data. The workflow contains no automatic rollback or notification step; every registry mutation remains a separately authorized operator action.

Evidence: npm states registry data is immutable and that an unpublished name/version combination can never be reused. Its policy permits unpublishing a newly created package within 72 hours when no registry package depends on it, or an older package with no dependents, fewer than 300 weekly downloads and a single owner; otherwise it recommends deprecation. `npm deprecate` adds a warning for installers and supports specific versions or SemVer ranges. `npm dist-tag add` can retag an existing version. All five sources were fetched from official npm documentation on 2026-11-27.

Rationale: patch releases preserve installers and provenance history, deprecation gives a clear upgrade signal without breaking builds, and unpublishing is a last resort with lasting consequences. Keeping each corrective registry action outside the publish workflow avoids an unattended destructive path and preserves the Phase 13 authorization gate.

Consequences:

- The first release notes now include a short corrections section so users know where fixes and warnings will appear. The test in `test/releaseWorkflow.test.ts` guards the presence of that section.
- A future patch release must repeat the manifest, tag, dry-run, CI and package verification gates; ADR-043's artifact evidence is point-in-time and does not carry over.
- No credential, token, `--force` flag or unpublish/dist-tag command is added to the repository. Any exceptional action needs a new decision with explicit authorization and an operator named at that time.
- This decision does not authorize publication or any rollback action; Phase 13 gates still apply.

## ADR-046 — Post-publication smoke plan

Status: accepted on 2026-11-27. This defines the Phase 13 checklist only; it does not authorize publication or perform any registry, tag or release mutation.

Sources: npm [`view`](https://docs.npmjs.com/cli/v11/commands/npm-view) for published registry fields, npm [`audit`](https://docs.npmjs.com/cli/v11/commands/npm-audit) for `npm audit signatures --json --include-attestations`, and GitHub [release management](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) for tags, drafts and published release records. All three sources were fetched on 2026-11-27.

Decision: after the authorized publication succeeds, verify the Git tag and GitHub release record, public npm metadata and licence, a clean-machine install from the public registry, the documented `strudel-lsp-server` launch command with a full initialize/shutdown stdio handshake, and the release notes. The executable checklist is in the `Post-publication smoke plan` section of `docs/TESTING_STRATEGY.md`. The GitHub release may be prepared as a draft from the exact tag, but it is published only after the smoke checks pass. Evidence must record the version, tag, commit, operator, platform, Node/npm versions, commands and outcomes without tokens or other secrets. A missing provenance attestation is recorded honestly under ADR-042 rather than silently treated as success.

Rationale: pre-publication checks validate a local tarball; only a post-publication check proves what users actually receive from the registry. Running the handshake through the installed `PATH` command validates the documented launch path, while checking the tag and release body keeps Git, npm and user-facing notes tied to the same commit. Keeping registry and Git mutations outside the smoke run preserves the Phase 13 authorization gate and the ADR-045 correction policy.

Consequences:

- Phase 13 now has a deterministic checklist; the required headings are guarded by `test/releaseWorkflow.test.ts`.
- The smoke plan is executed once after publication and repeated for each patch release under ADR-045. Results are added to `docs/TESTING_STRATEGY.md` and the Phase 13 decision record after execution.
- No new npm script, dependency, workflow step or saved credential is introduced by this decision.
- Any failed check blocks release completion and is handled by ADR-045; no registry repair, tag deletion or history rewrite is implied.

## ADR-047 — Phase 13 release authorization

Status: accepted on 2026-11-27. This records explicit user authorization for the first Phase 13 release. It does not create a tag, GitHub release or publication, and it does not waive any remaining gate.

Authorization: publish exactly `strudel-lsp-server@0.1.0`, using `pedrozappa` as the named release operator. The user gave this authorization in response to a direct question naming the exact package version and operator; no token, password, OTP or recovery code was supplied or recorded.

Evidence: `package.json`, `CHANGELOG.md` and `.github/RELEASE_TEMPLATE.md` identify `0.1.0` as the release candidate under ADR-033 and ADR-044. ADR-039 records `pedrozappa` as the npm account returned by `npm whoami` on 2026-11-27. The authorization matches those recorded identities exactly.

Scope and limits:

- This satisfies the Phase 13 task requiring explicit authorization that names the version and operator; no exception to any other gate is granted.
- The release is limited to version `0.1.0`. A different version, a retag, a deprecation, an unpublish or a dist-tag change needs a new explicit decision under ADR-045.
- The first-publish bootstrap decision in ADR-042 remains unresolved. The operator must still choose between an operator-supplied short-lived credential outside repository files and an operator-managed publish, with provenance verified afterwards.
- Git state-changing commands still require the project's per-command approval. This ADR authorizes the release outcome, not an unattended sequence of tag, push or publish commands.
- The exact tagged commit, clean worktree, CI result, package/dry-run parity, namespace recheck, release notes and post-publication smoke plan must all be confirmed at release time as required by Phases 12 and 13.

Rationale: the roadmap explicitly gates first publication on an authorization naming the exact version and operator. Recording it in the decision log makes the scope auditable and prevents later releases from treating a one-time authorization as blanket permission.

Consequences:

- The Phase 13 authorization task and exit criterion can be checked, but Phase 13 remains incomplete until publication and smoke checks succeed.
- No publication was performed while recording this decision, and no credential was added to the repository.
- The next work is the read-only gate confirmation for the exact release candidate, followed by the bootstrap decision before any publish command.

## ADR-048 — Phase 13 gate confirmation

Status: accepted as a review record on 2026-11-27. This does not mark the Phase 13 gate-confirmation task complete: the review found unresolved pre-publication blockers and no approved exception for them. No tag, GitHub release, registry mutation or repository setting was changed.

Scope: Phase 0–12 exit criteria, ADR-039–ADR-047, the current worktree, npm namespace, GitHub release settings and the rerunnable local validation gates. The validation evidence is also recorded in `docs/TESTING_STRATEGY.md`.

Checked gates:

- Release authorization: ADR-047 records exactly `strudel-lsp-server@0.1.0` and operator `pedrozappa`.
- Release identity, configuration boundary, runtime matrix and manifest/README review: ADR-033–ADR-035 and `test/packageScripts.test.ts`; the manifest version is `0.1.0`.
- Licensing/provenance sign-off and dependency/secret audit: ADR-040 and ADR-041, recorded against the candidate tarball and commit `c6a9200`.
- Controlled workflow design and local validation: ADR-042 and ADR-043; no ordinary-commit publish path, no committed token, and matching pack/publish dry-runs on the candidate.
- Changelog, release notes, rollback policy and smoke plan: ADR-044–ADR-046 and their contract tests.
- Local validation rerun during this review: `npm run check` (69/69), `npm run test:protocol` (8/8), `npm run validate:corpus` (484 examples, 477 clean parses, seven upstream parser gaps, zero invariant failures), `npm run verify:package` (132 files, both offline install modes, parser prebuild load and stdio handshakes on darwin-arm64 with Node 26.8.2/npm 11.19.1), `npm audit --omit=dev` (zero vulnerabilities), `npm run benchmark:check` (18/18 workloads within thresholds) and `git diff --check` (clean) all passed.
- Namespace recheck: `npm view strudel-lsp-server version --json` still returned `E404` on 2026-11-27, so the exact unscoped name remains unregistered. `gh auth status --hostname github.com` showed the authenticated GitHub account as `PedroZappa`; no token value was recorded.

Open pre-publication blockers:

1. First-publish bootstrap (ADR-042): the workflow uses OIDC trusted publishing and has no token path, but a trusted publisher cannot be registered until the package exists. The operator must explicitly choose an operator-supplied short-lived credential outside repository files or an operator-managed publish. No such exception or decision has been recorded, so this is not waived.
2. GitHub repository settings: `gh api repos/PedroZappa/strudel-lsp-server/environments/npm-release` returned `404`, and `gh api repos/PedroZappa/strudel-lsp-server/tags/protection` returned `404`. The `npm-release` environment with required reviewers and `v*` tag protection are not configured. These are operator actions outside the workflow file and are blocking.
3. Exact tagged release commit: `git tag -l 'v*'` is empty, `HEAD` is `0e5e022`, and the tracked worktree contains uncommitted release-governance changes. CI, `npm run verify:release`, audits, dry-run parity and release-artifact confirmation must be repeated on the exact commit after those changes are committed and tagged. This is a future gate, not an exception.

Publication-dependent gates (cannot be confirmed before publication): workflow provenance, public registry metadata/licence, installed-package smoke checks, GitHub release record and final changelog presence under the release tag.

Non-blocking deferred work: the release-quality backlog and items deferred until after the first release are intentionally outside the blocking gate set. Their deferral is already visible in `docs/ROADMAP.md` and, where user-facing, in `.github/RELEASE_TEMPLATE.md`; no separate approved exception is required.

Rationale: the Phase 13 task asks for confirmation, not an assumption. Recording a negative result with precise blockers prevents the controlled workflow from being started with missing approval environment, tag protection or bootstrap credentials, and keeps point-in-time evidence from being mistaken for exact-tag evidence.

Consequences:

- The roadmap task stays unchecked until blockers 1 and 2 are resolved and blocker 3 is repeated on the exact tag.
- No `--force`, token, credential or unattended publish path was added or approved.
- The next decision needed is the first-publish bootstrap method with an explicit operator choice; repository settings then require operator configuration outside this repository.
- After those blockers are resolved, the local validation suite should be rerun on the exact tagged commit rather than reusing the candidate evidence above.

## ADR-049 — First-publish bootstrap exception

Status: accepted on 2026-11-27. This is a first-publication-only exception to ADR-042 and the Phase 13 controlled-workflow criterion. It does not authorize publication by the agent, and it does not waive clean-worktree, exact-tag, CI, dry-run, audit, namespace or smoke-plan gates.

Decision: for exactly `strudel-lsp-server@0.1.0`, operator `pedrozappa` performs an operator-managed publish from the validated release commit after all blocking gates pass. No npm token, password, OTP, recovery code or long-lived credential is added to the repository or supplied to the agent. The workflow still validates tag pushes but has no workflow publish for `v0.1.0`; the exact-tag guard is in `.github/workflows/release.yml`. After `0.1.0` exists, the operator configures npm trusted publishing, and `0.1.1` and later releases use the controlled OIDC workflow unchanged. A provenance attestation for `0.1.0` is not assumed; its presence or absence is recorded under ADR-042 and ADR-046 after publication.

GitHub settings: the operator will configure the `npm-release` environment with required reviewers and `v*` tag protection. The agent makes no external repository-setting changes.

Rationale: npm trusted publishing cannot be registered for a package that does not yet exist, while the approved workflow deliberately has no token path. An operator-managed first publication avoids adding a long-lived secret to the workflow. Excluding only the exact `v0.1.0` tag from the publish job prevents a duplicate publish attempt after the operator has published the immutable version; validation still runs on the tag.

Scope and limits:

- This exception supersedes only the first-publish bootstrap blocker recorded in ADR-048. It is limited to exactly `strudel-lsp-server@0.1.0`; a different version, a retag, a deprecation, an unpublish or a dist-tag change requires a new explicit decision under ADR-045.
- The operator controls npm login, 2FA and the publish command. No credential value is recorded in chat, the repository or logs.
- The local annotated tag must point to a clean commit containing the release governance artifacts. CI, `npm run verify:release`, audits, dry-run parity and namespace checks must be repeated on that exact commit and tag.
- The `npm-release` environment and `v*` tag protection remain operator-configured pre-publication gates until confirmed.
- Because the first publish does not use trusted publishing, a missing provenance attestation is a recorded limitation, not a failed smoke check and not a false claim of provenance.

Consequences:

- The Phase 13 bootstrap exception is recorded without weakening later release controls.
- `.github/workflows/release.yml` validates `v0.1.0` but skips its publish job; later `v*` tags retain the approval-guarded OIDC publish path.
- The GitHub release record, smoke plan and rollback policy remain unchanged, and the operator still decides when to publish.
- No publication, tag push, repository-setting change or registry mutation was performed by this decision.

## ADR-050 — Phase 13 publication evidence and provenance limitation

Status: accepted on 2026-11-27 as the final Phase 13 evidence record. It completes the publication-dependent evidence deferred in ADR-048 and records the provenance limitation allowed by ADR-049. It does not alter the published artifact, retag a commit or authorize further registry mutation.

Inputs: version `0.1.0`, tag `v0.1.0`, release commit `271da3738ce1e81161fd0087c17ebe06e7870b06`, operator `pedrozappa`, and release <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.1.0>. The detailed command-level smoke evidence is in `docs/TESTING_STRATEGY.md`.

Recorded evidence:

- Gate resolution: the operator configured the `npm-release` environment with required reviewer `PedroZappa` and admin bypass disabled, and an active tag ruleset targeting `refs/tags/v*` with update, deletion and non-fast-forward restrictions. The local tag was pushed and dereferenced to the expected release commit. Exact-tag CI run `46015208619` succeeded: validation passed and the publish job was skipped for `v0.1.0` under ADR-049.
- Publication: operator `pedrozappa` published `strudel-lsp-server@0.1.0` from the clean exact-commit checkout. The agent handled no npm credential, password, OTP, recovery code or 2FA challenge. The new-name bootstrap produced the public `0.0.0-stage` placeholder; the operator approved the staged `0.1.0` artifact in their authenticated session. Because `npm stage list` was empty in the agent session, the agent verified artifact identity after publication rather than before operator approval.
- Registry identity: published metadata matched the release manifest for name, version, description, licence `AGPL-3.0-only`, homepage, repository, bugs, engines and `bin`. `dist-tags.latest` was `0.1.0`; no deprecation field was present. `dist.shasum` was `c9e7f8a9b5c5450b03d988e56e119fcb9a3f1daf`, matching the expected release artifact. The downloaded tarball reproduced that SHA-1 and `dist.integrity` `sha512-jrsNUsg5amzb1DtGun7Kk3raK8q1vcUonNE3GB0Jl6APlEkir7bgV++y1F7Grun5s3vLO693GczF/u9FZykgmw==`. `fileCount` was 132 and `gitHead` was the release commit.
- Signatures: registry metadata contained registry signatures, and `npm audit signatures --json --include-attestations` on the installed tree reported no invalid or missing signatures. Dependencies with public SLSA attestations were reported as verified.
- Clean installs: isolated prefix installs with fresh caches succeeded locally with `--ignore-scripts` and globally into a clean prefix. Both installed manifests reported `0.1.0`, `AGPL-3.0-only`, the expected `bin` and `engines`, and the installed `LICENSE` contained the AGPL-3.0 notice. The installed PATH shim completed initialize/initialized/shutdown/exit with framed JSON-RPC, advertised completion, definition and workspace-symbol providers, and exited with code 0. Smoke environment: darwin-arm64, Node `v26.8.2`, npm `11.19.1`, registry `https://registry.npmjs.org/`, `legacy-peer-deps=false`, `omit` empty.
- Release record: the GitHub release was drafted from the exact tag before smoke checks and published only after they passed. It has no assets and uses the prepared release template body. No manual dist-tag change, deprecation, unpublish or retag occurred.
- Later-release path: the operator confirmed that npm trusted publishing was configured after `0.1.0` existed for repository `PedroZappa/strudel-lsp-server`, workflow `release.yml`, environment `npm-release`, with publish permission. The agent could not independently list that configuration because `npm trust list` required an operator 2FA challenge; no challenge or credential value was recorded.

Provenance limitation: `strudel-lsp-server@0.1.0` has no public provenance attestation. The registry attestation endpoint returned 404, and ADR-049 did not assume provenance for the operator-managed first publish. This is a supply-chain traceability limitation, not a failed functional smoke check: registry signatures were present, and tarball shasum/integrity matched the locally verified artifact. No provenance was added retroactively because that would require an unauthorized registry mutation. Later releases should use the controlled OIDC workflow, whose attestations remain to be verified on those releases.

Rationale: Phase 13 cannot be marked complete on implementation intent alone. Recording exact-tag CI, public artifact identity, installed behavior and the release record prevents point-in-time candidate evidence from being mistaken for release evidence, while stating the provenance gap plainly avoids a false claim under ADR-042.

Consequences:

- Phase 13 is complete with the provenance limitation recorded here and in `docs/ROADMAP.md` and `docs/TESTING_STRATEGY.md`.
- `0.1.0` remains the only authorized published version; a correction requires a new explicit decision under ADR-045.
- Trusted publishing is operator-confirmed for later controlled releases, but its exact-tag provenance is not yet independently verified by the agent.
- No registry mutation, tag change, deprecation, unpublish or manual dist-tag change was performed by the smoke run.

## ADR-051 — Proposed v0.2.0 scope and deferred work

Status: accepted on 2026-11-27 as roadmap planning only. It approves the recorded scope and its deferred boundary; it does not authorize implementation, a version bump, a tag, a publication, a registry mutation or a GitHub release. A release authorization naming the exact version and operator remains required before Phase 15.

Decision: `0.2.0` is a consolidation release focused on configuration, robustness, consumer-install evidence and the normal controlled publication path. It is not a feature-count release. Phase 14 implements and verifies the selected work; Phase 15 prepares and performs the controlled release only after separate explicit authorization.

In scope for v0.2.0:

- A focused diagnostics configuration through standard `workspace/configuration`: global enablement, per-code severity overrides with suppression, and unchanged defaults when the client has no configuration capability. The codes are `syntax-error`, `unknown-global`, `unknown-pattern-method`, `empty-group`, `unmatched-close`, `mismatched-close` and `empty-step`. `workspace/didChangeConfiguration` is covered. No internal engine settings are exposed. This follows ADR-034 without adding a broad settings surface.
- Bounded workspace-symbol hardening for symlinks, path traversal, unreadable files and file-size/depth limits, retaining open-document overrides and deterministic results. No persistent index, file watcher or cross-file module graph is introduced.
- Clean consumer installation evidence without inheriting this repository's `.npmrc`, especially `legacy-peer-deps=true`. Completed under ADR-054: compatibility was demonstrated and the setting removed with `npm run verify:consumer` evidence.
- A deterministic bounded soak/lifecycle test for rapid edits, repeated initialize/shutdown cycles and memory-growth observation. If timing proves environment-sensitive, the result is advisory; no production timing hooks or telemetry are added.
- One end-to-end JSON-RPC/installed-binary benchmark workload with p50/p95/p99, reported separately from layer-level results and kept advisory under ADR-030.
- Two independent LSP-client smoke tests with all client configuration outside the server core. Results are recorded as client behaviours exercised, and no editor dependency enters the published package.
- Documentation updates as behaviour lands, plus the decision-header correction that adds ADR-050 to the ADR index.

Deferred beyond v0.2.0:

- Strudel compatibility/version selection and multiple metadata snapshots: needs an authoritative multi-version metadata design, not merely another setting.
- Incremental semantic reuse optimization: the current large incremental edit remains slower than full parse/analysis, but complexity is not justified without real editing evidence.
- Replacement of synthetic benchmark fixtures with real-world workloads: requires provenance and redistribution terms.
- Completion resolution, range/on-type formatting, folding ranges, selection ranges, inlay hints, call hierarchy, broader refactorings and cross-file navigation: each remains subject to the usefulness/correctness/cost evaluation in `docs/LSP_FEATURES.md`.
- Packaging allowlist changes, a dependency-update policy, SBOM generation, issue/support templates and any other unassigned item in the Phase 13 release-quality backlog: not selected for this increment.
- Additional release attestations beyond the OIDC provenance to be verified in Phase 15.

Phase 15 boundary: unlike ADR-049, this release uses the controlled OIDC workflow with `npm-release` approval and no bootstrap exception. Provenance absence or mismatch is a blocker, not an assumption. The exact tag, operator and publication time require a new explicit authorization.

Rationale: `0.1.0` established the core language server and exposed a finite set of concrete follow-up gaps. Addressing those gaps and proving the normal trusted-publish path gives more user value than partially implementing several deferred capabilities. Keeping the deferred list explicit prevents roadmap entries from becoming implicit commitments.

Consequences:

- `docs/ROADMAP.md` now has Phases 14–15 as planned work and marks selected backlog items as assigned to Phase 14.
- No source, manifest, lockfile, test, benchmark, release note or registry state was changed by this decision.
- Phase 14 implementation requires its own task authorization; Phase 15 publication requires a separate authorization naming `0.2.0` and the operator.
- `0.1.0` remains the only published version, and its provenance limitation remains recorded in ADR-050.

## ADR-052 — Focused diagnostics configuration

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 task; it does not authorize a version bump, tag or publication.

Decision: add a narrow settings surface using standard LSP configuration, without exposing internal engine settings. Clients that advertise `workspace.configuration` receive a `workspace/configuration` request for the `strudelLsp` section. A client may also send `workspace/didChangeConfiguration` with settings under `strudelLsp.diagnostics`.

Accepted settings:

- `diagnostics.enabled`: boolean, default `true`.
- `diagnostics.severity`: optional map from `syntax-error`, `unknown-global`, `unknown-pattern-method`, `empty-group`, `unmatched-close`, `mismatched-close` and `empty-step` to `error`, `warning`, `information`, `hint` or `off`.
- Omitted or invalid values retain provider defaults. `off` suppresses the diagnostic. Enabled quick fixes are derived from the resulting diagnostics, so suppression also suppresses the corresponding fix.
- A global `enabled: false` suppresses all diagnostics and fixes.

Defaults remain unchanged when a client does not advertise configuration capability. Dynamic changes are reparsed and all open documents receive republished diagnostics. Formatting continues to use only standard LSP `tabSize` and `insertSpaces` options, and Strudel version selection remains deferred because only one metadata snapshot exists.

Rationale: ADR-034 deferred a broad settings contract for the first release. The `0.2.0` scope in ADR-051 selected one concrete diagnostics use case; a standard LSP section avoids editor-specific files and keeps the surface small. Provider defaults stay authoritative unless a client explicitly supplies a valid override, preserving live-coding resilience and published `0.1.0` behavior.

Consequences:

- Parsing and application are isolated in `src/configuration/` and consumed by the diagnostics provider, quick-fix provider and LSP server lifecycle.
- Configuration contract tests cover defaults, invalid values, both LSP delivery shapes, severity remapping, suppression and dynamic republishing.
- `docs/LSP_FEATURES.md`, `docs/TESTING_STRATEGY.md`, the README and the CHANGELOG describe this as unreleased behavior until a version is published.
- No Strudel version selector, engine tuning setting, editor-specific configuration file or new dependency is introduced.

## ADR-053 — Workspace-symbol filesystem boundary

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 hardening task; it does not authorize a version bump, tag or publication.

Decision: keep workspace-symbol discovery bounded and on demand, and make its filesystem boundary explicit. Workspace folder URIs are normalized before traversal. Directory entries with separators, `.`/`..` names or NUL characters are rejected, as are resolved paths outside the root. Symlink entries are never followed. Unreadable directories, stat failures and read failures are skipped without failing the symbol request. File count, file size and directory depth limits remain enforced, including a post-read UTF-8 byte-length check. Directory and result ordering use code-unit comparison rather than locale-dependent `localeCompare`.

An injectable `WorkspaceScanFileSystem` seam is used for deterministic tests; production uses the Node filesystem implementation by default. The server continues to override scanned contents with open documents and does not add a persistent index, file watcher, cross-file module graph or production telemetry.

Rationale: the original scan was already bounded, but symlink handling was implicit in `Dirent` behaviour, ordering depended on the host locale, and filesystem error paths were difficult to cover deterministically across operating systems. ADR-051 selected this hardening task for `v0.2.0`; the narrow test seam proves the boundary without adding an editor dependency or a user-facing configuration surface.

Consequences:

- `src/lsp/workspaceFiles.ts` owns normalization, containment, symlink rejection, limit enforcement and deterministic ordering.
- `test/lsp/workspaceFiles.test.ts` is an isolated suite exposed through `npm run test:lsp`, `make test-lsp` and CI.
- The pre-change locale ordering was observed as `_a.strudel,a.strudel,B.strudel`; the new contract returns code-unit order.
- Published `0.1.0` behaviour is unchanged in the registry; these updates remain unreleased until separately authorized.

## ADR-054 — Clean consumer install and `.npmrc` removal

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 consumer-install task; it does not authorize a version bump, tag or publication.

Decision: remove the repository `.npmrc` and require `legacy-peer-deps=false` for both consumer and development installs. A new `npm run verify:consumer` script (`make verify-consumer`, also run in CI) packs the built server, creates a consumer directory outside the repository, empties user and global npm configuration into isolated files, uses a fresh npm cache, installs the tarball with `--legacy-peer-deps=false`, and checks the installed manifest, licence, native parser prebuild, `.bin` shim and stdio initialize/shutdown in both `--ignore-scripts` and default-script modes. Existing package verification remains unchanged for offline installs from the committed lockfile.

Rationale: ADR-013 kept the workaround until compatibility was demonstrated. `tree-sitter-strudel@2.0.2` declares `tree-sitter ^0.25.0`, which matches the pinned runtime, and no other direct dependency has an unmet peer range. Leaving a repository-wide legacy-peer setting would hide real resolution failures from consumers and from CI.

Evidence: on darwin-arm64 with Node `v26.8.2`, npm `11.19.1`, registry `https://registry.npmjs.org/` and isolated `legacy-peer-deps=false`, both consumer install modes passed for the 138-file tarball. The installed manifest matched name, version, licence, `bin` and `engines`; the AGPL `LICENSE` text, native parser prebuild and stdio handshake passed. A development `npm ci --dry-run` with the same isolated configuration resolved all 137 pinned packages. No npm credential, token, password, OTP or recovery code was read or recorded.

Consequences:

- `.npmrc` is deleted; default npm peer resolution applies in the repository and CI.
- `scripts/lib/installVerification.mjs` shares npm/stdio verification helpers between `verify-package.mjs` and `verify-consumer.mjs`.
- `test/packageScripts.test.ts` guards the verification scripts and the absence of a repository `.npmrc`.
- Published `0.1.0` remains unchanged; these changes are unreleased until separately authorized.

## ADR-055 — Hermetic npm cache for package verification

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision fixes local verification reliability; it does not authorize a version bump, tag or publication.

Decision: isolate only npm's cache writes during `npm pack`. `scripts/verify-package.mjs` now uses a temporary npm cache and empty user/global npm configuration for packing, while its `npm ci --offline` and tarball installs continue to use the surrounding cache populated by the normal development install. The package-content preview moves from a raw `npm pack --dry-run --ignore-scripts` in CI and `make pack-check` to `npm run verify:contents`, which performs the same hermetic pack and asserts the full tarball allowlist without installing. `npm run verify:package` keeps both offline install modes, the parser prebuild check, AGPL metadata checks and the installed stdio initialize/shutdown handshake.

Evidence: before the change, the local default cache contained a pre-existing root-owned `content-v2/sha512/0d/3b` directory, and `npm pack --dry-run --ignore-scripts` failed with `EEXIST`/`EACCES` before any project verification ran. After the change, `npm run verify:contents`, `npm run verify:package`, `npm run verify:consumer`, `npm run benchmark:check`, `npm run check` (82/82 tests) and a complete `make verify-all` all passed with the default global cache on darwin-arm64 with Node `v26.8.2` and npm `11.19.1`. The pack reported the expected 138 files. No global cache file or permission was changed.

Rationale: a pack operation need not consume or mutate the dependency cache, so a corrupt or unwritable global cache should not mask the correctness of the package. Isolating the entire verification, including installs, would weaken the offline-install guarantee; keeping installs on the ambient cache preserves that check while removing only the unrelated cache-write dependency.

Consequences:

- `scripts/lib/installVerification.mjs` owns the shared isolated-environment helper; `scripts/verify-package.mjs` and `scripts/verify-consumer.mjs` reuse it.
- `npm run verify:contents`, `make pack-check` and the CI package-content step replace the bare `npm pack --dry-run` preview while retaining its allowlist assertion.
- `test/packageScripts.test.ts` guards the new script entry; published `0.1.0` and its release dry-run evidence are unchanged.
- `npm run verify:release` still performs direct `npm pack --dry-run` and `npm publish --dry-run` comparisons under ADR-043 and is not part of `make verify-all`; a local damaged cache may still require operator cache remediation for that release-specific gate.

## ADR-056 — Bounded soak/lifecycle test

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 robustness task; it does not authorize a version bump, tag or publication.

Decision: add `test/soakLifecycle.test.ts`, exposed as `npm run test:soak` and `make test-soak` and run in CI. The suite performs three initialize/shutdown cycles. In each cycle it opens one document, sends 64 rapid full-document edits with a lower-version stale edit, flushes pending analysis with intermediate document-symbol requests at bounded intervals, then asserts that the final document symbol is the last valid edit, that the final published diagnostics are empty, that stdout remains framed with no partial bytes, that stderr is empty, and that shutdown exits with code 0. A shared `test/helpers/rawStdioClient.ts` harness is used by both this suite and the protocol robustness suite; no production code is changed for the test.

RSS is sampled from the child process with `ps -o rss= -p <pid>` on POSIX systems and reported through Node's test diagnostics. It is advisory: no pass/fail growth threshold is asserted because JIT, GC, operating-system caching and process sampling vary by environment. Windows cycles still run and report that RSS observation is unavailable. No timing hooks, memory reporting channel, production telemetry, new dependency or editor-specific client is introduced.

Evidence: `npm run test:soak` and the full `npm run check` passed on darwin-arm64 with Node `v26.8.2` and npm `11.19.1`. The final full run covered three cycles of 64 edits in 1,060 ms with no transport or lifecycle failures. RSS observations were 76,112 → 79,520 KiB, 75,808 → 79,088 KiB and 75,344 → 78,768 KiB across six samples per cycle. Growth was treated as JIT/GC warm-up evidence, not a leak threshold.

Rationale: ADR-051 selected a deterministic soak/lifecycle test for live-coding robustness. Process-level cycles test the full stdio lifecycle and release of server state, while interleaved requests prove that rapid edits do not leave stale document state or transport corruption. Hard RSS assertions would turn host-specific memory behaviour into a flaky correctness gate, so the structural lifecycle assertions are blocking and the memory trend is recorded as advisory evidence.

Consequences:

- `test:soak` is part of the full suite and has a focused Makefile and CI entry; the package contents and runtime dependencies are unchanged.
- Memory observations are documented but are not benchmark percentiles and do not alter the Phase 8 baseline or advisory latency thresholds.
- Published `0.1.0` remains unchanged; these changes are unreleased until separately authorized.

## ADR-057 — Separate advisory installed-binary benchmark

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 end-to-end measurement task; it does not authorize a version bump, tag or publication.

Decision: add `scripts/benchmark-e2e.mjs` as a second, advisory benchmark harness. It packs the built server with an isolated npm cache, installs that tarball offline from the pinned lockfile into a temporary project, verifies the native parser prebuild, and launches the installed `node_modules/.bin/strudel-lsp-server` shim. One workload, `jsonrpc-installed-document-symbol`, drives five independent server processes. Each process completes five warm-up and twenty measured cycles of `textDocument/didChange` followed by a `textDocument/documentSymbol` request. Timing covers JSON-RPC framing, IPC, parsing, semantic analysis and response serialisation. Percentiles use the same nearest-rank-within-batch and median-across-batches method as the layer harness. `npm run benchmark:e2e` prints the result; `npm run benchmark:e2e:write` refreshes the machine-readable `benchmarks/end-to-end.json` report. Makefile targets and an advisory CI step are provided.

The report has `advisory: true`, p50/p95/p99, sample counts and environment metadata, but no thresholds and no entry in `benchmarks/baseline.json`. `npm run benchmark:check` therefore remains an 18-workload layer-level check, and CI runs the installed-binary harness with `continue-on-error: true`. This resolves the phase-exit wording that mentioned a baseline and advisory check in favour of ADR-051's explicit requirement to report the JSON-RPC path separately and keep it non-blocking; the roadmap records that clarification.

Evidence: on darwin-arm64 with Node `v26.8.2`, npm `11.19.1` and an Apple M4 Pro, `npm run benchmark:e2e:write` completed 100 samples in five batches with p50/p95/p99 of 0.337/0.575/0.735 ms. `npm run benchmark:check` still passed all 18 layer-level workloads, and `npm run check` passed 84/84 tests including a new contract test that asserts the report is advisory, has positive percentiles and is absent from the layer baseline. No registry package, published version or npm credential was involved.

Rationale: ADR-051 selected one end-to-end JSON-RPC/installed-binary workload with separate, advisory reporting. Process startup would dominate a per-sample spawn and would not represent editor latency, so each batch reuses one installed server while still exercising the real bin shim. Adding this workload to the committed baseline would create host-dependent warning thresholds and imply a blocking editor-latency gate that the project does not have. Keeping the report separate preserves honest layer-level targets while recording the slower full path.

Consequences:

- `scripts/lib/benchmarkStats.mjs` now owns constants and percentile helpers shared by both benchmark harnesses; layer-level behaviour and its 18 thresholds are unchanged.
- The installed-binary harness adds no production timing hook, telemetry, editor dependency or npm dependency, and the published package allowlist is unchanged.
- Published `0.1.0` remains unchanged; these changes are unreleased until separately authorized.

## ADR-058 — Independent local LSP-client smoke evidence

Status: accepted on 2026-11-27 for the unreleased `0.2.0` work. This decision implements the selected Phase 14 two-client smoke task; it does not authorize a version bump, tag or publication.

Decision: add a local-only `smoke/` tree with two independent LSP clients. VS Code `1.148.0` drives the server through `vscode-languageclient@9.0.1` from the existing prototype client dependencies; Neovim `0.12.6` drives it through its built-in LSP client. Both launch the compiled `dist/src/server.js` over stdio with their own client-side configuration outside `src/`, `test/` and the npm `files` allowlist. `scripts/smoke-clients.mjs` runs the two clients sequentially, checks structured per-client results, and refreshes `validation/client-smoke.json` only when both pass. Makefile targets and local npm scripts wrap the same commands. The CI workflow is unchanged because hosted runners do not guarantee installed editors.

Each client exercised six observable behaviours: initialize/capabilities, `didOpen` diagnostics for an unresolved call, position-aware completion for a local declaration, document symbols, `didChange` synchronization reflected in updated symbols, and clean shutdown/client stop. The committed report records both clients passing all six behaviours on darwin-arm64 with Node `v26.8.2`.

Rationale: ADR-051 requires two independent client implementations and forbids editor dependencies in the published server. Using an installed VS Code application plus Neovim's built-in client tests different configuration and request paths without installing a new root dependency or downloading an editor at validation time. Keeping the harness out of CI avoids false failures from missing editors while preserving repeatable local evidence. The VS Code extension directory links to the already-present prototype `client/node_modules` instead of copying or installing a language client into the server.

Consequences:

- No production code, default behaviour, published dependency, package allowlist, registry state or release metadata was changed by this task.
- The smoke harness is local evidence, not a blocking correctness gate or a substitute for the existing raw protocol and stdio integration suites.
- The evidence file records editor versions and behaviours rather than editor-specific implementation details in the server.
- Published `0.1.0` remains unchanged; these changes are unreleased until separately authorized.

## ADR-059 — v0.2.0 release-preparation authorization

Status: accepted on 2026-11-27 for release preparation only. The user explicitly authorized preparing `strudel-lsp-server@0.2.0` with `pedrozappa` as the named release operator. This authorization permits the version bump, versioned `CHANGELOG.md` section, GitHub release notes, exact release-candidate commit and validation of that commit. It does not authorize a Git tag, `npm publish`, deprecation, dist-tag change, GitHub release or any registry mutation; those remain separate explicit Phase 15 actions.

Decision: prepare `0.2.0` as the consolidation release selected in ADR-051. The Phase 14 behaviour is treated as release-candidate behaviour rather than an open-ended development tree. The ADR-049 bootstrap exception applies only to `0.1.0`; any eventual `0.2.0` publication must use the controlled OIDC workflow with `npm-release` approval and verified provenance.

Evidence: the authorization was given in response to a direct question naming the exact package version `strudel-lsp-server@0.2.0` and the operator `pedrozappa`. No npm credential, token, password, OTP or recovery code was supplied or recorded.

Consequences:

- `package.json` and `package-lock.json` declare `0.2.0`; dependencies, engines, published file allowlist, parser pin and metadata pins are unchanged.
- `CHANGELOG.md` has a versioned `0.2.0` section and `.github/RELEASE_TEMPLATE.md` contained prepared GitHub release notes at preparation time. Both describe deferred work; the publication wording was reconciled after ADR-060 under ADR-061.
- The exact release-candidate commit is validated with the full local gate, focused suites, corpus validation, package and consumer-install verification, dependency audits, benchmarks and client smoke evidence; results are recorded in `docs/TESTING_STRATEGY.md`.
- Published `0.1.0` remains unchanged. Phase 15 tag, publication, provenance and post-publication smoke tasks were separately authorized in ADR-060 and executed as recorded in ADR-061.

## ADR-060 — Phase 15 controlled publication authorization

Status: accepted on 2026-11-27. The user explicitly authorized publishing exactly `strudel-lsp-server@0.2.0`, tagging exactly `v0.2.0`, and using `pedrozappa` as the named release operator. The user separately authorized adding an exact `v0.2.0` deployment policy to the `npm-release` GitHub environment so the controlled workflow could run from the tag. The existing reviewer `PedroZappa` and `can_admins_bypass: false` settings remain unchanged. This authorization permits the controlled OIDC workflow, provenance verification and the ADR-046 post-publication checks. It does not permit a local publish, the ADR-049 bootstrap exception, deprecation, dist-tag changes, unpublishing, retagging or any other registry mutation.

Decision: publish the exact validated release commit `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488` only through `.github/workflows/release.yml` with `npm-release` approval. ADR-049 applies only to `0.1.0`; `0.2.0` must not be published locally. Provenance absence or mismatch is a blocker rather than an assumption.

Evidence: the authorization named the exact package version, tag and operator. The environment policy was added as id `68534334` with `name: v0.2.0` and `type: tag`; the pre-existing `v*` branch policy remained. No npm credential, token, password, OTP or recovery code was supplied, read or recorded.

Consequences:

- Tag `v0.2.0` was created on the verified release commit and pushed to `origin`.
- Workflow run `46038153400` was rerun after the tag policy change; its validation job passed and the controlled publish job published the version.
- No local publish, deprecation, dist-tag change, unpublish or retag was performed. Registry and smoke evidence are recorded in ADR-061.

## ADR-061 — Phase 15 publication and smoke evidence

Status: accepted on 2026-11-27. This decision records the completed `0.2.0` publication, its verification evidence and the transient workflow-verification limitation.

Decision: treat `strudel-lsp-server@0.2.0` as published only after the controlled workflow accepted the exact artifact, registry metadata and tarball identity matched, signatures and SLSA provenance verified, and the ADR-046 smoke plan passed. The failed final step in the original workflow run is recorded honestly as a registry-visibility race; it is not treated as authorization to repeat an immutable publish.

Evidence:

- Release identity: `HEAD`, `refs/tags/v0.2.0^{commit}` and remote tag all resolved to `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488`; the tracked worktree was clean.
- Controlled workflow: run `46038153400` validation job `140640438479` passed. Publish job `140640920093` ran `npm publish --access public` with OIDC and logged `+ strudel-lsp-server@0.2.0`; no local publish occurred. The immediate verification step failed with `ETARGET` because the registry was still processing the new version. The version became visible after about 40 seconds; no republish was attempted.
- Registry and tarball: `npm view` matched the release manifest and licence, `dist-tags.latest` was `0.2.0`, no deprecation was present, `gitHead` matched the release commit, `fileCount` was 138, and the downloaded tarball reproduced `dist.shasum` `17dd046d8d682216fd8dd6e56df6277f78eab2f2` and `dist.integrity` `sha512-r/jcuM8KkGJH+6EIYWaqH1dmydgMNCJvp2lgSVr96nd9EgpKBoSeJhCEmpS2ExhX+Db4vtMeBrkkNx9F39bzQw==`.
- Signatures and provenance: `npm audit signatures --json --include-attestations` on the clean public-registry install reported `invalid: []` and `missing: []`, with `strudel-lsp-server` verified. The registry attestation endpoint returned two attestations including SLSA v1; the subject name and digest, `refs/tags/v0.2.0`, repository, `.github/workflows/release.yml` and resolved commit `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488` all matched the release.
- Smoke checks: isolated local and global installs used fresh caches outside the repository. Both installed manifests, `LICENSE`, documented PATH launch and installed stdio `initialize`/`initialized`/`shutdown`/`exit` handshake passed. Environment was darwin-arm64 with Node `v26.8.2`, npm `11.19.1`, registry `https://registry.npmjs.org/`, `legacy-peer-deps=false` and empty `omit`; no secrets were recorded.
- Release record: GitHub release `v0.2.0` was published from the tag with no assets, using `.github/RELEASE_TEMPLATE.md` and linking to the versioned changelog section. A validation-only workflow dispatch on the same tag, run `46040246152`, failed at `npm publish --dry-run` parity after publication because npm rejects dry-runs for an existing immutable version; no publish was attempted in that run.

Consequences:

- `0.2.0` is the latest published release and `0.1.0` remains available.
- The workflow-verification race and post-publication dispatch limitation are documented rather than hidden; neither invalidates the independently verified published artifact.
- Documentation and release notes were reconciled from prepared-candidate wording to published-release wording.
- No deprecation, dist-tag change, unpublish or retag occurred, and no credential, token, password, OTP or recovery code was exposed.

## ADR-062 — Publication-state-aware release verification

Status: accepted on 2026-11-27 after the `0.2.0` publication was complete. This decision hardens the release verifier for repeat runs. It does not alter the published artifact, registry state, Git tag or GitHub release, and it does not authorize another publication.

Problem: `scripts/verify-release.mjs` used `npm publish --dry-run` as a repeatable content-parity gate. npm applies immutable-version rules to dry-runs too, so every rerun after `0.2.0` existed failed with `You cannot publish over the previously published versions: 0.2.0`. Run `46038153400` attempt 3 and validation-only dispatch `46040246152` failed at that step even though attempt 2 had published and independently verified the artifact. The same error was reproduced from a clean temporary copy.

Decision: make verification publication-state aware. The verifier first calls `npm view <package>@<version> --json` and treats an `E404` response as an unpublished candidate. For unpublished candidates, the existing `npm pack --dry-run` versus `npm publish --dry-run` comparison is unchanged. For versions already on the registry, the verifier skips the publish dry-run and instead compares the locally packed artifact with registry `name`, `version`, `license`, `gitHead`, `dist.shasum`, `dist.integrity` and `dist.fileCount`. File allowlist, local file-size, licence-text and executable checks run in both paths. Published-version verification must run from the immutable release commit so its README and compiled sources reproduce the immutable tarball. The workflow-dispatch input now states this requirement and accepts an optional `ref`, letting a dispatch from `main` use the updated verifier while checking out `v0.2.0`; the push-tag publish path is unchanged and workflow dispatch still cannot publish.

Rationale: dry-run parity is a pre-publication gate, not a repeatable post-publication gate. Registry identity comparison is deterministic, needs no credentials and performs no registry mutation. Keeping the pre-publication path unchanged preserves the original release gate; rejecting a mismatched `gitHead` or tarball digest prevents a later commit from being mistaken for the published release.

Consequences:

- A workflow dispatch from the updated `main` with `ref: v0.2.0` can validate the published artifact instead of failing on npm immutability; push-tag reruns of the historical tag still use that tag's old workflow until a new tag is created.
- `npm run verify:release` still passes on an unpublished candidate version; a simulated `0.2.1` candidate reproduces the unchanged 138-file pack/publish parity path.
- The published `0.2.0` tarball, provenance, tag, release notes and registry metadata remain unchanged.
- No deprecation, dist-tag change, unpublish, retag, local publish or credential handling was introduced.

## ADR-063 — Initial v1 stability charter

Status: accepted on 2026-11-27 for the proposed feature-expanded route, with a Phase 26 frozen-baseline amendment recorded at the end of this ADR. The amendment supersedes the initial capability and configuration bullets below while retaining them as historical charter context. It does not authorize feature implementation, a version bump, a tag or publication.

Problem: ADR-033 reserves `1.0.0` for a separate stability decision. ADR-034 requires its first-release configuration exception to be revisited before a stability commitment. The feature-expanded roadmap adds semantic depth, mini-notation structure, editor ergonomics and scale work before `1.0.0`, so the contract must state what is already stable, what is a known limitation, what is an additive candidate and what is a standing non-goal.

Decision: define the initial v1 public contract as follows.

- **Package and transport:** the package remains the unscoped npm package `strudel-lsp-server`, with the `strudel-lsp-server` executable launching `dist/src/server.js` over standard LSP stdio. The server remains editor-agnostic, ESM and AGPL-3.0-only. ADR-064 retains the npm `files` allowlist of compiled `dist/src` outputs and `LICENSE`; every v1 artifact must include the executable and licence and must remain installable offline after installation.
- **Runtime and platforms:** Node.js `^24.0.0 || ^26.0.0` with npm `>=11 <12`, declared through `engines`. The supported matrix is Linux x64 with glibc, macOS arm64 and Windows x64 across both Node majors. Linux arm64, macOS x64 and Windows arm64 remain best-effort parser prebuild targets until explicitly validated.
- **Stable capability baseline:** incremental text synchronisation; diagnostics through `textDocument/publishDiagnostics`; completion with the `.` trigger; hover; signature help with `(` and `,` triggers; definition; references; document symbols; on-demand workspace symbols without resolve; document formatting for the whole document only; full-document semantic tokens with `range: false` and no delta support; rename with `prepareProvider`; and code actions limited to `quickfix` and `refactor.inline` with `resolveProvider: false`. Every advertised provider must be backed by passing feature, protocol and live-coding tests.
- **Deliberately unsupported at the charter baseline:** completion resolution, range or on-type formatting, semantic-token range and delta requests, `workspaceSymbol/resolve`, folding ranges, selection ranges, inlay hints, call hierarchy, implementation and type-definition requests, TCP transport, and editor-specific core dependencies. Capabilities added in Phases 20–24 become part of the v1 contract only when implemented, advertised and frozen in Phase 26; earlier blanket deferrals of folding, selection ranges, inlay hints and call hierarchy are superseded by proposed Phase 23 rather than treated as standing non-goals.
- **Configuration:** the only custom settings section is the standard LSP `strudelLsp` section delivered through `workspace/configuration` or `workspace/didChangeConfiguration`. `diagnostics.enabled` defaults to `true`; `diagnostics.severity` is an optional map to `error`, `warning`, `information`, `hint` or `off`; omitted or invalid values retain provider defaults. This surface is stable-additive for v1: its existing keys, defaults and semantics are stable, while new optional sections or diagnostic codes may be added in a MINOR release. Renaming or removing a key or code, changing a default that alters diagnostics, or exposing internal engine settings is breaking. Formatting preferences continue to come from standard LSP `tabSize` and `insertSpaces`; no editor-specific configuration file is introduced.
- **Diagnostic codes:** `syntax-error`, `unknown-global`, `unknown-pattern-method`, `empty-group`, `unmatched-close`, `mismatched-close` and `empty-step` are stable identifiers with stable suppression semantics. Adding a code is additive; removing or renaming one, or changing when a code is reported in clean versus incomplete input, is breaking unless required by a correctness fix recorded in the changelog.
- **Language and dependency pins:** the supported Strudel snapshot is `1.2.6` for core, mini and transpiler semantics with `@strudel/reference@1.2.2` JSDoc records. Runtime pins are `tree-sitter@0.25.1`, `tree-sitter-strudel@2.0.2`, `vscode-languageserver@11.0.1` and `vscode-languageserver-textdocument@1.0.16`, reproduced by the committed lockfile. The grammar is consumed as an npm dependency and is never vendored. ADR-065 records the detailed update policy and makes these pins the accepted compatibility boundary; any parser, metadata or Node pin change requires corpus validation, compatibility reruns and an explicit SemVer assessment.
- **Known limitations:** unresolved references are conservatively not reported, signature fidelity is limited, mini-notation analysis is lexical rather than a full language AST, no persistent workspace index or file watcher exists, and the two upstream grammar gaps for `%` modulo in JavaScript expressions and `//` inside strings are formally accepted for the pinned parser by ADR-065. Performance evidence reports p50/p95/p99 from advisory harnesses; `1.0.0` makes no editor-perceived latency SLA unless Phase 26 accepts blocking thresholds.
- **Standing non-goals:** a complete JavaScript or TypeScript compiler/type checker, standalone binary distribution instead of the npm package, editor-specific dependencies in the server core, production telemetry, copying the grammar or generated parser into this repository, and a persistent workspace index or file watcher as a prerequisite for navigation. Bounded on-demand cross-file navigation may be added under Phase 23 without overturning this non-goal.
- **Amendment and SemVer:** pre-`1.0.0` development follows ADR-033. From `1.0.0`, a PATCH is a backward-compatible correction, a MINOR is a backward-compatible contract extension such as a new capability, optional setting or diagnostic code, and a MAJOR is any removal or incompatible change to the capability matrix, configuration keys and defaults, diagnostic-code identity, supported runtime/platform floor, or Strudel language interpretation. Deprecated contract elements must remain functional through at least one MINOR before removal in a MAJOR. Phase 26 records the final frozen matrix and any deviations from this charter.

Rationale: the current implementation already has substantial evidence, but a stability claim requires an explicit boundary rather than a feature count. The focused diagnostics settings introduced in ADR-052 answer ADR-034's configuration question without exposing engine internals. Treating the existing keys and codes as stable-additive lets editors rely on them while preserving room for the feature-expanded phases. Classifying parser gaps, unresolved references and advisory performance as known limitations keeps `1.0.0` honest, and classifying compiler work, binary distribution and editor coupling as non-goals preserves the architecture in `AGENTS.md` and `docs/PROJECT_SPEC.md`.

Consequences:

- ADR-063 is the authoritative baseline for the v1 contract; Phase 26 freezes the published `0.5.0` baseline, while the final `v1.0.0` matrix remains pending the ADR-077 gate. This decision does not make `1.0.0` available for publication.
- ADR-034's configuration exception is resolved for the v1 route: diagnostics settings are stable-additive, while Strudel version selection remains deferred and is not advertised.
- `docs/LSP_FEATURES.md` classifies implemented capabilities, known limitations, additive candidates and standing non-goals; `docs/TESTING_STRATEGY.md` records the contract-test plan.
- Phases 20–24 must add or update contract tests when they change the advertised capability surface or configuration schema.
- No source behaviour, package version, tag, release or registry state changes are made by this decision.

## ADR-063 Phase 26 amendment — frozen `0.5.0` baseline

Status: accepted on 2026-11-27. The user explicitly selected “Freeze baseline only” when asked how to handle the unimplemented ADR-077 additions. This amendment freezes the capability and configuration surface published in `strudel-lsp-server@0.5.0`. It does not freeze the final `v1.0.0` matrix, implement the ADR-077 additions, authorize `1.0.0`, or change a tag, publication or registry state.

Problem: the initial charter deliberately predated Phases 20–24. Phases 20, 21 and 24 added semantic depth, a recovery AST, real-corpus benchmarks, incremental reuse and opt-in timing without changing advertised capabilities or diagnostic codes. Phases 23 and 25 added and published several editor capabilities. ADR-077 later added further v1 goals that are still unimplemented. The contract therefore needs a precise frozen baseline without pretending that planned additions are already stable.

Decision:

- **Frozen capability surface:** incremental text synchronisation; diagnostics through `textDocument/publishDiagnostics` with the seven stable codes from the initial charter; completion with the `.` trigger and `completionItem/resolve`; hover; signature help with `(` and `,` triggers, including pinned curated and inferred user signatures; definition and references, including explicit relative `.strudel` imports under the bounded workspace scan; document symbols; on-demand workspace symbols with client-gated `workspaceSymbol/resolve`; whole-document and range formatting; full-document semantic tokens with `range: false`, `full: true` and no delta support; rename with `prepareProvider`; folding ranges; selection ranges; opt-in inlay hints; call hierarchy; and code actions with exactly `quickfix`, `refactor.inline` and `refactor.extract`, with `resolveProvider: false`.
- **Frozen configuration surface:** the standard `strudelLsp` LSP section carries `diagnostics.enabled`, the existing `diagnostics.severity` map and `inlayHints.enabled`. Diagnostic defaults and suppression semantics remain unchanged; `inlayHints.enabled` defaults to `false`. Strudel version selection and internal engine settings remain unexposed. New optional keys may be additive under the ADR-063 SemVer rule, but removing or renaming a key or changing a default that alters behavior is breaking.
- **Frozen unsupported surface:** declaration, type definition, implementation, document highlight, document link, color, code lens, on-type formatting, linked editing, inline value and moniker providers remain unadvertised; pull diagnostics, semantic-token range and delta requests, persistent workspace indexing, file watching and TCP transport remain outside the contract. Negative capability assertions for these providers remain authoritative until an explicitly authorized implementation updates them.
- **Phase mapping:** Phases 20, 21 and 24 contributed implementation and evidence but no new advertised capability or diagnostic code. Phase 23 contributed the additional advertised providers and resolve behavior listed above, published in `0.5.0` under ADR-076. No Phase 24 timing recorder is exposed as a setting or production telemetry.
- **Amendment control:** the frozen baseline is closed to removal or incompatible change. The only pre-`1.0.0` additions currently contemplated are the ADR-077 goals; each must pass its feature, protocol, live-coding and negative-capability gate and then be recorded in an explicit re-freeze before inclusion in the final matrix. Any other v1 addition requires a new decision. Post-v1 additions follow the ADR-063 MINOR rule. No planned provider is advertised by this amendment.

Rationale: freezing the published baseline gives editors a reliable contract for the capabilities already released, while keeping ADR-077 honest as pending work. Treating semantic and performance work as internal preserves the distinction between implementation depth and public protocol surface. Requiring an explicit re-freeze prevents a roadmap entry or an isolated passing test from silently changing the v1 contract.

Consequences:

- Phase 26's baseline-freeze task is complete; the final capability-matrix freeze remains blocked until every ADR-077 goal is implemented and verified or explicitly deferred under ADR-077.
- `docs/LSP_FEATURES.md` and `docs/TESTING_STRATEGY.md` describe the published surface as frozen and the ADR-077 additions as pending amendments.
- Existing `initialize` and negative-capability tests continue to reflect the frozen baseline. Contract tests for the frozen matrix remain a separate Phase 26 task.
- No source behaviour, package version, tag, publication, release note or registry state is changed by this amendment.

## ADR-064 — Release readiness: package contents, support guidance and SBOM

Status: accepted on 2026-11-27 for Phase 17 of the proposed feature-expanded route. This decision records the npm file-selection policy, user support contract and SBOM/attestation decision. It does not authorize a version bump, tag, publication or registry mutation.

Problem: Phase 17 requires explicit decisions on the npm `files` allowlist and on SBOM or additional release attestation generation, plus user-facing guidance about the diagnostic and log details needed to investigate a report. The published `0.2.0` tarball and its release notes are immutable evidence and must not be rewritten to describe later work.

Decision:

- **Package contents:** retain `package.json` `files` as exactly `['dist/src', 'LICENSE']`. npm always includes `package.json` and `README.md`. The published artifact therefore contains compiled JavaScript, TypeScript declarations and generated source maps under `dist/src`, plus the licence, package manifest and README. It does not contain `CHANGELOG.md`, TypeScript sources, tests, scripts, benchmarks, prototype clients or grammar sources. Generated maps and declarations are part of the compiled `dist/src` outputs; excluding them would be a separate packaging change requiring its own release and verification update.
- **Verification:** the existing `scripts/verify-package.mjs`, `scripts/verify-release.mjs`, `test/packageScripts.test.ts` and release-workflow contract remain authoritative for this allowlist. Phase 17 adds documentation-contract tests that connect the recorded decision, the manifest and the verifiers, rather than changing the tarball contract.
- **Support guidance:** `README.md` contains a stable `Reporting problems` section. Reports must identify the package and Node/npm versions, platform and architecture, editor or client and launch command, a minimal reproduction, expected and actual behaviour, and the diagnostic code, message and range. Clients should supply the relevant LSP trace or server stderr captured by the client, not raw server stdout, which is the LSP protocol stream and may contain full document contents. All reports must redact credentials, private keys, internal URLs, private workspace paths and composition text the reporter does not want disclosed.
- **SBOM and attestations:** do not generate an SBOM or add a new release attestation tool in Phase 17. The committed lockfile records dependency identity for source builds, while published releases continue to use npm signatures and OIDC-generated SLSA provenance verified by `npm audit signatures` in the controlled workflow. No CycloneDX, SPDX or other SBOM dependency is introduced, and no separate artifact is attached to GitHub releases. Phase 26 reviews this decision before the v1 freeze; changing it requires an explicit ADR and dependency-approval request if a tool is needed.
- **Historical evidence:** the `0.2.0` release body in `.github/RELEASE_TEMPLATE.md`, its 138-file tarball evidence and its point-in-time test counts remain historical records. They are not reused as current `v0.3.0` or v1 evidence.

Rationale: the minimal allowlist already passed clean-install, consumer-install and publication verification, and changing it would invalidate the comparability of future tarballs with the published release for no demonstrated user need. Source maps and declarations are already emitted under `dist/src`, so the decision states the existing artifact precisely rather than implying a new inclusion. A README support section keeps guidance with the package and avoids adding an editor-specific template. Existing npm provenance and signatures provide supply-chain evidence without an unapproved dependency; deferring SBOM generation keeps the release process simple until a concrete consumer or compliance requirement exists.

Consequences:

- `package.json`, the package scripts and the compiled artifact are unchanged by Phase 17.
- Documentation-contract tests detect drift between ADR-064, the manifest, the verifiers, the README support section and the historical `0.2.0` release body.
- Support requests have a documented, privacy-preserving evidence checklist.
- No SBOM file, attestation tool, dependency, release asset, tag or registry change is introduced.
- Phase 26 must revisit the SBOM decision as part of the final v1 readiness review; ADR-080 records that review and keeps the decision unchanged for the candidate tree.

## ADR-065 — Parser, metadata and platform compatibility closure

Status: accepted on 2026-11-27 for Phase 18 of the proposed feature-expanded route. This decision closes the compatibility boundary for the pinned Strudel snapshot, parser and platform matrix. It does not authorize a dependency upgrade, package version bump, tag, publication or registry mutation.

Problem: Phase 18 must resolve or formally accept the two known upstream grammar gaps, distinguish the supported Strudel language snapshot from the older JSDoc reference package used to generate metadata, define dependency-update triggers, and confirm the supported runtime/platform boundary. ADR-063 defers the detailed update policy to this phase and records SemVer rules that later upgrades must respect.

Decision:

- **Supported Strudel snapshot:** the supported language snapshot is Strudel `1.2.6`, represented by `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`. `@strudel/reference@1.2.2` is the pinned generated JSDoc source for `576` committed catalog records; its version is metadata provenance, not an alternative or second supported Strudel language version. Per-workspace Strudel version selection remains unexposed.
- **Accepted upstream parser gaps:** the two gaps observed with `tree-sitter-strudel@2.0.2` are formally accepted for this pinned snapshot: `%` modulo in JavaScript expressions and `//` inside string literals such as sample URLs. Seven corpus examples expose them; semantic analysis still completes for all seven with in-bounds ranges. The grammar remains a versioned npm dependency and is not vendored, patched or replaced with a local workaround. A later parser upgrade may close either gap only after minimal-case checks, the separate parser suite, full corpus validation and a documented review of changed diagnostics.
- **Supported matrix:** Linux x64 with glibc, macOS arm64 and Windows x64, each on Node.js 24 and 26 with npm 11.x, remain the supported and CI-validated matrix. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds but remain best-effort until separately validated and accepted by a later ADR.
- **Dependency-update policy:** any dependency pin change requires an explicit ADR, evidence and a SemVer assessment under ADR-033 before `1.0.0` and ADR-063 from `1.0.0`.

  | Change                                    | Required validation before acceptance                                                                                                                                                    | SemVer treatment from `1.0.0`                                                                                                                                                         |
  | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Strudel core, mini, transpiler, reference | Regenerate metadata when the authoritative source changes; run the metadata, parser-independent semantic and mini-notation suites; rerun the full corpus and review the committed report | PATCH for non-semantic provenance corrections with identical generated facts; MINOR for compatible metadata or syntax additions; MAJOR for changed language interpretation or removal |
  | `tree-sitter-strudel` or `tree-sitter`    | Run the separate parser suite, full corpus validation and clean-install matrix; reassess the accepted gap set and semantic-engine results                                                | PATCH without observable syntax-tree or semantic changes; MINOR for compatible additive syntax; MAJOR for incompatible syntax-tree or semantic behaviour                              |
  | Node.js or npm                            | Update `engines`, lockfile and compatibility CI; run the full matrix, package and consumer verification and installed stdio checks                                                       | MINOR may add a supported runtime; MAJOR raises the floor, drops a runtime or drops a supported platform                                                                              |

- **Regeneration and rerun triggers:** metadata is regenerated deliberately only after an authoritative Strudel source pin changes; a package version bump alone never triggers a new language snapshot. Corpus validation must be rerun for parser, metadata, semantic-engine, mini-notation or corpus-source changes, and an unchanged report still requires deliberate regeneration plus review. Compatibility validation must be rerun for runtime, native-parser or dependency changes; the exact release candidate repeats the full gate under the future `v0.3.0` release decision.
- **Accepted corpus baseline:** the refreshed report remains byte-identical with 484 examples, 477 clean parses, seven accepted parser-gap examples and zero invariant failures. The 1,308 unresolved references are an accepted conservative baseline because runtime globals and sample names are outside the pinned metadata; they are not speculative diagnostics. Phase 20 may reduce that baseline with evidence and an explicit report update.

Rationale: the pinned parser gaps affect a small, identified set of authoritative examples and do not prevent semantic analysis, while vendoring or patching an AGPL parser would weaken reproducibility and the external-parser architecture. The older reference package supplies generated JSDoc facts and must not be presented as a different Strudel target. Explicit triggers keep metadata regeneration, corpus reruns and compatibility reruns deliberate, and the ADR-063 SemVer rules prevent deprecating the two upstream gaps into silent contract changes.

Consequences:

- Phase 18 is complete. No parser, metadata, dependency, source behaviour, package version, tag or registry state is changed by this decision.
- `validation/real-corpus.json` was regenerated from the final pins and remained byte-identical; its accepted gap set and unresolved-reference baseline are documented rather than hidden.
- Documentation now distinguishes the Strudel `1.2.6` language snapshot from the `@strudel/reference@1.2.2` JSDoc source.
- Future dependency changes follow the table above and require new evidence; a parser upgrade may narrow the accepted limitations but is not authorized here.
- No `v0.3.0` publication is authorized by Phase 18; Phase 19 still requires an exact publication ADR naming the version, tag and operator.

## ADR-066 — Phase 19 controlled publication authorization

Status: accepted on 2026-11-27. The user explicitly authorized publishing exactly `strudel-lsp-server@0.3.0`, tagging exactly `v0.3.0`, and using `pedrozappa` as the named release operator through the controlled OIDC workflow with `npm-release` approval. This authorization permits the version bump, versioned changelog, version-specific release notes, exact release-candidate validation and commit, an exact `v0.3.0` deployment branch policy for the `npm-release` environment, creation and push of the exact tag, workflow publication, provenance and post-publication smoke checks, and a GitHub release generated from the exact candidate. It does not permit a local publish, the ADR-049 bootstrap exception, deprecation, dist-tag changes, unpublishing, retagging or any other registry mutation.

Problem: Phase 19 cannot begin from the roadmap alone; it requires an exact authorization record that binds the package version, Git tag and operator. The published `v0.2.0` release body in `.github/RELEASE_TEMPLATE.md` is immutable historical evidence and cannot be reused or rewritten as `v0.3.0` release notes.

Decision: publish the exact validated candidate only through `.github/workflows/release.yml` with `npm-release` approval. ADR-049 applies only to `0.1.0`; `0.3.0` must not be published locally. The `0.3.0` changelog section and user-facing notes are generated from the exact candidate in `.github/RELEASE_NOTES_v0.3.0.md`, while `.github/RELEASE_TEMPLATE.md` remains the published `0.2.0` record. The exact candidate commit and publication evidence are recorded later in ADR-067 rather than asserted before validation.

Evidence: the authorization was given through direct questions that named the exact npm version `strudel-lsp-server@0.3.0`, the exact tag `v0.3.0`, the operator `pedrozappa`, and confirmation to publish through the controlled OIDC workflow. No npm credential, token, password, OTP, recovery code or private key was supplied, read or recorded. A read-only registry check before preparation returned `E404` for `0.3.0`, confirming that the candidate version was unpublished.

Consequences:

- `package.json` and `package-lock.json` declare `0.3.0`; dependencies, engines, published file allowlist, parser pin and metadata pins are unchanged.
- A deterministic contract test records the exact version, tag and operator authorization and verifies that the historical `0.2.0` release body remains unchanged.
- The exact candidate must pass the full local gate, corpus validation, package and consumer verification, dependency audits, benchmarks and client smoke runs before the tag is created.
- The exact `v0.3.0` tag is created only after that gate and must point to the validated candidate commit; exact-tag CI must pass before workflow publication.
- Published `0.2.0` and `0.1.0` remain unchanged. No registry mutation other than the controlled `0.3.0` publish is authorized.

## ADR-067 — Phase 19 publication and smoke evidence

Status: accepted on 2026-11-27. This decision records the completed `strudel-lsp-server@0.3.0` publication from tag `v0.3.0` by operator `pedrozappa`, its verification evidence and the transient workflow-verification limitation. It does not authorize another publication or registry mutation.

Problem: ADR-066 authorized the exact release but required evidence to be recorded after the immutable candidate, tag and workflow run existed. A controlled publish that succeeds while its final verification step races registry propagation must not be mistaken for a failed publish or used to justify republishing.

Decision: treat `strudel-lsp-server@0.3.0` as published only after exact-tag validation and trusted publish completed, and after registry identity, tarball integrity, signatures, SLSA provenance and installed-package behaviour were independently verified from the published artifact. Record the final workflow-step `ETARGET` as a visibility race, not a reason to repeat the immutable publish.

Evidence:

- Release identity: at publication, `HEAD`, `refs/tags/v0.3.0^{commit}` and remote `refs/heads/main` resolved to `b3451e283986b576b526534136026adba0bf5217`; the tracked worktree was clean before tag creation. Remote `refs/tags/v0.3.0` pointed to annotated tag object `787fccb333e5c03bd6615f17167c252db440d5d9`, which peels to that commit. The exact `npm-release` tag policy was created with id `68542906`.
- Controlled workflow: run `46049593155` validation job `140677309030` passed. Publish job `140677717483` ran `npm publish --access public` with OIDC under the gated `npm-release` environment and logged `+ strudel-lsp-server@0.3.0`; no local publish occurred. The final `Verify published signatures and attestations` step failed with `ETARGET` because npm had not yet propagated the new version; the version became visible after roughly two to three minutes. No republish was attempted.
- Registry and tarball: `npm view strudel-lsp-server@0.3.0 --json` matched the release manifest, licence and `gitHead` `b3451e283986b576b526534136026adba0bf5217`; `dist-tags.latest` was `0.3.0` with no deprecation, `fileCount` was 138, `dist.shasum` was `8ad0ac52f1443648c38b372532d0f2d5306e72d7`, and `dist.integrity` was `sha512-qS3nmxxIKdJHGrSfqaiiL16epy9GYSamdqizZ9Bpb+Yu1EtRAqV/su3lm3tt4JHId9WtjJfTfcGJ2Rf0YbFCQQ==`. An independently downloaded tarball reproduced both digests. `RELEASE_TAG=v0.3.0 RELEASE_OPERATOR=pedrozappa npm run verify:release` passed on the immutable commit using the publication-state-aware registry comparison instead of a second publish dry-run.
- Signatures and provenance: fresh-registry `npm audit signatures --json --include-attestations` reported `invalid: []` and `missing: []`. The registry attestation endpoint returned two attestations, including SLSA v1; its subject digest matched the published integrity, and its workflow ref `refs/tags/v0.3.0`, repository, `.github/workflows/release.yml` path and resolved commit matched the release run.
- Smoke checks: isolated fresh-cache local and global installs produced the expected `0.3.0` manifests, executable mapping and AGPL notice. The documented PATH command completed an `initialize`/`initialized`/`shutdown`/`exit` handshake, and `npm ls --global` listed `strudel-lsp-server@0.3.0`. Environment was darwin-arm64 with Node `v26.8.2`, npm `11.19.1`, registry `https://registry.npmjs.org/`, `legacy-peer-deps=false` and empty `omit`; no secrets were recorded.
- Release record: GitHub release `v0.3.0` was published from the exact tag with no assets at <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.3.0>. Its 9,646-character body matched `.github/RELEASE_NOTES_v0.3.0.md` exactly; `.github/RELEASE_TEMPLATE.md` remains the immutable published `0.2.0` body.

Consequences:

- `0.3.0` is the latest published release; `0.2.0` and `0.1.0` remain available.
- Phase 19 is complete. Post-publication documentation reconciles the prepared-candidate wording with the published state and records the immutable tarball limitation and workflow-verification race rather than hiding them.
- The immutable `0.3.0` tarball contains the candidate README that names `0.2.0` as latest; the repository README is corrected after publication. Changing the package README requires a separately authorized new release.
- The workflow's final visibility-race failure does not invalidate the independently verified published artifact and is not authorization to rerun the publish. A later defect must be fixed in a new version through the same controlled workflow.
- No local publish, republish, manual dist-tag change, deprecation, unpublish, retag, credential handling or other registry mutation occurred.

## ADR-068 — Conservative semantic depth and additive signatures

Status: accepted on 2026-11-27 for Phase 20. This decision adds evidence-backed semantic resolution and additive signature data to the parser-independent engine. No package version bump, tag, publication, dependency change or registry mutation is authorized; Phase 22 still requires an exact publication ADR.

Problem: Phase 20 must reduce conservative unresolved references without guessing, infer common parameter types only from reliable syntax evidence, model richer callable signatures and record deliberate corpus drift. The semantic engine must remain independent of Tree-sitter APIs and live-coding fixtures must not gain speculative diagnostics.

Decision:

- **Unambiguous generated aliases:** generated synonym strings are indexed as global or Pattern-method alias records only when one generated record owns the alias and no conflicting record uses that name in the target namespace. An alias preserves the target's description, examples, parameters, mini-notation argument positions and curated signatures, and records `aliasOf`. Ambiguous synonyms (`delayt`, `dt`, `ir`) and aliases outside the global/Pattern-method boundary are skipped. The database `catalogVersion` now hashes generated identity, scope, `memberOf` and synonyms together with manual and runtime inputs so future alias drift requires deliberate review.
- **Sample names:** a string literal creates a sample symbol and reference only when it is an identifier-like, plain double-quoted value in a catalog-declared mini-notation argument and `SemanticCatalog.getSample` returns an explicit catalog entry. The reference range covers the unquoted name. No sample is inferred from JSDoc examples, mini-notation steps or completion labels, and the default catalog contains no sample records.
- **Usage-based parameter inference:** a parameter declared in a function or parenthesized arrow formal parameter list is inferred as `Pattern` only when the body uses it as the receiver of a known Pattern method that is not ambiguous with a common JavaScript method, nested function bodies are excluded and every collected observation agrees. Generic JS method names such as `slice` and `every`, unknown methods and mixed evidence are treated as counter-evidence so the parameter remains `Unknown`. Parameter declaration ranges always cover the identifier, including default and rest parameters, so rename and definition stay accurate. This is a bounded inference, not a JavaScript type checker.
- **Additive signatures:** `SemanticSignature` carries a label, optional documentation, parameter labels with `optional`/`rest` markers and a `catalog` or `user` source. Curated signatures with pinned Strudel source evidence are added for `s`, `cat`, `stack` and `Pattern.euclid`; generated JSDoc parameter lists remain the fallback. The curated `s` signature has one user-facing `sound` argument because `n` and `gain` are control names, and `euclid` has two user-facing arguments because its registered `pat` parameter is the injected method receiver. Equivalent signatures compare structurally rather than by object identity. User functions and arrow functions expose signatures derived from formal parameters and inferred parameter types. `SignatureHelpResult` exposes multiple signatures and an `activeSignature`, and the LSP layer maps them without editor-specific behaviour.
- **Signature-help hardening:** alias calls present the alias name in signature labels; catalog fallback is suppressed when a resolved binding is not a catalog symbol; rest signatures clamp `activeParameter` to a declared parameter index for LSP conformance; curated signatures inherit generated signature and parameter documentation when they do not supply their own; and empty curated signature arrays fall back to generated parameters. User rest parameters are read conservatively from the pinned grammar's `error`-node shape. Definition and rename ranges always use identifier nodes for default and rest parameters rather than the full initializer.
- **Deliberate corpus evidence:** the accepted report changed from catalog hash `b8eed909` to `0243e023`, symbols from 697 to 726, unresolved references from 1,308 to 1,277 and mini-notation arguments from 347 to 364. Parse, invariant, parser-gap and incremental counts are unchanged. The Phase 20 baseline of 1,277 unresolved references is documented rather than hidden.

Evidence: pinned generated metadata contained 172 distinct synonym strings, of which three were ambiguous; unambiguous aliases resolved 31 previously unresolved call-style references and exposed 17 additional mini-notation argument contexts. A one-off aggregate analysis of the 1,277 remaining references classified 913 method-style uses of catalog globals that are not registered Pattern methods, 252 other method uses outside the Pattern catalog, 100 unknown values and 12 unknown calls. Those categories remain unresolved rather than reported as diagnostics. Pinned Strudel source also corrected two curated arities that had mistaken internal registration parameters for user-facing arguments. The full gate passed 103/103 tests with focused semantic, metadata and feature suites of 11/6/33 tests, including regression coverage for shadowed builtins, ambiguous receiver inference, alias labels, rest active-parameter clamping, generated-documentation preservation, empty-signature fallback, user rest parameters and default-parameter rename ranges. `npm run validate:corpus` passed only after the report was deliberately regenerated and its diff reviewed. The complete gate and package evidence are recorded in `docs/TESTING_STRATEGY.md`.

Rationale: generated synonyms are authoritative when unique, while sample names and Pattern-method registrations are not present in the pinned metadata and must not be guessed. Receiver usage gives a narrow, explainable signal for common Strudel parameters without rebuilding JavaScript semantics. An additive signature model preserves the generated fallback, allows evidence-backed curation and makes overload selection possible without changing LSP capabilities.

Consequences:

- Completion, hover and reference resolution now see unambiguous aliases; ambiguous and out-of-scope synonyms stay unresolved.
- Sample-name resolution is a metadata-driven mechanism with negative-coverage tests, not a claim that the default catalog knows every sample.
- Signature help can present curated signatures, overload-capable multi-signature results and inferred user signatures; selection is arity-based rather than type-based, shadowed builtins no longer receive catalog fallback, and unknown callables still produce no signature help.
- Bare identifier arrow parameters remain outside the modeled formal-parameter shapes and are documented as a limitation rather than inferred speculatively.
- `validation/real-corpus.json`, compatibility documentation and contract tests record the new baseline; the historical Phase 18 baseline remains point-in-time evidence in ADR-065 and the immutable `0.3.0` release notes.
- No diagnostic code, LSP capability, dependency, package version, tag or registry state changes.

## ADR-069 — Additive mini-notation recovery AST

Status: accepted on 2026-11-27 for Phase 21. This decision adds a Strudel-owned structural view over the existing mini-notation lexer. No package version bump, tag, publication, dependency change or registry mutation is authorized; Phase 22 still requires an exact publication ADR.

Problem: the published lexical submodel reports only token boundaries and four structural faults. It cannot answer group-nesting, operator-target or recovery-state questions, but replacing it with a full Strudel compiler would violate the project boundary and turn incomplete live-coding input into cascading errors. Phase 21 must improve structure and recovery while preserving conservative diagnostics, incremental reuse and offline operation.

Decision:

- **Strudel-owned AST:** `src/miniNotation/ast.ts` builds a `MiniNotationAst` from the pinned lexical tokens. It is fed by `analyzeMiniNotation`, exposed additively as `MiniNotationAnalysis.ast`, and imports neither Tree-sitter nor `@strudel/mini` runtime/parser code. Node kinds are `sequence`, `subsequence`, `alternation`, `polymeter`, `euclid`, `step`, `rest`, `number`, `operator`, `unknown` and `error`; groups own their nested children, operator nodes retain the pinned lexical category and the range of the preceding node in the same group, and `empty`/`incomplete` flags describe recovery state.
- **Absolute ranges and reuse:** every node and operator target range is an absolute document range. `cloneStatementAnalysis` shifts AST ranges with tokens and issues during unchanged-statement reuse, so prepending, inserting and removing text before a mini argument preserves structure without reanalysis. Semantic AST tests read only the Strudel-owned contracts and never use Tree-sitter APIs.
- **Recovery without new diagnostics:** mismatched or unmatched closers become `error` nodes carrying the existing `mismatched-close` or `unmatched-close` code and the already-computed expected closer. Unclosed groups and trailing separators or operand-taking operators are marked `incomplete`; unsupported characters remain `unknown`. No new diagnostic code is introduced, and incomplete or unsupported mid-edit states still produce no diagnostic.
- **Conservative feature extension:** hover selects the smallest AST node or lexical token at the cursor, so operators get authoritative descriptions and delimiters report the exact delimiter text. Completion offers only pinned mini-notation operators when the cursor is on an operator token and replaces that exact range; it does not extend JavaScript identifier completion into strings. Signature help is deliberately unchanged: the pinned mini grammar has no call-signature construct, and the existing host-call signature continues to work inside a mini argument. No sample, pitch, velocity or random-outcome semantics are inferred.
- **Deliberate corpus evidence:** `scripts/validate-corpus.mjs` counts and range-checks AST nodes and operator target ranges. The regenerated report records 2,034 AST nodes across the same 364 mini-notation arguments, with unchanged catalog hash, parse counts, parser gaps and zero invariant failures. Incremental validation requires the AST-node count to be preserved after an appended-newline edit.

Evidence: `@strudel/mini@1.2.6` `krill.pegjs` defines the grouped, operator and Euclidean constructs modelled here, while `@strudel/core@1.2.6` JSDoc supplies the fast/slow, control-parameter and Euclidean descriptions. The AST suite covers nested structure, mismatched-closer recovery without cascading issues, unclosed/empty groups and operator coverage without pitch or sample claims. Feature regressions cover structured hover, exact mini-operator completion, unchanged host signature help and repeated incremental edits. `npm run validate:corpus` passed only after the report was deliberately regenerated and its single added count reviewed.

Rationale: a token-fed structural layer gives editor features and future semantics a stable seam without duplicating the grammar, bundling the mini parser or forcing valid syntax during live coding. Keeping diagnostics and capabilities unchanged makes the improvement additive and compatible with the published v1 charter.

Consequences:

- The mini-notation contract is a recovery-oriented syntax tree, not a claim of full 1.2.6 mini-notation compilation or pattern evaluation.
- Note pitch, sample identity, velocity, shuffle, random outcomes and the experimental haskellish statement layer remain outside this model and are recorded as limitations.
- Template literals and nested substitutions remain outside the lexical attachment seam; only plain double-quoted mini arguments receive an AST.
- Diagnostics configuration, quick fixes, semantic tokens and the LSP capability matrix are unchanged.
- `validation/real-corpus.json`, compatibility documentation and contract tests record the new coverage. The compiled AST module adds three files under the existing `dist/src/miniNotation/` allowlist, raising the verified tarball from 138 to 141 files; no dependency, runtime data file or publication state changes.

## ADR-070 — Bounded registry visibility wait after publish

Status: accepted on 2026-11-27 after diagnosing workflow run `46049593155`. This decision hardens `.github/workflows/release.yml` for future controlled releases. It does not alter the published `0.3.0` artifact, tag, registry state or release notes, and it does not authorize another publication.

Problem: npm reported `+ strudel-lsp-server@0.3.0` and warned that the package was being processed and might take a few minutes to become available, but the same job immediately ran `npm install strudel-lsp-server@0.3.0` and failed with `ETARGET`. The version became visible a few minutes later and independent smoke checks passed. A controlled publish must not be misreported as failed merely because post-publish verification starts before registry propagation.

Decision: after `npm publish`, the workflow polls `npm view strudel-lsp-server@<version> version --prefer-online` up to 12 times at 15-second intervals before the installed-package smoke check. The poll is bounded and fails with an explicit message if the version never becomes visible, so a genuine publication or registry problem still fails the job. The subsequent `npm install` uses `--prefer-online` so it consumes freshly revalidated registry metadata rather than a stale cached package record. No credentials, dependency, package content or registry mutation is introduced.

Rationale: npm's publish response explicitly warns that availability can lag. Waiting until the exact version is readable from the public registry is the narrowest reliable precondition for the install-based signature and attestation audit. A bounded retry preserves failure signalling for real errors while eliminating the transient race that made the `0.3.0` publish job red after a successful publish.

Consequences:

- The `0.3.0` publication remains valid and unchanged; ADR-067 continues to record its historical transient failure and independent verification.
- Future controlled releases, including Phase 22, use the hardened workflow from the tag being published; a rerun of an older tag still uses its historical workflow file.
- Contract tests assert that the visibility wait precedes installation, uses fresh metadata and is bounded.
- No version bump, tag, publish, deprecation, dist-tag change, unpublish or retag is authorized by this decision.

## ADR-071 — Phase 22 controlled publication authorization

Status: accepted on 2026-11-27. The user explicitly authorized publishing exactly `strudel-lsp-server@0.4.0`, tagging exactly `v0.4.0`, and using `pedrozappa` as the named release operator through the controlled OIDC workflow with `npm-release` approval. This authorization permits the version bump, versioned changelog, version-specific release notes, exact candidate gate, commit, exact `v0.4.0` deployment tag policy, creation and push of the exact tag, workflow publication, post-publication smoke checks and a GitHub release generated from the exact candidate. It does not permit a local publish, the ADR-049 bootstrap exception, deprecation, dist-tag changes, unpublishing, retagging or any other registry mutation.

Problem: Phase 22 cannot be derived from the roadmap alone; it requires an exact authorization record binding package version, Git tag and operator. Phases 20 and 21 are complete but unreleased, and the published `0.3.0` release body is immutable evidence that cannot be reused as `0.4.0` notes.

Decision: publish the exact validated candidate only through `.github/workflows/release.yml` with `npm-release` approval. ADR-049 applies only to `0.1.0`; `0.4.0` must not be published locally. The `0.4.0` changelog section and user-facing notes are generated from the exact candidate in `.github/RELEASE_NOTES_v0.4.0.md`, while `.github/RELEASE_TEMPLATE.md` remains the published `0.2.0` record. The exact candidate commit and publication evidence are recorded later in a separate evidence ADR rather than asserted before validation.

Evidence: the authorization was given through a direct question naming exact npm version `strudel-lsp-server@0.4.0`, exact tag `v0.4.0`, operator `pedrozappa`, and controlled OIDC workflow publication with `npm-release` approval; the selected response explicitly confirmed `pedrozappa`. No npm credential, token, password, OTP, recovery code or private key was supplied, read or recorded. A read-only registry check before preparation returned `E404` for `0.4.0`, confirming that the candidate version was unpublished.

Consequences:

- `package.json` and `package-lock.json` declare `0.4.0`; dependencies, engines, published file allowlist, parser pin and metadata pins are unchanged.
- A deterministic contract test records the exact version, tag and operator authorization.
- The exact candidate must pass the full local gate, focused suites, corpus validation, package and consumer verification, dependency audits, benchmarks and client smoke runs before the tag is created.
- The exact `v0.4.0` tag is created only after that gate and must point to the validated candidate commit; exact-tag CI must pass before workflow publication.
- The hardened post-publish registry visibility wait from ADR-070 is part of the exact tagged workflow.
- Published `0.3.0`, `0.2.0` and `0.1.0` remain unchanged. No registry mutation other than the controlled `0.4.0` publish is authorized.

## ADR-072 — Phase 22 publication and smoke evidence

Status: accepted on 2026-11-27. This decision records the completed `strudel-lsp-server@0.4.0` publication from tag `v0.4.0` by operator `pedrozappa` and its verification evidence. It does not authorize another publication, registry mutation, tag change or GitHub release rewrite.

Problem: ADR-071 required evidence that the exact immutable candidate, exact tag, controlled workflow and post-publication artifact all matched before Phase 22 could be called complete. The `0.3.0` release had shown that a successful publish can be followed by a transient registry-visibility failure, so the workflow result alone was insufficient.

Decision: treat `0.4.0` as published only after exact-tag validation and trusted publish succeeded and registry identity, signatures, SLSA provenance, tarball identity, clean installs and installed stdio behaviour were independently verified. Record the visibility wait as successful evidence of ADR-070 rather than another failure to explain away.

Evidence:

- Release identity: before tag creation, `HEAD` was `1d39c14cba2152116ce1c2c5d5b827bf6af5c144`; annotated tag object `91fc4325d16874898504240f7b5f61f96ab3d08d` peeled to that commit. The exact `npm-release` tag policy was created with id `68553457`, deployment `8118730835` was approved by `PedroZappa` for ref `v0.4.0`, and the tracked worktree was clean.
- Candidate gate: `make ci`, focused suites, corpus validation, package and clean-consumer verification, runtime and client audits, benchmarks and the Neovim editor smoke passed on linux-x64 with Node `v26.13.1` and npm `11.20.0`; the candidate tarball matched the published file count and digests. Details and the VS Code environment limitation are in `docs/TESTING_STRATEGY.md`.
- Controlled workflow: run `46063508701` validation job `140723175749` and publish job `140723461085` both completed with success. The publish job ran `npm publish --access public` through OIDC under the gated `npm-release` environment. Its new visibility step reported `not visible yet` on attempts 1–7 and `strudel-lsp-server@0.4.0 visible (attempt 8)`, then the install and `npm audit signatures` verification completed; there was no `ETARGET` failure, republish or local publish.
- Registry and tarball: `npm view strudel-lsp-server@0.4.0 --json` matched the release manifest, licence, source URLs, engines, bin and `gitHead` `1d39c14cba2152116ce1c2c5d5b827bf6af5c144`; `dist-tags.latest` was `0.4.0`, no deprecation field was present, `fileCount` was 141, `dist.shasum` was `cf6a8eff2b4dc1c3cbbb110b1605d6c871229173`, and `dist.integrity` was `sha512-vneHfd0M/nl1QdEP3F6nra4+BMODFiz0kAtUs6m78uNiYDzaY9xIwFCzmQlD6F3dXV0CWUhvvCyhkhABIWvtfA==`. An independent registry tarball download reproduced both digests, and its README correctly named `0.4.0` as the latest version.
- Signatures and provenance: fresh-registry `npm audit signatures --json --include-attestations` on a clean isolated install reported `invalid: []` and `missing: []` and verified `strudel-lsp-server`. The attestation endpoint returned two attestations, including SLSA v1; the subject was `pkg:npm/strudel-lsp-server@0.4.0` with digest matching the published integrity, and the workflow record was `refs/tags/v0.4.0`, `PedroZappa/strudel-lsp-server` and `.github/workflows/release.yml`.
- Smoke checks: isolated fresh-cache local and global installs produced the expected `0.4.0` manifest, AGPL notice, bin mapping and engines. `npm ls --global` listed `strudel-lsp-server@0.4.0`, the documented PATH command resolved to the isolated global shim, and that shim completed an `initialize`/`initialized`/`shutdown`/`exit` JSON-RPC handshake with exit code 0. Environment was linux-x64 with Node `v26.13.1`, npm `11.20.0`, registry `https://registry.npmjs.org/`, `legacy-peer-deps=false` and empty `omit`; no token, password, OTP, recovery code or private key was read or recorded.
- Release record: GitHub release `v0.4.0` was published from the exact tag with no assets at <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.4.0>. Its 10,129-character body matched `.github/RELEASE_NOTES_v0.4.0.md` exactly; `.github/RELEASE_TEMPLATE.md` remains the immutable published `0.2.0` body.

Consequences:

- `0.4.0` is the latest published release; `0.3.0`, `0.2.0`, `0.1.0` and `0.0.0-stage` remain available and unchanged.
- Phase 22 is complete. The bounded visibility wait is proven by the live publish job, not only by the contract test.
- Semantic and mini-notation limitations remain documented as conservative boundaries rather than resolved claims.
- No local publish, republish, manual dist-tag change, deprecation, unpublish, retag, credential handling or other registry mutation occurred during the smoke run.

## ADR-073 — Phase 23 editor ergonomics and navigation contract

Status: accepted on 2026-11-27 for Phase 23. This decision defines the capability contract for folding ranges, selection ranges, opt-in inlay hints, completion resolution, range formatting, call hierarchy, `workspaceSymbol/resolve`, bounded cross-file navigation and conservative refactoring. It does not authorize a version bump, tag, publication or registry mutation; Phase 25 owns the `v0.5.0` release.

Problem: the stable `0.4.0` capability matrix deliberately left several high-value editor features unimplemented. Adding them ad hoc could expose editor-specific assumptions, rely on client-controlled file access, infer types from unresolved syntax, or advertise capabilities without passing feature, protocol and live-coding regressions.

Decision:

1. Keep all new providers transport-independent in `src/features`. The stdio layer only maps provider results to LSP types and validates incoming tokens.
2. Derive folding ranges, selection ranges and inlay hints from verified structural nodes and resolved semantic symbols. Inlay hints are disabled by default under `strudelLsp.inlayHints.enabled`; unknown types, unresolved references and malformed documents produce no hints.
3. Use opaque, versioned data tokens for `completionItem/resolve` and `workspaceSymbol/resolve`. Tokens are created only from the current pinned metadata snapshot or trusted bounded query results. Mismatched, stale or malformed tokens produce no enrichment. Workspace-symbol resolution only resolves a withheld exact `location.range` for clients that advertise `workspace.symbol.resolveSupport`; it performs no file access.
4. Keep cross-file navigation on demand. Definition and references consult explicit relative `.strudel` import specifiers and declarations that are both exported and present in contexts supplied by the existing bounded workspace scan. Absolute, remote, non-Strudel and unscanned paths are rejected. No persistent workspace index, file watcher or editor-specific dependency is introduced.
5. Build call hierarchy only from resolved calls between verified user function declarations. Catalog-only symbols and unresolved calls never invent edges.
6. Range formatting reuses full-document edits and returns only edits starting inside the requested lines. Conservative extract refactoring applies only to a literal at an exact inlineable syntax node with a chosen name that is unused in the document. No JavaScript or TypeScript compiler enters the server core.
7. Advertise only capabilities backed by passing provider, protocol and live-coding/lifecycle tests. Preserve explicit negative assertions for capabilities that remain unsupported.

Consequences:

- Phase 23 adds editor ergonomics without changing the published `0.4.0` artifact or any registry state.
- Clients that do not opt in to inlay hints keep the previous behaviour. Clients without partial workspace-symbol support keep complete ranges in the initial response.
- Cross-file results remain bounded by the workspace-root scan and cannot be broadened by client-supplied resolve data.
- The exact test counts, validation commands and any limitations are recorded after implementation in `docs/TESTING_STRATEGY.md`; this ADR does not pre-claim that evidence.

Implementation evidence: Phase 23 is complete and committed as `46b2cd7 feat(lsp): add editor ergonomics and navigation`, with a 140/140 test gate, focused provider/protocol/soak suites, corpus validation, package and consumer verification, clean audits, and all 18 benchmark workloads within the then-current baseline thresholds. `docs/TESTING_STRATEGY.md` records the exact commands, results and limitations. No version bump, tag, publication or registry mutation was performed; Phase 25 owns the `v0.5.0` release.

## ADR-074 — Phase 24 scale, responsiveness and threshold policy

Status: accepted on 2026-11-27 for Phase 24. This decision defines the real-corpus benchmark source, the incremental semantic identity model, the opt-in local timing boundary and the performance threshold policy. It does not authorize a version bump, tag, publication or registry mutation; Phase 25 owns the `v0.5.0` release.

Problem: synthetic fixtures alone do not represent real Strudel examples, and the Phase 18 baseline recorded full semantic rebuilds during incremental edits. Adding production telemetry or promoting hardware-specific latency numbers to blocking CI checks would create privacy, reproducibility and false-failure risks. Naively keying reused semantic statements on source text also makes global symbol IDs unstable when a declaration initializer changes, so references in unchanged statements can resolve to a removed symbol.

Decision:

1. Supplement synthetic fixtures with two deterministic workloads derived from the pinned development dependency `@strudel/reference@1.2.2`. The runner verifies the recorded tarball integrity, repository, `AGPL-3.0-or-later` licence and corpus hash before selecting every 20th clean example. Example text is read from the installed package rather than copied into this repository; the project's `AGPL-3.0-only` licence accepts the `or-later` grant.
2. Keep top-level semantic reuse statement-level. Global declaration IDs depend on declaration identity and order, not initializer text. A changed declaration is analysed in isolation before any reuse decision: unchanged statements are reused only when that declaration's inferred type and signature still match the previous document. Unchanged ranges share immutable statement analyses and shifted ranges receive explicit range updates. An inferred-type or signature change, multiple changed declarations, a declaration rename, insertion, removal, reorder or catalog-version change forces a conservative rebuild so reused statements cannot retain types derived from old declarations.
3. Add `src/performance/` as an opt-in `LocalTimingRecorder` boundary with a no-op default. Tests and benchmarks inject an in-memory recorder; the LSP server supplies none. No user-facing setting, environment variable, network call, stored log or production telemetry is introduced.
4. Keep performance thresholds advisory. The committed baseline is tied to one recorded linux-x64 environment; hosted CI uses different hardware and has no measured normalisation factor. `npm run benchmark:check` locally compares p50/p95/p99 against numeric warning targets, while CI continues to report layer and installed-binary results without blocking. Correctness remains gated by `npm run check` and `make ci`.
5. Record the 20-workload layer p50/p95/p99 baseline and the separate installed-binary JSON-RPC report with their methodology, provenance and environment. Do not treat advisory samples as editor-latency claims or convert a syntax-reparse bottleneck into an unsupported semantic speedup claim.

Alternatives considered:

- Copy Strudel examples into the repository: rejected because it creates redistribution and provenance obligations without improving reproducibility.
- Reuse unchanged statements after every declaration initializer edit: rejected because reused statements can retain types inferred from the old declaration. The isolated semantic comparison keeps reuse for type-preserving edits without that stale-type risk.
- Key global IDs on declaration text: rejected because it breaks reference resolution for unchanged statements after an initializer edit.
- Enable timing globally or read environment variables: rejected because production telemetry is out of scope and would affect editor sessions.
- Make CI latency a blocking gate: rejected because hardware variability would turn unrelated runner noise into a false correctness failure.

Consequences:

- Real example coverage is reproducible and offline after installation, while synthetic fixtures still cover malformed and partial live-coding input.
- Correct incremental reuse preserves resolved references and type-preserving declaration edits; conservative invalidation remains where declaration semantics or identity changed.
- Timing diagnosis does not change ordinary editor behaviour or the published package's user-facing configuration.
- Advisory CI results can reveal large regressions without claiming cross-hardware precision; local investigation uses the recorded environment and numeric targets.
- Exact commands, results, limitations and final measurements are recorded in `docs/TESTING_STRATEGY.md` and `docs/PERFORMANCE.md`; this ADR does not itself assert validation success.

Implementation evidence: Phase 24 is complete and committed as `0f30fe5 perf: add real corpus, reuse and timing` and pushed, with a 144/144 test gate, focused semantic and rapid-edit suites, a 20-workload layer baseline, an advisory installed-binary report, corpus validation, package and consumer verification and clean audits. `docs/TESTING_STRATEGY.md` records the exact commands and results. No version bump, tag, publication or registry mutation was performed; Phase 25 owns the `v0.5.0` release.

## ADR-075 — Phase 25 controlled publication authorization

Status: accepted on 2026-11-27. The user explicitly authorized: publish exactly `strudel-lsp-server@0.5.0`, tag exactly `v0.5.0`, and use `pedrozappa` as the named release operator through the controlled OIDC workflow with `npm-release` approval. This authorization permits the accepted ADR, exact candidate gate, commit of the authorization record, creation and push of the exact `v0.5.0` tag, workflow publication, post-publication smoke checks and a GitHub release generated from the exact candidate. It does not permit a local publish, the ADR-049 bootstrap exception, deprecation, dist-tag changes, unpublishing, retagging or any other registry mutation.

Problem: Phases 23 and 24 are committed and the `0.5.0` candidate is prepared, but the roadmap alone cannot authorize a controlled release. A release needs an exact validation gate, an exact tag, controlled OIDC publication with `npm-release` approval, and post-publication evidence. The `0.4.0` release body is immutable historical evidence and cannot be reused as `0.5.0` notes.

Decision: publish the exact validated candidate only through `.github/workflows/release.yml` with `npm-release` approval. ADR-049 applies only to `0.1.0`; `0.5.0` must not be published locally. The `0.5.0` changelog section and user-facing notes are generated from the exact candidate in `.github/RELEASE_NOTES_v0.5.0.md`, while `.github/RELEASE_TEMPLATE.md` remains the published `0.2.0` record. Exact candidate and publication evidence are recorded after validation, not asserted before it.

Evidence: the authorization was given through a direct question naming exact npm version `strudel-lsp-server@0.5.0`, exact tag `v0.5.0`, operator `pedrozappa`, and controlled OIDC workflow publication with `npm-release` approval; the selected response explicitly confirmed `pedrozappa`. No npm credential, token, password, OTP, recovery code or private key was supplied, read or recorded. A read-only registry check before preparation returned `E404` for `0.5.0`, confirming that the version was unpublished.

Consequences:

- `package.json` and `package-lock.json` declare `0.5.0`; dependencies, engines, the published file allowlist, parser pin and metadata pins are unchanged.
- A deterministic contract test records the exact version, tag and operator authorization.
- The exact candidate must pass the full local gate, focused suites, corpus validation, package and consumer verification, dependency audits, benchmarks and client smoke runs before the tag is created.
- The exact `v0.5.0` tag is created only after that gate and must point to the validated candidate commit; exact-tag CI must pass before workflow publication.
- Published `0.4.0`, `0.3.0`, `0.2.0` and `0.1.0` remain unchanged. No registry mutation other than the controlled `0.5.0` publish is authorized.

Implementation evidence is recorded after publication in a separate evidence ADR and in `docs/TESTING_STRATEGY.md`; this authorization ADR does not pre-claim that evidence.

## ADR-076 — Phase 25 `0.5.0` publication evidence

Status: accepted on 2026-11-27 as the final Phase 25 evidence record. It confirms that the `strudel-lsp-server@0.5.0` release authorized by ADR-075 was published from tag `v0.5.0` at commit `51f2aa511028a970a92c62e43efdabf141d0b0e9` by operator `pedrozappa`. This decision does not authorize another publication, registry mutation, tag change or GitHub release rewrite.

Candidate gate: the exact commit passed `npm run check` with 145/145 tests, `make ci`, the 6 parser, 13 semantic, 6 metadata, 6 configuration, 8 LSP, 51 feature, 9 mini-notation, 11 protocol and 1 soak suites, corpus validation over 484 examples with zero invariant failures, package and consumer verification, zero-vulnerability audits, the local Neovim smoke and all 20 advisory layer benchmarks. `RELEASE_VERSION=0.5.0 RELEASE_OPERATOR=pedrozappa npm run verify:release` passed pack/publish parity and reported no published package before tagging. The advisory installed-binary rerun reported 0.433/0.716/0.959 ms p50/p95/p99 over 100 samples; this is local evidence and not an editor-latency claim.

Controlled workflow: the exact `v0.5.0` tag was created locally, verified to resolve to the release commit and pushed. The first publish attempt in run `46074959599` was blocked because the `npm-release` environment had no exact `v0.5.0` tag policy. The exact policy was added without changing the existing reviewer or `can_admins_bypass: false`, and the failed publish job was rerun. Validation job `140760948012` and publish job `140760945648` then completed successfully. The publish job ran `npm publish --access public` with OIDC, logged `+ strudel-lsp-server@0.5.0`, reported `not visible yet` on attempts 1–6 and `visible (attempt 7)`, and passed its clean install and signature audit. The full run completed at 2026-11-27T22:14:28Z. No local publish, bootstrap credential, republish or ordinary-commit publish was used.

Registry identity: public metadata reported version `0.5.0`, licence `AGPL-3.0-only`, maintainer `pedrozappa`, `gitHead` `51f2aa511028a970a92c62e43efdabf141d0b0e9`, `dist-tags.latest` `0.5.0`, 165 files and publish time `2026-11-27T22:14:09.535Z`. `RELEASE_TAG=v0.5.0 RELEASE_OPERATOR=pedrozappa npm run verify:release` passed after publication: the locally packed artifact matched the immutable registry shasum `0ba52519d57315001e6bc723638f9f7eeba6b7db`, integrity `sha512-mxqJ4jM2P6uB0D3k/AwblQcKiXEj2zf3Ci/lW+c7Faz5vRiAxsX96EjiTakqyqzpGOMmrW9qn1bfSskUndS3yQ==`, file count, name, version, licence and commit. No package was published by the verifier.

Signatures and provenance: a clean isolated install used a blank npm userconfig, isolated cache, `--ignore-scripts` and the public registry. `npm audit signatures --json --include-attestations` reported `invalid: []` and `missing: []` and verified `strudel-lsp-server@0.5.0`. The registry attestation endpoint returned two attestations, including SLSA v1. The SLSA subject was `pkg:npm/strudel-lsp-server@0.5.0` with sha512 digest matching the published integrity; the workflow record was `refs/tags/v0.5.0`, `https://github.com/PedroZappa/strudel-lsp-server`, `.github/workflows/release.yml`, resolved commit `51f2aa511028a970a92c62e43efdabf141d0b0e9` and invocation `46074959599` attempt 2. Provenance was verified, not assumed.

Installed behaviour: the published executable completed initialize, initialized, didOpen, documentSymbol, shutdown and exit over stdio, advertised the expected provider set, exposed the declared pattern and exited with code 0. The GitHub release `v0.5.0` was published from the exact tag with no assets and a 9,005-character body matching `.github/RELEASE_NOTES_v0.5.0.md` exactly at <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.5.0>. VS Code was unavailable on this linux-x64 runner, so its historical `1.148.0` evidence remains authoritative. No deprecation, dist-tag change, unpublish, retag or other registry mutation was performed.

Consequences: Phase 25 is complete. The `0.5.0` artifact is immutable, the README, changelog and capability matrix identify it as the latest published release, and Phases 26–29 remain proposed and subject to phase-specific approval; ADR-077 records the expanded v1 and post-v1 roadmap. Per ADR-062, published-version verification was run from the exact release commit; the later evidence commit updates repository documentation, including README wording, but does not modify or replace the registry artifact. Any future published-version verification must use the immutable `v0.5.0` tag rather than the later documentation commit.

## ADR-077 — v1 scope amendment and post-v1 roadmap

Status: accepted on 2026-11-27 as roadmap planning only. It authorizes the documentation changes that record the approved v1 scope amendment and the post-v1 route. It does not authorize source implementation, a version bump, a tag, a publication, a registry mutation or a GitHub release. Each phase and any release still require separate explicit authorization.

Problem: ADR-063 established the initial v1 charter before Phases 20–25. `0.5.0` is published with the Phase 23 and 24 work, but Phase 26 has not yet frozen the final capability matrix. The post-`0.5.0` review identified a small set of high-frequency live-coding improvements with low architectural risk, together with ideas that need stronger evidence or belong after v1. Without an explicit decision, planned additions could be mistaken for already-stable `0.5.0` capabilities, and deferred research could be mistaken for standing non-goals.

Decision: amend the proposed v1 route with four additional goals and record all remaining suggestions as post-v1 candidates or explicit non-goals. Every v1 addition remains unimplemented and unadvertised until its phase passes the full gate.

V1 additions for Phase 26:

1. Context-aware mini-notation step completion and hover. For `s` and `sound`, derive candidates first from literal object keys in source-local `samples({...})` calls; add versioned catalog candidates only when metadata is authoritative and pinned. For `note`, add note-name candidates only where pinned metadata supports that context. Operator completion remains unchanged where no step context exists. No unknown-sample diagnostic is added in v1.
2. Relative `.strudel` import-path completion using the existing bounded workspace scan and its symlink, traversal, size, depth and unreadable-file guards. No file watcher or persistent workspace index is introduced.
3. Deprecation metadata surfaced in completion and hover from the pinned generated snapshot. No new diagnostic code is added solely for deprecation in v1.
4. `textDocument/documentHighlight` as a conditional v1 goal. It may enter the frozen matrix only if it passes the same feature, protocol, live-coding and negative-capability gate as the other additions. If it does not, the deferral to Phase 28 must be recorded explicitly in this ADR; it must not be silently dropped or advertised without evidence.

Post-v1 roadmap:

- Phase 28 covers `$:` active-pattern semantics, evidence-gated unknown-sample diagnostics, richer note/scale context completion and editor-agnostic eval/hush command research. Runtime playback state is not claimed without authoritative evidence, and code lens is not advertised until a command contract is accepted.
- Phase 29 covers pull diagnostics and diagnostic tags, semantic-token range and delta requests, bounded numeric constant folding research and a review of the remaining deferred providers. Any implemented change must be additive under the ADR-063 SemVer rules and backed by p50/p95/p99 evidence where protocol traffic changes.
- The post-v1 candidate backlog in `docs/ROADMAP.md` records every other suggestion from the roundup and the language-specification open questions. Standing non-goals are not scheduled candidates unless explicitly reopened by a later ADR.

Rationale: live coding spends most editing time inside pattern strings, so sample- and note-aware completion has more practical value than another generic provider. Local `samples({...})` keys are deterministic and authoritative from the source itself, while a global unknown-sample diagnostic would be unsafe until a complete versioned catalog exists. Import-path completion reuses the already-tested workspace boundary. Deprecation data is already generated from pinned metadata but was not surfaced. Document highlight is cheap but still must earn advertisement through tests. Active-pattern runtime semantics, eval/hush commands and full protocol optimisation need more evidence or client contracts and should not complicate the v1 freeze.

Consequences:

- `docs/ROADMAP.md` gains Phase 26 test tasks, Phase 28, Phase 29 and a post-v1 candidate backlog; `docs/LSP_FEATURES.md` marks the additions as planned rather than implemented; `docs/TESTING_STRATEGY.md` records the evidence required before advertisement.
- Phase 26 froze the published `0.5.0` baseline in ADR-063. Its closed capability list is amended only by the ADR-077 additions that actually pass their gate and are recorded in an explicit re-freeze. No `0.5.0` capability or diagnostic code is removed or renamed.
- Post-v1 implementations are MINOR candidates under ADR-063. Removing or changing a v1 contract element after freeze remains breaking.
- No new provider is advertised by this ADR. Current `initialize` capabilities and negative capability assertions remain unchanged until implementation is separately authorized and verified.
- No source behaviour, package version, tag, publication or registry state is changed by this decision.

Phase 26 implementation note: the user then explicitly authorized the next roadmap item. Context-aware step completion and hover were implemented in the working tree with source-local literal `samples({...})` keys first, pinned runtime catalog samples second and note names only from the pinned `note` metadata. Feature, live-coding, stdio protocol and negative-metadata evidence passed at 150/150 tests. The user then authorized the next roadmap item. Relative `.strudel` import-path completion was implemented as a pure feature-layer candidate step fed by transport-supplied URIs from the existing bounded on-demand workspace scan. The transport scans only when the cursor is inside an import string, retains no watcher or index, and rejects absolute, bare, URI-scheme, quoted, traversal and unsafe prefixes. Feature, guarded-filesystem, live-coding, stdio protocol and unchanged negative-capability evidence passed at 156/156 tests. The user then authorized the next roadmap item. Pinned deprecation metadata was propagated from the generated snapshot into language records and surfaced as the standard completion/resolve deprecated flag plus a Markdown note in completion, resolve and hover documentation. Feature, metadata, live-coding, stdio protocol and unchanged capability/diagnostic-code evidence passed at 160/160 tests; no generated metadata, schema hash, capability or diagnostic code was changed. The user then authorized the next roadmap item. Conditional `documentHighlight` was implemented in the transport-independent navigation layer and served by the stdio handler, using resolved declarations, reads and assignment writes with exact ranges. Feature, live-coding, unresolved-name, repeated-builtin and stdio protocol evidence passed at 163/163 tests. No Phase 28 deferral is needed because the gate passed, but the provider remains deliberately unadvertised and the negative capability assertion stays authoritative until an explicit re-freeze. The user then authorized the next roadmap item. A consolidated stdio contract test exercises all four additions in one bounded workspace document containing an incomplete live chain. It verifies import-path completion, step completion/hover, deprecation completion/resolve/hover and document highlights while preserving the frozen completion triggers, known diagnostic-code set and absent document-highlight, code-lens, inline-value and pull-diagnostic providers. The full working-tree gate is 164/164; no provider is advertised. These notes record implementation and test evidence only; no final `v1.0.0` capability matrix is re-frozen and no provider or trigger character is advertised beyond the existing completed capabilities. The user then authorized the next roadmap item. A dedicated frozen-baseline contract suite in `test/lsp/frozenBaselineContract.test.ts` compares the whole `initialize` result with the published `0.5.0` matrix, rejects twelve deliberately unsupported providers, fixes the documented configuration keys and value vocabulary, and freezes the seven diagnostic codes and five severities independently of the source constants. Unknown settings, invalid severities and the unapproved `unknown-sample` code cannot enter the contract. The full working-tree gate is 167/167; no provider, configuration key, diagnostic code, version, tag or registry state is changed. The user then authorized the next roadmap item. `.github/workflows/release.yml` was aligned with the full `.github/workflows/ci.yml` gate: configuration and LSP layer suites, soak, package-content and clean-consumer checks, prototype-client and full-dependency audits, and both advisory benchmark harnesses now run before publication. Benchmark and full-audit steps remain advisory under ADR-074 and CI policy; correctness and blocking audits remain release gates, and the validation timeout was raised to 45 minutes. The publish trigger, approval environment, tag condition, OIDC permissions and registry actions are unchanged. The full working-tree gate is 168/168.

## ADR-078 — Compatibility matrix consumer verification scope

Status: accepted on 2026-11-28 for Phase 26. It decides where clean-consumer verification belongs in CI. It does not authorize a workflow change, new dependency, version bump, tag, publication, registry mutation or GitHub release.

Problem: `.github/workflows/compatibility.yml` verifies the six supported OS/Node pairs with `npm run verify:package`, which covers both install-script modes, parser prebuild loading and the installed stdio handshake. `.github/workflows/ci.yml` separately runs `npm run verify:consumer` on Ubuntu with Node 24 and 26, using empty npm configuration, a fresh cache and `legacy-peer-deps=false`. Phase 26 asks whether every compatibility pair must also run `verify:consumer`. ADR-065's Node/npm update trigger mentions the full matrix plus package and consumer verification, which can be read as requiring both checks in each matrix job, while ADR-036 defines the matrix job as `verify:package` only. Adding `verify:consumer` everywhere would repeat the package-install matrix and lengthen every platform job, but removing it from the correctness and release gates would lose the npm-configuration isolation check.

Decision:

- **Keep `.github/workflows/compatibility.yml` unchanged.** The six-job matrix remains Linux x64, macOS arm64 and Windows x64 on Node 24 and 26, with `npm run build` and `npm run verify:package` per job. It does not add `verify:consumer`.
- **Keep `verify:consumer` as a required correctness and release gate.** It remains in `.github/workflows/ci.yml` for Node 24 and 26, in the controlled release validation job and in local `make ci`/`make verify-all`. It is not advisory.
- **Run `npm run verify:consumer` locally on every final release candidate** in addition to the CI and release-workflow runs.
- Revisit this decision only with observed platform-specific npm configuration or peer-resolution behaviour that `verify:package` does not cover. Any matrix expansion requires a new ADR before workflow changes.

Clarification: ADR-065's reference to the full matrix, package and consumer verification means the combined validation set required for a runtime change. It does not require `verify:consumer` inside each compatibility job.

Evidence: the compatibility workflow contains `os: ['ubuntu-latest', 'macos-15', 'windows-latest']`, `node-version: ['24', '26']` and `npm run verify:package`; the historical six-job run `45990023185` passed both install modes, native prebuild loading and installed handshakes on every pair. The CI correctness matrix contains the dedicated `verify:consumer` step, and the Phase 26 release-workflow alignment added the same verification before publication. Local `verify:consumer` evidence for the published `0.5.0` candidate is recorded in `docs/TESTING_STRATEGY.md`.

Rationale: npm configuration isolation and `legacy-peer-deps=false` are package-consumer concerns that are independent of the OS/Node pair. Cross-platform coverage is already provided by `verify:package`; duplicating the consumer check six times would add CI cost without a distinct signal. Keeping one required consumer check in each correctness Node major, in release validation and on the exact local candidate preserves the stronger guarantee at lower cost.

Consequences:

- The compatibility matrix scope and the `verify:consumer` CI matrix remain unchanged.
- No workflow, provider, capability, diagnostic code, generated metadata, dependency, version, tag, publication or registry state is changed by this decision.
- `test/compatibilityPolicy.test.ts` pins the two workflow scopes and this ADR so a later workflow edit cannot silently reverse the decision.
- A future platform-specific consumer-install failure must be documented with evidence and a new ADR before the compatibility matrix is expanded.

Phase 26 implementation note: `test/compatibilityPolicy.test.ts` now asserts that the compatibility workflow retains `verify:package` without `verify:consumer`, that both the CI correctness matrix and the controlled release validation job require `verify:consumer`, that ADR-078 records the decision and that the corresponding roadmap task is checked. No workflow file was changed. The full working-tree gate is 169/169.

## ADR-079 — Phase 26 candidate dependency, licence, provenance and secret audit

Status: accepted on 2026-11-28 for Phase 26. This is point-in-time evidence for the clean candidate tree at commit `5889ca9d00491421e68b89067b5e75aad28c6681` on darwin-arm64 with Node `v26.8.2` and npm `11.19.1`. It does not authorize a version bump, tag, publication, registry mutation or GitHub release. It is not a legal opinion.

Problem: ADR-040 and ADR-041 recorded release audits for the `0.1.0` candidate and explicitly required repetition on the exact release commit. Phase 26 asks for the dependency, licence, provenance and secret audits to be repeated before `v1.0.0`. No `1.0.0` version bump or tag exists yet; the manifest on the audited tree still declares `0.5.0`. Auditing this clean tree provides current evidence, but it cannot substitute for the exact tagged v1 candidate once the release identity is applied.

Evidence:

- Dependency audits: `npm audit --omit=dev --json`, `npm audit --json`, `npm audit --prefix client --json` and `npm audit --prefix server --json` each exited 0 with zero info, low, moderate, high and critical findings and zero advisories. The runtime audit remains the blocking gate; the full and prototype audits are supporting evidence.
- Package contents: `npm pack --dry-run --json` produced `strudel-lsp-server-0.5.0.tgz` with 171 files and a size of 189,605 bytes. The only top-level entries are `LICENSE`, `README.md`, `package.json` and `dist/**`; no file outside `LICENSE`, `README.md`, `package.json` and `dist/src/**` is present. A scan of the 171 tracked files found no `grammar.js`, `binding.gyp`, parser `build/` directory or C/C++ source, so the grammar and bindings remain external dependencies.
- Dependency licences and pins: all 15 declared runtime and development dependencies are exact-pinned, installed at the declared version and carry `resolved` and `integrity` entries in `package-lock.json`. Runtime licences are `tree-sitter@0.25.1` MIT, `tree-sitter-strudel@2.0.2` AGPL-3.0-only, `vscode-languageserver@11.0.1` MIT and `vscode-languageserver-textdocument@1.0.16` MIT. The four pinned Strudel dependencies are AGPL-3.0-or-later; remaining development tooling is MIT or Apache-2.0.
- Metadata provenance: `npm run generate:metadata` regenerated `src/languageDatabase/generated.ts` from 576 reference records with no diff. A scan of `dist/src` found no local `/Users/zedro` path. The existing manifest contract asserts the AGPL-3.0-only licence, executable entry point and GitHub source URLs.
- Package verification: `npm run verify:package` passed both install-script modes for the 171-file tarball, including native parser prebuild loading, installed AGPL metadata and the stdio initialize/shutdown handshake.
- Secrets: a tracked-file scan for npm/GitHub token prefixes, `_authToken` assignments and PEM private-key headers returned zero hits after excluding two known pattern references in `docs/DECISIONS.md` (the ADR-040/041 descriptions) and `test/releaseWorkflow.test.ts` (a negative workflow assertion). No matched value was recorded. The existing workflow contract also asserts that no npm or Node auth token name appears in the release workflow.
- Runtime network behaviour: a temporary `--require` preload patched `net.Socket.connect`, `http`/`https` `request` and `get`, `dns.lookup` and `resolve*`, `tls.connect`, `dgram.createSocket` and `globalThis.fetch`. The built server completed an `initialize`/`shutdown`/`exit` stdio handshake with exit code 0, both responses observed, empty stderr and zero probe hits. The harness was kept outside the repository and added no dependency.

Rationale: repeating the full ADR-040/041 audit set on the current candidate tree catches dependency, licence, provenance and secret regressions before a release identity is applied. Keeping the result point-in-time and commit-specific prevents it from being mistaken for post-tag evidence.

Consequences:

- The roadmap audit task remains open until the exact tagged `v1.0.0` candidate is audited. A changed manifest version, tag, lockfile, generated snapshot, tarball file list or server code invalidates this evidence.
- No dependency, licence, source, version, tag or registry state was changed by this audit.
- Nothing in this ADR advertises a capability or authorizes publication; Phase 26 re-freeze and Phase 27 exact authorization still apply.
- ADR-081 later applied the local `1.0.0` manifest bump without creating a tag; the audits must still be repeated on the exact tagged `v1.0.0` candidate.

## ADR-080 — Phase 26 readiness confirmation: package, support and performance policy

Status: accepted on 2026-11-28 for Phase 26. This is a point-in-time confirmation in the reviewed Phase 26 working tree based on commit `78518c0`; it is not a legal opinion. It does not authorize a version bump, tag, publication, registry mutation, GitHub release, capability re-freeze or SBOM dependency.

Problem: ADR-064 required Phase 26 to revisit the npm allowlist, support guidance and SBOM deferral, while ADR-074 keeps performance thresholds advisory because runner hardware cannot be converted into trustworthy correctness gates. The Phase 26 readiness task requires confirming that all four policies are still implemented and documented. No `1.0.0` manifest version or `v1.0.0` tag exists in the reviewed tree, so this confirmation cannot replace exact-tag evidence.

Decision:

- **Package allowlist:** retain `package.json` `files` exactly as `['dist/src', 'LICENSE']`. npm's mandatory `package.json` and `README.md` plus the compiled `dist/src` outputs produce the same 171-file tarball shape recorded by ADR-079. Generated declarations and source maps stay inside `dist/src`; no changelog, TypeScript source, test, script, benchmark, editor client, grammar or binding file is added.
- **SBOM and attestations:** do not generate an SBOM or add a CycloneDX or SPDX dependency. npm signatures and OIDC-generated SLSA provenance remain the release evidence, as verified in the controlled workflow. A future SBOM or separate attestation tool requires an explicit ADR and separate dependency approval.
- **Support guidance:** the `README.md` `Reporting problems` section remains the user-facing support contract. It continues to request package and runtime versions, platform, client, minimal reproduction, diagnostic details and client-captured LSP traces or server stderr, with credential and private-content redaction; raw server stdout remains excluded because it is the protocol stream.
- **Performance policy:** performance thresholds remain advisory. The 20-workload layer baseline records p50, p95 and p99; `npm run benchmark:check` and `npm run benchmark:e2e` stay advisory with `continue-on-error: true` in both CI and controlled release validation; no hardware-normalisation multiplier is invented; no performance target is a blocking correctness gate. Local runs on the recorded environment may use the numeric targets to investigate suspected regressions, and the exact tagged `v1.0.0` candidate must repeat the benchmark checks before publication.
- **Verification:** `test/releaseWorkflow.test.ts` pins this ADR together with the manifest allowlist, package and release verifiers, the README support marker, the performance-policy wording and both advisory workflow steps. Existing tests continue to pin ADR-064, the detailed README checklist, the 20-workload baseline and the advisory benchmark contract.

Rationale: no observed consumer or compliance requirement justifies changing the tarball, adding an SBOM tool, moving support guidance out of the distributed README, or turning hardware-dependent latency figures into blocking gates. Keeping the policies unchanged preserves tarball comparability with published releases and keeps the release process free of unapproved dependencies.

Consequences:

- The Phase 26 readiness task is documented as confirmed for the reviewed candidate tree. The exact tagged `v1.0.0` candidate must repeat package-content, dependency, consumer-install and benchmark verification if any manifest, lockfile, generated snapshot, tarball content or server code changes.
- No dependency, SBOM artifact, source, workflow, version, tag or registry state is changed by this confirmation.
- No capability is advertised and no diagnostic code or configuration key is added; the ADR-077 additions remain outside the final v1 matrix until an explicit re-freeze.
- Publication still requires the separate exact authorization ADR and the controlled OIDC workflow.

## ADR-081 — Phase 26 candidate changelog and release notes preparation

Status: accepted on 2026-11-28 for Phase 26. This decision authorizes only the local manifest and lockfile version bump to `1.0.0` and the candidate documentation prepared in the reviewed working tree based on commit `78518c0`. It is point-in-time evidence, not a publication authorization. No tag, registry mutation, capability re-freeze or GitHub release is performed.

Problem: the remaining Phase 26 documentation task requires versioned changelog and GitHub release notes from the exact candidate, without presenting the immutable `0.2.0` release body or its point-in-time evidence as v1 evidence. Before this decision the manifest declared `0.5.0` and no `v1.0.0` tag existed. The user authorized a local `1.0.0` version identity and explicitly chose to keep the ADR-077 additions unadvertised.

Decision:

- Bump `package.json` and the two root version fields in `package-lock.json` to `1.0.0`. No dependency pin, script, workflow or source behaviour changes with this bump.
- Add a versioned `## [1.0.0] - 2026-11-28` section to `CHANGELOG.md` and a candidate-only `.github/RELEASE_NOTES_v1.0.0.md`. Both state that the version is not published and not tagged.
- Keep the published `0.5.0` capability surface unchanged. No capability, diagnostic code, configuration key or transport behaviour is added or advertised by this documentation. The ADR-077 additions remain unadvertised pending an explicit re-freeze.
- Describe only evidence from the exact candidate tree: the full gate recorded in `docs/TESTING_STRATEGY.md`, ADR-079's candidate audits and ADR-080's policy confirmation. The `0.2.0` release template, 138-file and 86/86-test observations remain historical records and are not reused as v1 evidence.
- Publication still requires a separate exact authorization ADR naming `strudel-lsp-server@1.0.0`, tag `v1.0.0` and the operator, followed by the controlled OIDC workflow. No signature, provenance, public-registry install or installed stdio evidence is claimed before that workflow runs.

Rationale: versioned candidate notes give the future `v1.0.0` release a precise source while avoiding false publication claims. Keeping the capability surface unchanged avoids an implicit re-freeze of the ADR-077 additions, and separating historical `0.2.0` evidence from candidate evidence preserves the immutable release record.

Consequences:

- The Phase 26 changelog/release-notes task is complete for the candidate tree; the phase remains open until the exact tagged gate, re-freeze disposition and final contract criteria pass.
- No tag, publish, republish, deprecation, manual dist-tag change, unpublish or registry mutation is authorized by this decision.
- Contract tests pin the candidate manifest, versioned changelog section, candidate-only release notes, absence of publication claims and continued exclusion of unadvertised capabilities.
- `npm run verify:package` and `npm run verify:consumer` were rerun for the `1.0.0` tarball; both install modes and isolated consumer installs passed. This is pre-publication evidence only.
- A later tag or registration of publication evidence requires a new exact authorization and publication-evidence ADR under Phase 27.
- ADR-082 supersedes only the unadvertised disposition above: the candidate documentation remains point-in-time evidence for its preparation, but the final v1 matrix advertises all four ADR-077 additions. ADR-082 does not change this ADR's version bump, candidate-only publication status or historical evidence boundary.

## ADR-082 — Phase 26 final v1 capability re-freeze

Status: accepted on 2026-11-28 for Phase 26. The user explicitly chose to advertise all four ADR-077 additions because an implemented, tested capability has no user-visible benefit while hidden. This is the final v1 capability re-freeze. It supersedes only the pending or unadvertised disposition recorded in ADR-063's Phase 26 amendment, the ADR-077 implementation note, ADR-080 and ADR-081. It does not authorize version `1.0.0`, tag `v1.0.0`, publication, a GitHub release or registry mutation.

Problem: ADR-063's Phase 26 amendment froze the published `0.5.0` capability surface and required an explicit re-freeze before any ADR-077 addition entered the final v1 matrix. All four additions now have feature, live-coding, stdio protocol and negative-boundary evidence: source-local literal sample keys for mini-notation step completion and hover, bounded relative `.strudel` import-path completion, pinned deprecation metadata in completion/resolve/hover, and resolved-symbol `documentHighlight`. They have remained unadvertised only because the final re-freeze decision was outstanding. Phase 26 exit criteria require each addition to be advertised and verified or explicitly deferred; the user chose to advertise all four.

Decision:

- Re-freeze the `v1.0.0` advertised capability surface as the ADR-063 `0.5.0` list plus all four ADR-077 additions. Context-aware mini-notation step completion and hover, relative `.strudel` import-path completion and deprecation metadata continue through the existing completion and hover providers; `documentHighlight` is newly advertised with `documentHighlightProvider: true`.
- Keep every published `0.5.0` capability, configuration key, diagnostic code and severity unchanged. Step/import completion adds no trigger character, deprecation metadata adds no diagnostic code and no generated metadata change, and document highlight adds no persistent workspace index or file watcher.
- Keep the deliberately unsupported surface exact: declaration, type definition, implementation, document link, color, code lens, on-type formatting, linked editing, inline value, moniker and pull diagnostics remain unadvertised. Semantic-token range/delta requests, persistent workspace indexing, file watching, TCP transport, `$:` active-pattern semantics, unknown-sample diagnostics and code lens remain outside v1.
- Update the exact `initialize` contract to the re-frozen v1 matrix, remove `documentHighlight` from the negative provider list while retaining negative assertions for the other unsupported providers, and keep the consolidated ADR-077 stdio test as proof of step completion/hover, import-path completion, deprecation metadata and document highlight in an incomplete live-coding document.
- Update `docs/LSP_FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/TESTING_STRATEGY.md`, `docs/ROADMAP.md`, `CHANGELOG.md` and `.github/RELEASE_NOTES_v1.0.0.md` so the candidate describes the re-frozen surface. ADR-063, ADR-077, ADR-080 and ADR-081 remain point-in-time records; their historical unadvertised statements are not rewritten.
- The candidate remains unpublished and subject to exact-tag verification and a separate Phase 27 publication authorization. This decision is a capability contract decision only.

Rationale: all four additions passed their required feature, protocol, live-coding and negative-boundary gates. Advertising them gives editors a reliable, documented contract and avoids maintaining hidden behavior that clients cannot request safely. `documentHighlight` is an additive provider backed by the existing resolved-reference scan; the other three additions enrich already advertised completion and hover providers without changing triggers, configuration or diagnostics. An explicit ADR keeps the final v1 matrix auditable instead of allowing a roadmap entry or passing test to change it silently.

Consequences:

- The Phase 26 re-freeze exit criteria are satisfied: every ADR-077 v1 addition is implemented, advertised and verified, and no planned v1 capability is advertised without implementation evidence.
- The final v1 capability contract is the `0.5.0` surface plus the four ADR-077 additions. Later removals or incompatible changes follow the ADR-063 SemVer rules; new providers beyond this matrix require a new decision.
- Contract tests pin the exact `initialize` result and the eleven remaining negative providers. A future capability addition or removal must update source, tests and documentation together.
- No dependency, generated metadata, diagnostic code, configuration key, version, tag, workflow, registry state or publication is changed by this re-freeze.
- Exact-tag audits, the final candidate gate and Phase 27 exact publication authorization remain outstanding.

Implementation note: `src/server.ts` now advertises `documentHighlightProvider: true`. `test/lsp/frozenBaselineContract.test.ts` freezes the complete v1 matrix and the eleven remaining negative providers, and `test/server.test.ts` asserts the provider and exercises all four additions in one stdio session. The full working-tree gate after the re-freeze contract is 172/172.
