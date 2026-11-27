Release notes for `strudel-lsp-server@0.3.0`: the contract, compatibility and release-process foundation prepared from the exact `v0.3.0` candidate. It supersedes `strudel-lsp-server@0.2.0`. The published `0.2.0` release body remains immutable in `.github/RELEASE_TEMPLATE.md` and is not reused as evidence for this release.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds but remain best-effort until validated.
- Supported Strudel snapshot: `1.2.6`, represented by `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`. `@strudel/reference@1.2.2` is the pinned generated JSDoc metadata source, not a second supported language version. Strudel version selection is not exposed.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## What changed

- ADR-063 defines the initial v1 stability contract: package, transport, runtime and platform support, capability baseline, diagnostics settings and codes, parser/metadata pins, known limitations, additive candidates, standing non-goals and SemVer rules. The contract may be extended before Phase 26 freezes it.
- ADR-064 keeps the npm `files` allowlist minimal, documents privacy-preserving problem reports and defers SBOM generation to the Phase 26 review.
- ADR-065 names Strudel `1.2.6` as the supported language snapshot, formally accepts the two pinned upstream parser gaps and the conservative unresolved-reference baseline, and records explicit dependency-update triggers and SemVer treatment.
- ADR-062 made release verification publication-state aware: unpublished candidates still compare pack and publish dry-runs; published versions compare the local tarball with immutable registry identity.
- Release notes are now version-specific so the published `0.2.0` release body remains unchanged historical evidence.
- The package version was bumped to `0.3.0` without changing dependencies, engines, the published file allowlist or parser and metadata pins. Language behaviour is unchanged from `0.2.0`.

## Implemented capabilities

- Resilient diagnostics that stay quiet on incomplete live-coding input, with quick fixes limited to validated mini-notation structural issues.
- Position-aware completion, hover documentation and signature help backed by the pinned language database.
- Definition, references, document symbols and bounded on-demand workspace symbols with open-document overrides.
- Document-scoped rename with `prepareRename`, semantic tokens and conservative indentation-only formatting.
- A narrow `refactor.inline` action for single-use literal constants.
- Mini-notation-aware tokens, structural warnings and operator hover derived from the pinned `1.2.6` lexical model.
- Focused diagnostics configuration through standard LSP settings: a global enable flag and per-code severity overrides, including `off`, with defaults unchanged from `0.2.0`.

The server advertises only implemented capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`.

## Install and launch

Install the pinned release:

```bash
npm install --global strudel-lsp-server@0.3.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package.

## Explicit limitations and known issues

- Diagnostics configuration is limited to enablement and per-code severity. Internal engine settings, formatting preferences beyond standard LSP `tabSize` and `insertSpaces`, and Strudel version selection remain deferred.
- Diagnostics are intentionally conservative on incomplete or malformed input; unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. Range formatting, on-type formatting and expression reflow are not supported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Rename is document-scoped.
- Folding ranges, selection ranges, inlay hints, call hierarchy, completion resolution, broader refactorings and cross-file navigation remain deferred.
- Real-corpus validation found seven upstream parser-gap examples caused by `%` modulo in JavaScript expressions and `//` inside string literals. Semantic analysis still completed with in-bounds ranges for all 484 examples. The grammar is not vendored or patched.
- The 1,308 unresolved corpus references are an accepted conservative baseline because runtime globals and sample names are outside the pinned metadata; they are not speculative diagnostics.
- Incremental semantic reuse is statement-level, so large-document edits may rebuild the snapshot. Mini-notation tokenization is lexical rather than a full `1.2.6` AST.
- Only stdio is provided; there is no TCP mode. Platforms outside the validated matrix are best-effort.
- Advisory benchmark and RSS observations are local evidence, not editor-latency thresholds or production telemetry. Local editor clients are not part of the published package.

Details and evidence are in `docs/SEMANTIC_ENGINE.md`, `docs/PARSER_INTEGRATION.md`, `docs/PERFORMANCE.md`, `validation/real-corpus.json`, `benchmarks/end-to-end.json` and `validation/client-smoke.json`.

## Installed-package verification

The exact candidate gate passed on darwin-arm64 with Node `v26.8.2` and npm `11.19.1`: strict typecheck, lint, Prettier verification and 94/94 tests; focused suites of 5 parser, 7 semantic, 5 metadata, 4 configuration, 3 LSP, 31 feature, 5 mini-notation, 9 protocol and 1 soak test; a 138-file tarball preview; offline, clean-consumer and installed stdio verification; all 18 layer benchmarks within thresholds; advisory installed-bin p50/p95/p99 of 0.288/0.591/0.765 ms; corpus validation over 484 examples with 477 clean parses, seven accepted parser gaps and zero invariant failures; runtime, full and client audits with zero vulnerabilities; and six editor-client behaviours each for VS Code and Neovim. `npm pack --dry-run` and `npm publish --dry-run` agreed on the unpublished `0.3.0` candidate, and no package was published during verification. Results are recorded in `docs/TESTING_STRATEGY.md`.

Post-publication verification also passed. Workflow run `46049593155` passed exact-tag validation and logged `+ strudel-lsp-server@0.3.0` from the controlled publish step; its final verification step failed with `ETARGET` while npm was still propagating the new version, so no republish was attempted. Registry `dist-tags.latest` is `0.3.0` with no deprecation, `gitHead` `b3451e283986b576b526534136026adba0bf5217`, 138 files, shasum `8ad0ac52f1443648c38b372532d0f2d5306e72d7` and integrity `sha512-qS3nmxxIKdJHGrSfqaiiL16epy9GYSamdqizZ9Bpb+Yu1EtRAqV/su3lm3tt4JHId9WtjJfTfcGJ2Rf0YbFCQQ==`. Two registry signatures verified, and the SLSA v1 attestation subject digest matched the published integrity while its workflow ref, repository, path and resolved commit matched the release. Fresh-cache local and global installs produced the expected manifests and AGPL notice, the documented PATH command completed an `initialize`/`initialized`/`shutdown`/`exit` handshake, and `npm audit signatures --include-attestations` reported no invalid or missing signatures. Full evidence is in ADR-067.

The immutable `0.3.0` tarball contains the candidate README, which still names `0.2.0` as the latest published version. The repository README is corrected after publication; changing the published tarball requires a separately authorized new release.

## Corrections and rollback

npm versions are immutable. If a defect is found, the fix is published as a new patch release through the same tag-gated workflow; `0.3.0` will not be replaced. A known-bad version may be deprecated with an npm warning that names the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users are notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication record

Published by operator `pedrozappa` from tag `v0.3.0` at commit `b3451e283986b576b526534136026adba0bf5217` through the controlled OIDC workflow run `46049593155`. Validation job `140677309030` passed; publish job `140677717483` ran `npm publish --access public` with OIDC and logged `+ strudel-lsp-server@0.3.0`. The workflow's final verification step failed transiently with `ETARGET` during registry propagation; registry identity, signatures, provenance and installed-package checks were repeated successfully afterwards. No local publish, republish, deprecation, dist-tag change, unpublish or retag was performed. Evidence is in ADR-067.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md#030---2026-11-27>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
