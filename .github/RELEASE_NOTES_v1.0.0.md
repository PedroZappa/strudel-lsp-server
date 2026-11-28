Release notes for `strudel-lsp-server@1.0.0`. This release was published from tag `v1.0.0` at commit `447736d3d1664e34d17e9fe6b5394e64f4327518` through the controlled OIDC workflow with `pedrozappa` as operator. ADR-083 records the exact local-tag audit; ADR-084 records the exact publication authorization; ADR-085 records the registry, provenance, tarball, clean-install and stdio evidence. The published `0.5.0` notes remain in `.github/RELEASE_NOTES_v0.5.0.md`, and the immutable `0.2.0` release body remains in `.github/RELEASE_TEMPLATE.md`.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Other parser prebuild platforms remain best-effort until separately validated.
- Supported Strudel snapshot: `1.2.6`, represented by `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`. `@strudel/reference@1.2.2` is the pinned JSDoc metadata source; it is not a second language version. Strudel version selection remains unexposed.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## What changed since 0.5.0

- Phase 26 adds the four ADR-077 capabilities to the re-frozen v1 matrix under ADR-082: source-local mini-notation step completion and hover, bounded relative `.strudel` import-path completion, pinned deprecation metadata in completion/resolve/hover and resolved-symbol `documentHighlight`.
- Readiness work also hardens verification: the controlled release validation job mirrors the full CI gate, the compatibility-matrix scope is fixed by ADR-078, candidate dependency/licence/provenance/secret audits are recorded in ADR-079, and the package, support and performance policies are confirmed in ADR-080.
- Contract tests freeze the final v1 capability matrix, the eleven deliberately unsupported providers, the configuration schema and diagnostic-code identity. Release-workflow and compatibility-policy contracts prevent silent broadening of the publication path or verification scope.
- No diagnostic code, configuration key, trigger character, parser pin, metadata pin or transport change is claimed by this release.

## Implemented capabilities

- The published `0.5.0` capability surface remains intact: resilient diagnostics, completion and completion resolution, hover, signature help, definition, references, document and workspace symbols, rename, semantic tokens, whole-document and range formatting, folding ranges, selection ranges, opt-in inlay hints, call hierarchy, `workspaceSymbol/resolve`, bounded cross-file navigation, and `quickfix`, `refactor.inline` and `refactor.extract` code actions.
- ADR-082 re-freezes v1 with four additions: mini-notation step completion and hover from source-local literal sample keys and pinned metadata; bounded relative `.strudel` import-path completion; pinned deprecation metadata in completion, resolve and hover; and `documentHighlight` for resolved declarations, reads and writes. These are part of the v1 matrix; no post-v1 provider is claimed.

The server advertises only implemented and accepted capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`; negative capability tests remain part of the release gate.

## Install and launch

Install the published release:

```bash
npm install --global strudel-lsp-server@1.0.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package. The documented PATH command was verified against a clean install from the public registry.

## Explicit limitations and known issues

- Diagnostics configuration remains limited to enablement and per-code severity. Internal engine settings, formatting preferences beyond standard LSP `tabSize` and `insertSpaces`, and Strudel version selection remain deferred.
- Diagnostics stay conservative on incomplete or malformed input. Unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. On-type formatting and expression reflow remain unsupported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Cross-file definition and references require explicit relative imports and verified exported declarations from that scan. Rename remains document-scoped.
- Inlay hints default to off and only report resolved symbols with known Strudel types. Completion and workspace-symbol resolution enrich or reveal only data from validated tokens; stale or malformed resolve tokens provide no enrichment. Call hierarchy is document-local.
- Seven pinned documentation examples still expose two accepted upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. The grammar is not vendored or patched.
- The mini-notation AST is recovery-oriented rather than a full Strudel 1.2.6 compiler; note pitch, sample identity, velocity, shuffle and random outcomes remain unmodelled.
- Only stdio is provided and platforms outside the validated matrix are best-effort. Advisory benchmark and RSS observations are local evidence, not editor-latency thresholds or production telemetry.

Details and evidence are in `docs/LSP_FEATURES.md`, `docs/PERFORMANCE.md`, `docs/TESTING_STRATEGY.md`, `validation/real-corpus.json`, `benchmarks/baseline.json` and `benchmarks/end-to-end.json`.

## Verification

The exact tag passed the controlled validation job with strict typecheck, lint, formatting, all focused suites, corpus validation, package and consumer installs, advisory benchmarks and dependency audits. ADR-083 records the 172/172 local gate on commit `447736d3d1664e34d17e9fe6b5394e64f4327518`; ADR-085 records post-publication verification of the public tarball, registry metadata, signatures, SLSA v1 provenance, fresh local and global installs and the installed stdio handshake. Performance thresholds remain advisory; the exact-tag runs reported 20/20 workloads within layer thresholds and installed-binary p50/p95/p99 of 0.308/0.581/0.727 ms on darwin-arm64.

## Corrections and rollback

npm versions are immutable. If a defect is found after publication, the fix will use a new version through the same tag-gated workflow; the published version will not be replaced. A known-bad version may be deprecated with an npm warning naming the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users will be notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication record

Published by operator `pedrozappa` from tag `v1.0.0` at commit `447736d3d1664e34d17e9fe6b5394e64f4327518` through controlled workflow run `46139316105`. Validation job `140962208074` and publish job `140962206772` completed successfully. The first publish job was blocked because the `npm-release` environment had no exact `v1.0.0` tag policy; the exact policy was added and the failed publish job was rerun without changing the candidate or registry. The publish job ran `npm publish --access public` with OIDC, saw the version on attempt 7 of the bounded registry-visibility wait, and passed the post-publish install and signature checks. ADR-084 authorized the release and ADR-085 records its exact evidence. No local publish, republish, deprecation, dist-tag change, unpublish or retag was performed. The versioned release record is <https://github.com/PedroZappa/strudel-lsp-server/releases/tag/v1.0.0>.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md#100---2026-11-28>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
