Release notes for `strudel-lsp-server@0.2.0`: a consolidation update to the editor-agnostic Strudel language server, published on 2026-11-27 from tag `v0.2.0` at commit `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488` through the controlled OIDC workflow. It supersedes `strudel-lsp-server@0.1.0`.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds but remain best-effort until validated.
- Language database: `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`, with `@strudel/reference@1.2.2` for JSDoc metadata. Strudel version selection is not exposed.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## What changed

- Focused diagnostics configuration through standard LSP settings: a global enable flag and per-code severity overrides, including `off`, with defaults unchanged from `0.1.0`. Quick fixes follow the resulting diagnostics.
- Bounded workspace-symbol discovery now rejects symlinks, traversal entries and paths outside the workspace root; skips unreadable or oversized files; enforces depth and file-count limits; and returns locale-independent deterministic results.
- Clean consumer installs are verified without inherited npm configuration and with `legacy-peer-deps=false`; the repository `.npmrc` was removed. Package packing no longer depends on a writable global npm cache.
- A bounded soak/lifecycle test covers rapid edits, stale-version suppression and repeated initialize/shutdown cycles, with advisory RSS observation and no production telemetry.
- An advisory installed-binary benchmark records JSON-RPC p50/p95/p99 separately from the 18-workload layer baseline. Local VS Code and Neovim smoke runs record six client behaviours each, with all client configuration outside the package.

## Implemented capabilities

- Resilient diagnostics that stay quiet on incomplete live-coding input, with quick fixes limited to validated mini-notation structural issues.
- Position-aware completion, hover documentation and signature help backed by the pinned language database.
- Definition, references, document symbols and bounded on-demand workspace symbols with open-document overrides.
- Document-scoped rename with `prepareRename`, semantic tokens and conservative indentation-only formatting.
- A narrow `refactor.inline` action for single-use literal constants.
- Mini-notation-aware tokens, structural warnings and operator hover derived from the pinned 1.2.6 lexical model.

The server advertises only implemented capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`.

## Install and launch

Install the pinned release:

```bash
npm install --global strudel-lsp-server@0.2.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package.

## Explicit limitations and known issues

- Diagnostics configuration is limited to enablement and per-code severity. Internal engine settings, formatting preferences beyond standard LSP `tabSize` and `insertSpaces`, and Strudel version selection remain deferred.
- Diagnostics are intentionally conservative on incomplete or malformed input; unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. Range formatting, on-type formatting and expression reflow are not supported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Rename is document-scoped.
- Folding ranges, selection ranges, inlay hints, call hierarchy, completion resolution, broader refactorings and cross-file navigation remain deferred.
- Real-corpus validation found seven upstream parser-gap examples caused by `%` modulo in JavaScript expressions and `//` inside string literals. Semantic analysis still completed with in-bounds ranges for all 484 examples.
- Incremental semantic reuse is statement-level, so large-document edits may rebuild the snapshot. Mini-notation tokenization is lexical rather than a full 1.2.6 AST.
- Only stdio is provided; there is no TCP mode. Platforms outside the validated matrix are best-effort.
- Advisory benchmark and RSS observations are local evidence, not editor-latency thresholds or production telemetry. Local editor clients are not part of the published package.

Details and evidence are in `docs/SEMANTIC_ENGINE.md`, `docs/PARSER_INTEGRATION.md`, `docs/PERFORMANCE.md`, `validation/real-corpus.json`, `benchmarks/end-to-end.json` and `validation/client-smoke.json`.

## Installed-package verification

- `npm run verify:contents` previews the 138-file tarball allowlist containing `dist/src`, `package.json`, `README.md` and `LICENSE`, with no test, script, client or grammar source.
- `npm run verify:package` verifies the tarball and licence notice, then completes clean offline installs with and without scripts, native parser prebuild loading and installed stdio initialize/shutdown handshakes on darwin-arm64.
- `npm run verify:consumer` passes both clean consumer install modes without inherited npm configuration.
- `npm run check` passes strict typecheck, lint, formatting and 86/86 tests, including the Phase 15 release-evidence contract; the focused parser, semantic, metadata, configuration, LSP, feature, mini-notation, protocol and soak suites also pass.
- `npm run benchmark:check` keeps all 18 layer workloads within their committed thresholds. `npm run benchmark:e2e` reports advisory installed-bin p50/p95/p99 of 0.337/0.575/0.735 ms from the committed report and has no blocking threshold.
- `npm run validate:corpus` checks 484 pinned documentation examples with 477 clean parses, seven upstream parser gaps and zero invariant failures. Runtime, full and prototype-client dependency audits report zero vulnerabilities.
- `npm run verify:release` and exact-tag CI were release-time gates; the validation job passed on the exact tag before publication. The controlled publish job ran with `npm-release` approval and produced an OIDC provenance attestation. The original workflow run's final verification step failed because npm had not yet made the new version visible; registry visibility, signatures, provenance and installed-package checks were repeated successfully from a clean install. A validation-only dispatch after publication fails at dry-run parity because the immutable version now exists on the registry. Evidence is in `docs/TESTING_STRATEGY.md` and ADR-061.

## Corrections and rollback

npm versions are immutable. If a defect is found, the fix is published as a new patch release (for example `0.2.1`) through the same tag-gated workflow; `0.2.0` will not be replaced. A known-bad version may be deprecated with an npm warning that names the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users are notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication record

Published by operator `pedrozappa` from tag `v0.2.0` at commit `7d611a8d61dae2ab2eea21a12ce2ebdec59e4488` via [workflow run 46038153400](https://github.com/PedroZappa/strudel-lsp-server/actions/runs/46038153400). Verified: npm version `0.2.0`, `dist-tags.latest` `0.2.0`, no deprecation, registry metadata and AGPL-3.0-only licence, two registry signatures and a matching SLSA v1 provenance attestation for the exact repository, workflow ref and commit, published tarball shasum/integrity, clean local and global installs, documented PATH launch and installed stdio handshake. The ADR-049 bootstrap exception applies only to `0.1.0`; `0.2.0` used the controlled OIDC workflow unchanged. No token, password, OTP or recovery code was read or recorded.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md#020---2026-11-27>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
