Draft release notes for `strudel-lsp-server@0.5.0`: candidate only; not published. The candidate manifest declares `0.5.0`, while the latest published release remains `0.4.0`. These notes will become authoritative only after exact publication authorization, an exact validation gate, a controlled OIDC release and post-publication smoke checks. The published `0.4.0` notes remain in `.github/RELEASE_NOTES_v0.4.0.md`; the immutable `0.2.0` release body remains in `.github/RELEASE_TEMPLATE.md`.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Other parser prebuild platforms remain best-effort until separately validated.
- Supported Strudel snapshot: `1.2.6`, represented by `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`. `@strudel/reference@1.2.2` is the pinned JSDoc metadata source and the provenance-checked source of the real benchmark sample; it is not a second language version. Strudel version selection remains unexposed.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## What changed

- Phase 23 adds folding ranges, selection ranges, opt-in type inlay hints, completion resolution, range formatting, call hierarchy, `workspaceSymbol/resolve`, conservative `refactor.extract` and bounded cross-file definition and references for explicit relative `.strudel` imports under ADR-073.
- Phase 24 adds two real-corpus benchmark workloads derived from pinned `@strudel/reference@1.2.2` JSDoc examples, with tarball, licence, repository and corpus-hash verification and no copied example text, under ADR-074.
- Incremental semantic reuse survives type-preserving declaration initializer edits through declaration-identity symbol IDs. A type-changing initializer, declaration rename, insertion, removal, reorder or catalog-version change still forces a conservative rebuild. Unchanged ranges share immutable statement analyses.
- Opt-in local timing under `src/performance/` supports diagnosis in tests and benchmarks with a no-op production default. The LSP server supplies no recorder, so ordinary editor sessions have no new setting, environment variable, network call, stored log or telemetry.
- The layer baseline now records 20 workloads, including two real-corpus workloads. Performance thresholds remain advisory because CI hardware differs from the recorded linux-x64 baseline and no normalisation factor is claimed.

## Implemented capabilities

- The published `0.4.0` capability set: resilient diagnostics, completion, hover, signature help, definition, references, document and workspace symbols, rename, semantic tokens, whole-document formatting, and `quickfix` and `refactor.inline` code actions.
- Unreleased Phase 23 additions: completion resolution, range formatting, folding ranges, selection ranges, opt-in inlay hints, call hierarchy, `workspaceSymbol/resolve`, `refactor.extract` and bounded cross-file navigation.
- Performance and correctness additions from Phase 24 are internal: real-corpus workloads, incremental semantic reuse and opt-in local timing. They do not add a new LSP capability or diagnostic code.

The server advertises only implemented capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`; negative capability tests remain part of the candidate gate.

## Install and launch

After authorization and publication, install the pinned release:

```bash
npm install --global strudel-lsp-server@0.5.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package.

## Explicit limitations and known issues

- Diagnostics configuration remains limited to enablement and per-code severity. Internal engine settings, formatting preferences beyond standard LSP `tabSize` and `insertSpaces`, and Strudel version selection remain deferred.
- Diagnostics stay conservative on incomplete or malformed input. Unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. Range formatting reuses those edits; on-type formatting and expression reflow remain unsupported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Cross-file definition and references require explicit relative imports and verified exported declarations from that scan. Rename remains document-scoped.
- Inlay hints default to off and only report resolved symbols with known Strudel types. Completion and workspace-symbol resolution enrich or reveal only data from validated tokens; stale or malformed resolve tokens provide no enrichment. Call hierarchy is document-local.
- Seven pinned documentation examples still expose two accepted upstream `tree-sitter-strudel@2.0.2` grammar gaps: `%` modulo in JavaScript expressions and `//` inside string literals. The grammar is not vendored or patched.
- The mini-notation AST is recovery-oriented rather than a full Strudel 1.2.6 compiler; note pitch, sample identity, velocity, shuffle and random outcomes remain unmodelled.
- Only stdio is provided and platforms outside the validated matrix are best-effort. Advisory benchmark and RSS observations are local evidence, not editor-latency thresholds or production telemetry.

Details and evidence are in `docs/LSP_FEATURES.md`, `docs/PERFORMANCE.md`, `docs/TESTING_STRATEGY.md`, `validation/real-corpus.json`, `benchmarks/baseline.json` and `benchmarks/end-to-end.json`.

## Installed-package verification

The candidate gate passed on linux-x64 with Node `v26.13.1` and npm `11.20.0`: strict typecheck, lint, Prettier verification and 145/145 tests; focused suites of 6 parser, 13 semantic, 6 metadata, 6 configuration, 8 LSP, 51 feature, 9 mini-notation, 11 protocol and 1 soak test; `make ci` with package preview, offline install, all 20 advisory layer benchmarks, corpus validation and the client dependency audit; clean-consumer installs; runtime and client audits with zero vulnerabilities; and a local Neovim `0.12.6` smoke covering six behaviours. VS Code was unavailable on this runner, so its historical `1.148.0` evidence remains authoritative. The advisory installed-binary workload reported 0.441/0.689/1.009 ms p50/p95/p99 over 100 samples with `packageVersion: "0.5.0"`; no threshold or baseline update is associated with that report. Exact-tag CI, controlled workflow publication, registry identity, signatures, provenance, installed-package verification from the registry and GitHub release publication remain pending. No post-publication evidence is asserted in this draft.

## Corrections and rollback

npm versions are immutable. If a defect is found after publication, the fix will use a new version through the same tag-gated workflow; the published version will not be replaced. A known-bad version may be deprecated with an npm warning naming the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users would be notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication status

Controlled publication is authorized for exactly `strudel-lsp-server@0.5.0` and tag `v0.5.0` with `pedrozappa` as the named operator under accepted ADR-075 in `docs/DECISIONS.md`. Publication evidence remains pending: this draft does not claim that the tag, workflow run, registry entry or GitHub release exists. No local publish, deprecation, dist-tag change, unpublish, retag or other registry mutation is authorized.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
