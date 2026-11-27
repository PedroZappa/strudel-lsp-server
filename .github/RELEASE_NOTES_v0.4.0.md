Release notes for `strudel-lsp-server@0.4.0`: the semantic-depth and mini-notation recovery release prepared from the exact `v0.4.0` candidate. It supersedes `strudel-lsp-server@0.3.0`. The published `0.2.0` release body remains immutable in `.github/RELEASE_TEMPLATE.md` and is not reused as evidence for this release.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds but remain best-effort until validated.
- Supported Strudel snapshot: `1.2.6`, represented by `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`. `@strudel/reference@1.2.2` is the pinned generated JSDoc metadata source, not a second supported language version. Strudel version selection is not exposed.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## What changed

- ADR-068 adds evidence-backed semantic depth: unambiguous generated synonyms resolve as aliases, explicit catalog sample names resolve conservatively, and repeated Pattern-method receiver usage can infer `Pattern` parameters without guessing.
- Curated and generated callable signatures now share an additive overload-capable model with optional/rest markers, documentation and user-defined function signatures. Signature help returns multiple signatures with an `activeSignature`.
- ADR-069 adds a Strudel-owned mini-notation recovery AST over the pinned lexer. Groups, operator targets and empty/incomplete/error states carry absolute ranges that survive incremental reuse, without importing Tree-sitter or a mini parser into the semantic engine.
- Hover and completion use the structured mini-notation view only where pinned 1.2.6 evidence exists; signature help for the host call remains unchanged because the mini grammar has no call signature.
- ADR-070 hardens the controlled release workflow with a bounded registry-visibility wait before the post-publication install and signature checks, so npm propagation lag cannot repeat the `ETARGET` race seen after `0.3.0`.
- The package version was bumped to `0.4.0` without changing dependencies, engines, the published file allowlist or the parser and metadata pins.

## Implemented capabilities

- Resilient diagnostics that stay quiet on incomplete live-coding input, with quick fixes limited to validated mini-notation structural issues.
- Position-aware completion, hover documentation and signature help backed by the pinned language database and the new alias/signature data.
- Definition, references, document symbols and bounded on-demand workspace symbols with open-document overrides.
- Document-scoped rename with `prepareRename`, semantic tokens and conservative indentation-only formatting.
- A narrow `refactor.inline` action for single-use literal constants.
- Mini-notation tokens, structural warnings, structured hover for recovery AST nodes and exact operator completion derived from the pinned `1.2.6` lexical model.
- Focused diagnostics configuration through standard LSP settings: a global enable flag and per-code severity overrides, including `off`, with defaults unchanged from `0.3.0`.

The server advertises only implemented capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`.

## Install and launch

Install the pinned release:

```bash
npm install --global strudel-lsp-server@0.4.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package.

## Explicit limitations and known issues

- Diagnostics configuration is limited to enablement and per-code severity. Internal engine settings, formatting preferences beyond standard LSP `tabSize` and `insertSpaces`, and Strudel version selection remain deferred.
- Diagnostics are intentionally conservative on incomplete or malformed input; unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. Range formatting, on-type formatting and expression reflow are not supported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Rename is document-scoped.
- Folding ranges, selection ranges, inlay hints, call hierarchy, completion resolution, broader refactorings and cross-file navigation remain deferred.
- Real-corpus validation still finds seven upstream parser-gap examples caused by `%` modulo in JavaScript expressions and `//` inside string literals. Semantic analysis completes with in-bounds ranges for all 484 examples. The grammar is not vendored or patched.
- The 1,277 unresolved corpus references are an accepted conservative baseline because runtime globals and sample names are outside the pinned metadata; they are not speculative diagnostics.
- Incremental semantic reuse is statement-level. The mini-notation AST is recovery-oriented, not a full `1.2.6` compiler; note pitch, sample identity, velocity, shuffle, random outcomes and the experimental haskellish statement layer remain unmodelled.
- Only stdio is provided; there is no TCP mode. Platforms outside the validated matrix are best-effort.
- Advisory benchmark and RSS observations are local evidence, not editor-latency thresholds or production telemetry. Local editor clients are not part of the published package.

Details and evidence are in `docs/SEMANTIC_ENGINE.md`, `docs/PARSER_INTEGRATION.md`, `docs/PERFORMANCE.md`, `validation/real-corpus.json`, `benchmarks/end-to-end.json` and `validation/client-smoke.json`.

## Installed-package verification

The candidate gate passed on linux-x64 with Node `v26.13.1` and npm `11.20.0`: strict typecheck, lint, Prettier verification and 112/112 tests; focused suites of 5 parser, 11 semantic, 6 metadata, 4 configuration, 3 LSP, 35 feature, 9 mini-notation, 9 protocol and 1 soak test; a 141-file tarball preview with offline installed-server verification; all 18 advisory layer benchmarks within the committed thresholds; clean-consumer installs with and without lifecycle scripts; corpus validation over 484 examples with 477 clean parses, seven accepted upstream parser gaps and zero invariant failures; and zero runtime or client dependency vulnerabilities. The advisory installed-binary JSON-RPC workload produced p50/p95/p99 of 0.486/1.052/1.188 ms over 100 samples; the committed cross-platform report remains the darwin-arm64 baseline.

Neovim `0.12.6` passed all six editor-client behaviours locally on this linux-x64 runner. VS Code was not installed on the runner, so the local VS Code smoke could not be executed here; the committed `validation/client-smoke.json` evidence records VS Code `1.148.0` and Neovim `0.12.6` each passing six behaviours on darwin-arm64 with Node `v26.8.2`. Details are in `docs/TESTING_STRATEGY.md`.

## Post-publication verification

Exact-tag workflow run `46063508701` passed validation job `140723175749` and publish job `140723461085`. The publish job waited through seven failed fresh-metadata checks and observed the version on attempt 8, then completed the clean install and signature check without the `ETARGET` failure seen after `0.3.0`. Registry metadata reported `dist-tags.latest` as `0.4.0`, no deprecation, `fileCount` 141, shasum `cf6a8eff2b4dc1c3cbbb110b1605d6c871229173` and integrity `sha512-vneHfd0M/nl1QdEP3F6nra4+BMODFiz0kAtUs6m78uNiYDzaY9xIwFCzmQlD6F3dXV0CWUhvvCyhkhABIWvtfA==`; an independently downloaded tarball reproduced both digests. Fresh-cache local and isolated global installs produced the expected manifest, AGPL notice and PATH shim, and the installed shim completed an `initialize`/`initialized`/`shutdown`/`exit` JSON-RPC handshake. `npm audit signatures --include-attestations` reported no invalid or missing signatures. Two attestations were present, including SLSA v1 with subject digest matching the published integrity and workflow ref `refs/tags/v0.4.0`, repository `PedroZappa/strudel-lsp-server` and path `.github/workflows/release.yml`. Evidence is in ADR-072 and `docs/TESTING_STRATEGY.md`.

## Corrections and rollback

npm versions are immutable. If a defect is found, the fix is published as a new patch release through the same tag-gated workflow; `0.4.0` will not be replaced. A known-bad version may be deprecated with an npm warning that names the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users are notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication record

Published by operator `pedrozappa` from tag `v0.4.0` at commit `1d39c14cba2152116ce1c2c5d5b827bf6af5c144` through the controlled OIDC workflow run `46063508701`. Validation job `140723175749` passed; publish job `140723461085` ran `npm publish --access public`, waited for registry visibility on attempt 8 and passed the post-publish install and signature checks. ADR-071 authorized and ADR-072 records the exact publication and smoke evidence. No local publish, republish, deprecation, dist-tag change, unpublish or retag was performed. The GitHub release is <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v0.4.0>.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md#040---2026-11-27>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
