# Changelog

All notable changes to the `strudel-lsp-server` npm package are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Version `0.1.0` was published on 2026-11-27 from tag `v0.1.0`; full user-facing notes are in `.github/RELEASE_TEMPLATE.md`.

## [Unreleased]

### Added

- Focused, unreleased diagnostics configuration through standard `workspace/configuration` and `workspace/didChangeConfiguration`: a global enable flag, per-code severity overrides including `off`, and unchanged defaults when no settings are supplied. Quick fixes follow the resulting diagnostics.
- A bounded soak/lifecycle suite covering rapid edits, stale-version suppression, repeated initialize/shutdown cycles and advisory RSS observation, with no production telemetry.
- A separate advisory installed-binary benchmark that packs and installs the server offline, measures one JSON-RPC document-symbol workload through the installed bin and records p50/p95/p99 in `benchmarks/end-to-end.json` without changing the layer-level baseline.
- Local VS Code and Neovim LSP smoke clients with all client configuration outside the server core; passing behaviours are recorded in `validation/client-smoke.json` and no editor dependency was added to the published package.
- The final Phase 14 gate passes 85 tests, including configuration, LSP filesystem, protocol, soak and two-client evidence contract checks.

### Changed

- Hardened unreleased workspace-symbol discovery to reject symlinks, unsafe entry names and paths outside the normalized root, skip unreadable or oversized files, enforce depth and file-count limits, and return locale-independent deterministic results. Open-document overrides remain unchanged.
- Removed the repository `.npmrc` after verifying clean consumer and development installs with `legacy-peer-deps=false`; added `npm run verify:consumer` for isolated install and stdio verification.
- Isolated npm cache writes during package packing so `make verify-all` no longer depends on a writable global cache; added `npm run verify:contents` with the existing tarball allowlist assertion and preserved offline install verification.

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
