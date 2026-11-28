Release notes for `strudel-lsp-server@1.0.0` (release candidate). This candidate is prepared from the exact working tree whose manifest declares `1.0.0`; no `v1.0.0` tag is pushed and the version is not published. ADR-083 records the exact local `v1.0.0` tag audit at commit `447736d3d1664e34d17e9fe6b5394e64f4327518`; the tag identifies the candidate commit. ADR-084 explicitly authorizes controlled publication of that exact version, tag and commit with `pedrozappa` as operator through the controlled OIDC workflow; the authorization itself performs no tag push or publish. The published `0.5.0` notes remain in `.github/RELEASE_NOTES_v0.5.0.md`, and the immutable `0.2.0` release body remains in `.github/RELEASE_TEMPLATE.md`.

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
- No diagnostic code, configuration key, trigger character, parser pin, metadata pin or transport change is claimed by this candidate.

## Implemented capabilities

- The published `0.5.0` capability surface remains intact: resilient diagnostics, completion and completion resolution, hover, signature help, definition, references, document and workspace symbols, rename, semantic tokens, whole-document and range formatting, folding ranges, selection ranges, opt-in inlay hints, call hierarchy, `workspaceSymbol/resolve`, bounded cross-file navigation, and `quickfix`, `refactor.inline` and `refactor.extract` code actions.
- ADR-082 re-freezes v1 with four additions: mini-notation step completion and hover from source-local literal sample keys and pinned metadata; bounded relative `.strudel` import-path completion; pinned deprecation metadata in completion, resolve and hover; and `documentHighlight` for resolved declarations, reads and writes. These are part of the v1 matrix; no post-v1 provider is claimed.

The server advertises only implemented and accepted capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`; negative capability tests remain part of the release gate.

## Install and launch

For this candidate, install from the source checkout:

```bash
npm ci
npm run build
node dist/src/server.js
```

After publication, the supported command will be `npm install --global strudel-lsp-server@1.0.0`. Configure the LSP client to launch `strudel-lsp-server` over stdio. Editor-specific configuration stays outside the package. Because this version is not published, no public-registry install evidence exists yet.

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

## Candidate verification

The exact candidate gate is recorded in `docs/TESTING_STRATEGY.md`: strict typecheck, lint, formatting, the full test suite, focused suites, corpus validation, package and consumer installation checks, runtime and client audits, and both advisory benchmark harnesses. The tagged tree passed 172/172 tests, all 20 advisory workloads and both install-script modes. ADR-079 records the earlier candidate dependency, licence, provenance and secret audits; ADR-080 records the package, support and performance policy confirmation; ADR-082 records the re-frozen capability matrix and its contract tests; ADR-083 repeats the audit and gate on the exact local tag. These are pre-publication observations only.

## Corrections and rollback

npm versions are immutable. If a defect is found after publication, the fix will use a new version through the same tag-gated workflow; the published version will not be replaced. A known-bad version may be deprecated with an npm warning naming the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users will be notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication status

Not published. No pushed `v1.0.0` tag, registry mutation, manual dist-tag change, deprecation, unpublish or retag has been performed. A local tag used for audit is not a publication action. An exact publication ADR must name `strudel-lsp-server@1.0.0`, tag `v1.0.0` and the operator before the controlled OIDC workflow may publish it. No signature, provenance attestation, public-registry install or installed stdio evidence exists for `1.0.0` yet.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
