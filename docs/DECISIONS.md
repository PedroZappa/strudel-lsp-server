# Decisions

Status: decision record for the re-implementation. Resolved decisions are authoritative unless explicitly reopened.

## ADR-001 — Clean-slate re-implementation

Status: accepted by `AGENTS.md`.

The existing repository implementation is an experimental prototype, not an architectural foundation. Implementation code, structure, dependencies, build configuration and tests may be replaced. Prototype architecture and behaviour are not preserved merely for compatibility.

Rationale: `AGENTS.md` section 1 explicitly authorises this and requires the approved architecture and specifications to guide the work.

## ADR-002 — Documentation as source of truth

Status: accepted.

Detailed requirements live in the ten documents under `docs/`; `AGENTS.md` defines agent behaviour and development rules. Conflicts are identified and resolved explicitly rather than by selecting a convenient interpretation.

## ADR-003 — Parser licence

Status: resolved by user decision on 2026-11-25.

Decision: treat **MIT** as the authoritative licence for the parser dependency. This is based on the MIT metadata in the published npm package and in both repositories' `package.json` files, together with the user's confirmation.

Verified source facts:

- `PedroZappa/tree-sitter-strdl` and `joshuadanpeterson/tree-sitter-strdl` both contain AGPL-3.0 `LICENSE` files.
- Both repositories' `package.json` files declare MIT.
- npm declares MIT for `tree-sitter-strdl@1.1.8` and `1.3.4`.
- The upstream `LICENSE` was changed to AGPL-3.0 in a signed 2025-07-29 commit by the repository owner.
- `joshuadanpeterson/tree-sitter-strdl` is a fork of `PedroZappa/tree-sitter-strdl`.
- No public issue or pull-request comment was found that resolves the licence contradiction.

Consequences:

- The AGPL `LICENSE` files remain inconsistent with the project's MIT decision. The user stated on 2026-11-25 that they will correct the licence in the original `PedroZappa/tree-sitter-strdl` repository. No issue or pull request was opened, and no action was taken against the fork. The project blocker is marked solved as an owner-owned upstream follow-up; this does not claim the upstream file has already changed.
- The exact parser package and runtime are pinned in ADR-013, and compatibility validation passed.
- The already-published `tree-sitter-strudel@1.1.8` npm tarball still contains an AGPL `LICENSE`. A corrected npm release from the original repository remains a release gate before redistribution, separate from the project licence-policy decision.

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

Vitest remains a documented alternative if richer ergonomics become necessary. Phase 2 added the first stdio transport smoke test, Phase 4 added the semantic engine suite, and Phase 5 added the metadata-generation and language-database suite; language-feature suites remain to be added.

## ADR-009 — Repository licence metadata

Status: resolved on 2026-11-25.

Root `LICENSE` previously carried the Microsoft MIT template notice while manifests identified `Zedro`. It is now MIT with `Copyright (c) 2025-present Zedro`. Repository identity, Git history and ownership information remain preserved.

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

- `.npmrc` still sets `legacy-peer-deps=true` as a general setting. The parser-specific rationale no longer applies; narrowing or removing it is deferred until all dependencies are confirmed compatible without it.
- Phase 3 parser integration tests validate loading, parse structure, non-ASCII ranges, incremental edits and malformed-input recovery with 2.0.2. Results are recorded in `docs/PARSER_INTEGRATION.md`.
- 2.0.2 declares `AGPL-3.0-only` consistently in both `package.json` and its bundled `LICENSE`. The earlier MIT-authoritative decision applied to 1.1.8 metadata and needs re-confirmation before redistributing the 2.0.2 parser package.

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

The initial server entry point explicitly uses `process.stdin`/`process.stdout` and advertises only `textDocumentSync: None`. This satisfies the editor-agnostic transport scaffold without claiming language features that do not yet exist. A stdio handshake smoke test verifies that contract. The benchmark script is a runner placeholder; Phase 8 establishes workloads and measured p50/p95/p99 targets.

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

Mini-notation initially uses a flattened context model: the engine records string ranges, owner names and `MiniNotationPattern` inference. A richer token or submodel is deferred to Phase 6 after language-feature requirements are validated.

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

Rationale: the design satisfies the offline requirement, avoids direct Node imports of packages with incompatible browser packaging, and preserves provenance for AGPL-3.0-or-later sources. Generated descriptions and examples are included for future hover and signature features; the repository licence remains MIT while source obligations are documented rather than assumed away.

Consequences:

- Regeneration must be deliberate through `npm run generate:metadata` or `make generate-metadata`.
- Metadata tests compare fresh generator output with the committed snapshot and do not access the network.
- Pattern-method types are generated from `memberOf: 'Pattern'` and `scope: 'static'`; sample names remain unavailable because no pinned authoritative sample list exists.
- Full function signatures and token-level mini-notation analysis remain future work.
