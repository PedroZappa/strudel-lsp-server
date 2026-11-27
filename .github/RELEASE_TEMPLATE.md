First public release of `strudel-lsp-server`: an editor-agnostic Strudel language server that speaks LSP over stdio. The server core has no editor dependency and no TCP mode.

> Prepared for the authorized `v0.1.0` release. Confirm the exact tag, commit and release date before publishing; this template is not publication authorization.

## Requirements and pinned versions

- Runtime: Node.js 24 or 26 with npm 11.x, declared in the package `engines` field.
- Validated platforms: Linux x64 with glibc, macOS arm64 and Windows x64. Linux arm64, macOS x64 and Windows arm64 have parser prebuilds but remain best-effort until validated.
- Language database: `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`, with `@strudel/reference@1.2.2` for JSDoc metadata. Strudel version selection is not exposed in `0.1.0`.
- Parser: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`. No grammar, generated parser or binding source is copied into the package.
- Licence: AGPL-3.0-only, consistent with the pinned parser. See the bundled `LICENSE`.

## Implemented capabilities

- Resilient diagnostics that stay quiet on incomplete live-coding input, with quick fixes limited to validated mini-notation structural issues.
- Position-aware completion, hover documentation and signature help backed by the pinned language database.
- Definition, references, document symbols and bounded on-demand workspace symbols with open-document overrides.
- Document-scoped rename with `prepareRename`, semantic tokens and conservative indentation-only formatting.
- A narrow `refactor.inline` action for single-use literal constants.
- Mini-notation-aware tokens, structural warnings and operator hover derived from the pinned 1.2.6 lexical model.

The server advertises only implemented capabilities. Exact behaviour and provider policies are documented in `docs/LSP_FEATURES.md`.

## Install and launch

```bash
npm install --global strudel-lsp-server@0.1.0
```

Configure the LSP client to launch `strudel-lsp-server` over stdio. For a source checkout, use `npm ci --ignore-scripts`, `npm run build` and `node dist/src/server.js`. Editor-specific configuration stays outside the package.

## Explicit limitations and known issues

- No custom configuration channel: diagnostic enablement/severity overrides and Strudel version selection are deferred. Formatting uses standard LSP `tabSize` and `insertSpaces` options.
- Diagnostics are intentionally conservative on incomplete or malformed input; unresolved runtime globals and sample names are not reported as errors.
- Formatting changes only statement and block indentation. Range formatting, on-type formatting and expression reflow are not supported.
- Workspace symbols use a bounded `.strudel` file scan, not a persistent index or a cross-file module graph. Rename is document-scoped.
- Folding ranges, selection ranges, inlay hints, call hierarchy, completion resolution, broader refactorings and cross-file navigation remain deferred.
- Real-corpus validation found seven upstream parser-gap examples caused by `%` modulo in JavaScript expressions and `//` inside string literals. Semantic analysis still completed with in-bounds ranges for all 484 examples.
- Incremental semantic reuse is statement-level, so large-document edits may rebuild the snapshot. Mini-notation tokenization is lexical rather than a full 1.2.6 AST.
- Only stdio is provided; there is no TCP mode. Platforms outside the validated matrix are best-effort.

Details and evidence are in `docs/SEMANTIC_ENGINE.md`, `docs/PARSER_INTEGRATION.md` and `validation/real-corpus.json`.

## Installed-package verification

- `npm run verify:release` compared `npm pack --dry-run` and `npm publish --dry-run` in an isolated copy: identical 132-file lists, manifest, shasum and integrity, with no publication.
- `npm run verify:package` verified the tarball allowlist and AGPL notice, then completed clean offline installs with and without scripts, native parser prebuild loading and installed stdio initialize/shutdown handshakes on darwin-arm64.
- The six-job compatibility workflow passed both install modes, parser prebuild loading and installed handshakes on Linux x64, macOS arm64 and Windows x64 with Node 24 and 26: <https://github.com/PedroZappa/strudel-lsp-server/actions/runs/45990023185>.
- `npm run validate:corpus` checked 484 pinned documentation examples with 477 clean parses, seven upstream parser gaps and zero invariant failures.
- The full local gate (`npm run check`), protocol robustness suite and runtime-only dependency audit passed with no known blocking failures. Dry-run evidence is point-in-time and must be repeated on the exact tagged release commit.

## Corrections and rollback

npm versions are immutable. If a defect is found, the fix is published as a new patch release (for example `0.1.1`) through the same tag-gated workflow; `0.1.0` will not be replaced. A known-bad version may be deprecated with an npm warning that names the replacement version. Unpublishing is reserved for exceptional security, legal or policy cases because it is irreversible and does not free the version number; it requires explicit operator authorization. Users are notified through the npm deprecation warning, an updated changelog, a GitHub release for the fix and a linked issue. See ADR-045 in `docs/DECISIONS.md`.

## Publication record

Confirm at release time: tag `v0.1.0`, exact commit, published npm version and the post-publish signature check. The initial `0.1.0` publication is operator-managed under ADR-049, so an npm provenance attestation is not assumed; record its presence or absence honestly. Later releases use the tag-gated trusted-publishing workflow.

## Links

- Package: <https://www.npmjs.com/package/strudel-lsp-server>
- README: <https://github.com/PedroZappa/strudel-lsp-server#readme>
- Changelog: <https://github.com/PedroZappa/strudel-lsp-server/blob/main/CHANGELOG.md>
- Documentation and decisions: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>
