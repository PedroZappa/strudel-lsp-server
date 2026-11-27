# Changelog

All notable changes to the `strudel-lsp-server` npm package are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Version `0.3.0` was published on 2026-11-27 from tag `v0.3.0` at commit `b3451e283986b576b526534136026adba0bf5217` through the controlled OIDC workflow with `pedrozappa` as operator and is the latest published release; `0.2.0` and `0.1.0` remain available. ADR-067 records the publication and smoke evidence, including the transient workflow-verification race. Full user-facing notes for `0.3.0` are in `.github/RELEASE_NOTES_v0.3.0.md`; the published `0.2.0` body remains immutable in `.github/RELEASE_TEMPLATE.md`.

## [Unreleased]

### Added

- Phase 20 semantic depth under ADR-068: unambiguous generated synonyms are resolved as aliases, sample names resolve only from explicit catalog metadata, and conservative receiver usage can infer `Pattern` parameters.
- Additive `SemanticSignature` data with user-facing curated signatures, an overload-capable model, optional/rest parameters and user-defined function signatures; signature help now returns multiple signatures with an `activeSignature`.
- Focused parser-independent semantic, metadata alias/signature and multi-signature provider tests, plus compatibility-contract and rename-range checks for the deliberate corpus baseline.

### Changed

- `validation/real-corpus.json` was regenerated deliberately with catalog hash `strudel-1.2.6:0243e023`, 726 symbols, 1,277 unresolved references and 364 mini-notation arguments; parser, invariant and parser-gap totals are unchanged. The remaining unresolved categories are documented in ADR-068.
- Callable signatures compare structurally during return-type combination, so equivalent user signatures do not collapse inferred return types to `Unknown`.

### Fixed

- Corrected curated `s` and `Pattern.euclid` signatures to their user-facing arity: `n`/`gain` are control names and the registered `pat` parameter is the injected method receiver.
- Signature help now uses alias names in labels, suppresses catalog fallback for shadowed builtins, clamps the active parameter for rest signatures, preserves generated documentation in curated signatures, falls back on empty curated signature arrays and reads user rest parameters from the pinned grammar's `error`-node shape.
- Definition and rename ranges for default and rest parameters cover only the identifier; ambiguous or conflicting receiver methods no longer infer `Pattern` parameters.

## [0.3.0] - 2026-11-27

### Added

- ADR-063 records the initial v1 stability contract: package, transport, runtime and platform support, capability baseline, diagnostics settings and codes, parser/metadata pins, known limitations, additive candidates, standing non-goals and SemVer rules. The roadmap's Phase 16 charter is complete; later phases may extend the contract before Phase 26 freezes it.
- ADR-064 records the Phase 17 package-content, support-guidance and SBOM decisions: the npm allowlist stays minimal, README documents privacy-preserving problem reports, and SBOM generation is deferred to the Phase 26 review. Documentation-contract tests cover the recorded decisions.
- ADR-065 closes Phase 18 compatibility: Strudel `1.2.6` is named as the supported language snapshot, the two upstream `tree-sitter-strudel@2.0.2` grammar gaps and the 1,308 unresolved corpus references are accepted baselines, and explicit Strudel/parser/Node update triggers, corpus/compatibility reruns and SemVer rules are recorded. The refreshed corpus report is byte-identical and compatibility-contract tests cover the pins and matrix.
- ADR-066 records the exact Phase 19 publication authorization for `strudel-lsp-server@0.3.0`, tag `v0.3.0` and operator `pedrozappa`, including the requirement to preserve the published `0.2.0` release body as historical evidence.
- ADR-067 records the controlled workflow run, registry identity, signatures, SLSA provenance, tarball identity, fresh local and global installs, installed stdio handshake and GitHub release evidence for the published `0.3.0`.

### Changed

- Bumped the package version to `0.3.0` without changing dependencies, runtime requirements, the published file allowlist or the parser and metadata pins.
- Added version-specific release notes for `0.3.0` so `.github/RELEASE_TEMPLATE.md` remains the immutable published `0.2.0` release body.

### Fixed

- Made `npm run verify:release` idempotent after publication: unpublished candidates keep pack/publish dry-run parity, while published versions compare the local tarball with registry identity instead of calling `npm publish --dry-run` again. See ADR-062.

### Known issues

- Seven pinned documentation examples expose two upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. The grammar is not vendored or patched.
- Strudel version selection remains deferred; the narrow configuration surface does not expose internal engine settings.
- Incremental semantic reuse is statement-level, mini-notation tokenization is lexical rather than a full recovery parser, and platforms outside the validated matrix are best-effort.
- The immutable `0.3.0` tarball contains the candidate README that names `0.2.0` as the latest published version; the repository README was corrected after publication. The workflow's final verification step failed transiently with `ETARGET` during registry propagation; independent post-publication checks passed and no republish was attempted.

## [0.2.0] - 2026-11-27

### Added

- Focused diagnostics configuration through standard `workspace/configuration` and `workspace/didChangeConfiguration`: a global enable flag, per-code severity overrides including `off`, and unchanged defaults when no settings are supplied. Quick fixes follow the resulting diagnostics.
- A bounded soak/lifecycle suite covering rapid edits, stale-version suppression, repeated initialize/shutdown cycles and advisory RSS observation, with no production telemetry.
- A separate advisory installed-binary benchmark that packs and installs the server offline, measures one JSON-RPC document-symbol workload through the installed bin and records p50/p95/p99 in `benchmarks/end-to-end.json` without changing the layer-level baseline.
- Local VS Code and Neovim LSP smoke clients with all client configuration outside the server core; passing behaviours are recorded in `validation/client-smoke.json` and no editor dependency was added to the published package.
- The `0.2.0` release gate passed 86 tests, including configuration, LSP filesystem, protocol, soak, two-client evidence and Phase 15 publication-evidence contract checks.

### Changed

- Hardened workspace-symbol discovery to reject symlinks, unsafe entry names and paths outside the normalized root, skip unreadable or oversized files, enforce depth and file-count limits, and return locale-independent deterministic results. Open-document overrides remain unchanged.
- Removed the repository `.npmrc` after verifying clean consumer and development installs with `legacy-peer-deps=false`; added `npm run verify:consumer` for isolated install and stdio verification.
- Isolated npm cache writes during package packing so `make verify-all` no longer depends on a writable global cache; added `npm run verify:contents` with the existing tarball allowlist assertion and preserved offline install verification.
- Bumped the package version to `0.2.0` without changing dependencies, runtime requirements, the published file allowlist or the parser and metadata pins.

### Known issues

- Seven pinned documentation examples expose two upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. The grammar is not vendored or patched here.
- Strudel version selection remains deferred; the narrow configuration surface does not expose internal engine settings.
- Incremental semantic reuse is statement-level, mini-notation tokenization is lexical rather than a full recovery parser, and platforms outside the validated matrix are best-effort.

## [0.1.0] - 2026-11-27

### Added

- Editor-agnostic stdio LSP server with conservative diagnostics, position-aware completion, hover documentation and signature help backed by pinned Strudel metadata.
- Definition, references, document symbols and bounded on-demand workspace symbols with open-document overrides.
- Rename, mini-notation quick fixes and a conservative `refactor.inline` code action for single-use literal constants.
- Semantic tokens and indentation-only formatting driven by standard LSP formatting options.
- Mini-notation tokens, structural diagnostics and hover derived from the pinned `@strudel/mini@1.2.6` lexical model.
- Deterministic performance harness with 18 workloads and advisory p50/p95/p99 regression checks.
- Offline tarball and installed-executable verification via `npm run verify:package`, plus a clean-install compatibility workflow across the required platforms.
- Deterministic corpus validation over 484 pinned documentation examples and raw stdio protocol robustness tests.
- Controlled tag-gated release workflow with approval environment, OIDC trusted publishing and `npm run verify:release` dry-run parity checks.

### Changed

- Set the first public version to `0.1.0` with `vX.Y.Z` tags and a pre-1.0 SemVer policy.
- Declared Node.js 24/26 with npm 11 support and documented the required Linux x64, macOS arm64 and Windows x64 validation matrix.
- Pinned the language database to `@strudel/core`, `@strudel/mini` and `@strudel/transpiler` `1.2.6`, with `@strudel/reference` `1.2.2` for JSDoc metadata; no custom Strudel version selection is exposed.
- Changed the project licence to AGPL-3.0-only to align with the pinned AGPL-only parser and extended package verification to check the installed licence.
- Replaced the stale prototype README with authoritative npm package documentation and accurate repository/homepage/bugs metadata, covered by a package metadata contract test.
- Added GitHub Actions CI for verification, packaging, benchmark execution and dependency auditing.
- Upgraded prototype client `glob` to `14.0.6` and refreshed its lockfile to clear dependency advisories.

### Fixed

- Fixed Windows package verification to invoke `npm.cmd` through the platform shell.
- Rejected stale document versions at the scheduling boundary so an older edit cannot overwrite a newer analysis.
- Fixed Node 24 test discovery by passing quoted compiled test globs instead of bare directories.

### Known issues

- Seven pinned documentation examples expose two upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. The grammar is not vendored or patched here.
- In `0.1.0`, there is no custom configuration channel; diagnostic overrides and Strudel version selection remain deferred.
- Incremental semantic reuse is statement-level, and mini-notation tokenization is lexical rather than a full recovery parser. Platforms outside the validated matrix are best-effort.
