# LSP Features

Status: Phase 6 capabilities, signature help, conservative token-level mini-notation analysis, Phase 7 quick fixes, rename, document and workspace symbols, semantic tokens, formatting and inline-constant refactoring implemented and verified. The published `0.2.0` release adds focused diagnostics configuration (ADR-052), hardened workspace-symbol filesystem discovery (ADR-053), clean consumer-install verification with `.npmrc` removal and hermetic package verification (ADR-054/055), a bounded soak/lifecycle suite (ADR-056), a separate advisory installed-binary benchmark (ADR-057), and two independent editor-client smoke runs (ADR-058). `0.1.0` remains available. The published `0.2.0` release gate had 86 tests; the tree had 87 after ADR-062, 90 after the Phase 17 documentation-contract tests, 93 after the Phase 18 compatibility-contract tests and 94 after the Phase 19 exact-authorization test and 95 after the post-publication evidence-contract test. ADR-063 classifies the stable v1 baseline, known limitations, additive candidates and standing non-goals, ADR-064 records the package and support readiness decisions, ADR-065 records the compatibility closure, ADR-066 authorizes the exact `0.3.0` controlled publication, and ADR-067 records its publication and smoke evidence. Phase 20 adds unambiguous alias resolution, metadata-gated sample references, conservative parameter inference and overload-capable curated signatures under ADR-068, with the gate raised to 103/103. Remaining candidates are tracked below.

Authority: `AGENTS.md` sections 4 and 5.

## Evaluation policy

Capabilities are evaluated for usefulness, correctness, dependencies and maintenance cost. A capability is advertised in `initialize` only when implemented and verified. Prototype handlers are not carried forward merely because they exist.

Historical prototype facts, for transition context only:

- `initialize` advertises only incremental text sync and completion.
- Diagnostics are naive whole-text bracket counting.
- Completion returns the full hardcoded function/sample list regardless of position.
- Hover matches the first word of a line rather than the token at the cursor.
- Definition returns `null` and references returns `[]`.
- Some handlers are registered but not advertised as capabilities.

None of this behaviour is treated as a specification.

## Capability matrix

| Capability                         | Status          | Proposed phase  | Notes                                                                                                                                                                 |
| ---------------------------------- | --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostics                        | Implemented     | Early           | Conservative syntax warnings and unknown-call/method information; focused settings are published in `0.2.0`.                                                          |
| Quick fixes                        | Implemented     | Extended        | Safe mini-notation edits only; no fixes for speculative or unknown-name issues.                                                                                       |
| Completion                         | Implemented     | Early           | Position-aware globals, locals and Pattern methods; `.` trigger.                                                                                                      |
| Completion resolution              | Not implemented | With completion | Only if additional lazy metadata adds real value.                                                                                                                     |
| Hover documentation                | Implemented     | Early           | Database descriptions, examples and inferred types.                                                                                                                   |
| Signature help                     | Implemented     | Early           | Database-backed globals and methods; overload-capable curated signatures and inferred user signatures with `activeSignature`; `(`, `,` triggers and active parameter. |
| Go to definition                   | Implemented     | Early           | Resolved user and local symbols; builtins have no source declaration.                                                                                                 |
| References                         | Implemented     | Early           | Resolved references plus optional declarations.                                                                                                                       |
| Rename                             | Implemented     | Extended        | Document-scoped user symbols only; prepare and invalid-name checks are implemented.                                                                                   |
| Document symbols                   | Implemented     | Extended        | Declared user symbols from the current semantic snapshot with exact selection ranges.                                                                                 |
| Workspace symbols                  | Implemented     | Extended        | Bounded on-demand folder scan with open-document overrides; no cross-file resolution.                                                                                 |
| Semantic tokens                    | Implemented     | Extended        | Verified symbols and mini-notation tokens only; no unresolved-name guessing.                                                                                          |
| Formatting                         | Implemented     | Extended        | Conservative indentation only; preferences come from standard LSP formatting options.                                                                                 |
| Refactoring and other code actions | Implemented     | Extended        | Narrow `refactor.inline` for single-use literal constants; broader actions are deferred.                                                                              |
| Folding ranges                     | Deferred        | Deferred        | Evaluate after core language intelligence is reliable.                                                                                                                |
| Selection ranges                   | Deferred        | Deferred        | Evaluate editor benefit against implementation cost.                                                                                                                  |
| Inlay hints                        | Deferred        | Deferred        | Evaluate only with concrete, non-noisy use cases.                                                                                                                     |
| Call hierarchy                     | Deferred        | Deferred        | Depends on robust cross-reference semantics.                                                                                                                          |
| Mini-notation-aware analysis       | Implemented     | Early           | Parser-independent tokens; conservative structural warnings and operator hover.                                                                                       |

Priorities are proposed by phase in `docs/ROADMAP.md` and remain subject to approval. The parser redistribution licence decision is recorded in ADR-032, and the pinned metadata snapshot is documented in `docs/PARSER_INTEGRATION.md`.

## v1 contract classification

ADR-063 establishes the initial v1 contract. Phase 26 freezes the final capability matrix after the proposed feature-expanded phases; until then, these categories distinguish what users can rely on from what is still planned.

- **Stable contract baseline:** the `strudel-lsp-server` npm package and executable, stdio LSP transport, Node `^24.0.0 || ^26.0.0` with npm `>=11 <12`, supported Linux x64/macOS arm64/Windows x64 matrix, the implemented rows in the capability matrix above, the `strudelLsp.diagnostics` settings shape and seven diagnostic codes, and the pinned parser/metadata snapshot. ADR-064 retains the npm allowlist of compiled `dist/src` outputs and `LICENSE`; ADR-065 confirms the Strudel `1.2.6` language snapshot and supported platform matrix. Changes to these items follow the SemVer rules in ADR-063 and the update policy in ADR-065.
- **Known limitations:** unresolved value references are conservatively not reported, generated signatures without curated data remain flat JSDoc parameter lists, sample names resolve only when explicit catalog metadata is supplied, mini-notation analysis is lexical rather than a full AST, workspace navigation has no persistent index or file watcher, the two upstream grammar gaps for `%` modulo in JavaScript expressions and `//` inside strings are formally accepted for the pinned parser under ADR-065, and performance evidence is advisory without an editor-latency SLA. These are documented limitations, not unimplemented capabilities claimed as stable.
- **Additive candidates:** Phases 20–21 may add semantic depth and structured mini-notation analysis; Phase 23 may add completion resolution, folding ranges, selection ranges, inlay hints, call hierarchy, range formatting, `workspaceSymbol/resolve`, bounded cross-file navigation and conservative refactoring; Phase 24 may add real-world workloads and incremental semantic reuse. They become stable only when implemented, advertised and included in the Phase 26 freeze. Rows marked `Deferred` above describe the published `0.2.0` state; the earlier blanket deferral of folding, selection ranges, inlay hints and call hierarchy is superseded by proposed Phase 23.
- **Standing non-goals:** a complete JavaScript or TypeScript compiler/type checker, standalone binary distribution instead of the npm package, editor-specific dependencies in the server core, TCP transport, production telemetry, vendored grammar or generated parser source, and a persistent workspace index or file watcher as a prerequisite for navigation. Bounded on-demand cross-file navigation under Phase 23 is compatible with this non-goal.

## Diagnostics policy

- Prefer useful, resilient diagnostics over aggressive reporting.
- Recover from incomplete or malformed source wherever possible.
- Never crash because a document is temporarily syntactically invalid.
- Avoid cascading diagnostics from one upstream error or incomplete context.
- Delay or suppress diagnostics when a reliable conclusion is not possible.
- Distinguish errors, warnings and informational diagnostics.
- Provide accurate source ranges and actionable messages.
- Reanalyse documents as they change without unnecessary recomputation.

Current implementation: outermost non-empty syntax error nodes produce warnings; missing nodes and speculative semantic conclusions are suppressed. Unknown calls and pattern methods produce informational diagnostics only when the syntax tree is clean. Unresolved value references are intentionally not reported because runtime globals may be injected outside the document. Mini-notation reports empty groups, unmatched or mismatched closers and missing steps at the start of or between `,` or `|` separators; unclosed groups, trailing separators, other trailing operators and unsupported characters are not reported during live editing. The configuration implemented for the published `0.2.0` release in ADR-052 can globally disable these diagnostics or remap/suppress individual codes through `workspace/configuration` or a settings notification, but never changes which findings the providers consider reliable.

## Quick fix policy

- Actions are computed from the current semantic snapshot; client-supplied diagnostic arrays cannot authorize stale edits.
- Only the four validated mini-notation structural diagnostics are actionable.
- An empty group is removed, an unmatched closer is removed, a mismatched closer is replaced with the expected closer, and a redundant separator is removed.
- Syntax errors, unknown names and incomplete live-coding states have no fixes.
- Edits are deterministic single-document text replacements and are never applied automatically by the server.

## Refactoring policy

- `refactor.inline` applies only to a `const` variable with one declaration and exactly one resolved value reference.
- Initializers are limited to strings, numbers, substitution-free templates and the literal identifiers `true`, `false`, `null` and `undefined`.
- Calls, assignments, imports, parameters, functions, exported declarations, multiple declarators and multiple uses are skipped.
- The declaration statement and the verified reference must still match their recorded source text; malformed documents produce no action.
- Edits remove the declaration statement and replace the single reference with the exact initializer text, without reflowing other code.
- Broader refactorings remain deferred until they have a concrete usefulness and safety case.

## Rename policy

- Rename is document-scoped: there is no workspace index or cross-file symbol database yet.
- Only resolved variables, functions, parameters and import bindings with declarations are renamable.
- Builtins, pattern methods, unresolved names, no-op renames and documents with syntax errors are rejected.
- New names must be valid ECMAScript identifiers and must not be reserved or strict-mode reserved words.
- Every replacement range must still contain the original symbol text before an edit is returned; this prevents stale incremental ranges from being applied.
- `textDocument/prepareRename` returns the exact token range and placeholder before rename is offered.

## Document symbols policy

- Only symbols declared in the current document and still matching their recorded source range appear in the outline.
- Catalog-only builtins, methods and samples have no declaration and are omitted.
- A named function owns the declarations in its function scope as children; scopes without a declared owner are flattened into the enclosing level.
- `detail` reports the limited Strudel type inferred by the semantic engine, not a JavaScript type.

## Workspace symbols policy

- `workspace/symbol` scans workspace folders on demand; no persistent index or file watcher is maintained.
- Discovery is limited to `.strudel` files and bounded by file count, file size and directory depth. Hidden and generated directories are skipped.
- Roots are normalized, symlink entries are never followed, and unsafe entry names or paths outside the root are skipped. Unreadable and oversized files are ignored without failing the request.
- Results use locale-independent ordering. Open documents override scanned file contents so unsaved edits are reflected in results.
- Symbols are the verified declarations from document outlines, flattened with container names and revealed using their exact name ranges.
- Queries use relaxed, case-insensitive subsequence matching. Empty queries return all symbols up to the result limit.
- No cross-file module graph, symbol resolution or `workspaceSymbol/resolve` support is claimed.

## Semantic tokens policy

- Tokens are emitted only when a symbol resolves through the semantic model or a mini-notation token is produced by the pinned 1.2.6 lexer.
- Declared user symbols carry the `declaration` modifier; catalog globals and pattern methods carry `defaultLibrary`.
- The advertised legend contains only `function`, `method`, `variable`, `parameter`, `number` and `operator`, with `declaration` and `defaultLibrary` modifiers.
- Unresolved identifiers, syntax errors, ordinary mini-notation steps, unknown characters and stale ranges produce no semantic token.
- Full-document requests are supported; range requests and incremental token deltas are not advertised.

## Formatting policy

- `textDocument/formatting` rewrites only leading indentation of statements, statement-position comments and block braces identified by the syntax tree.
- `tabSize` and `insertSpaces` are read from standard LSP formatting options, with two spaces as the fallback and `tabSize` constrained to 1–8.
- No code token, line break, trailing whitespace, string or template content, multi-line comment body or expression continuation is changed.
- Documents with syntax errors receive no edits, so incomplete live-coding input is never reshaped mid-edit.
- Range formatting, on-type formatting and expression reflow are not advertised.

## Configuration

The published `0.1.0` package has no custom settings. The published `0.2.0` release adds a narrow diagnostics configuration; defaults remain identical to `0.1.0`.

When a client advertises `workspace.configuration`, the server requests the `strudelLsp` section through `workspace/configuration`. The supported value is:

```json
{
  "diagnostics": {
    "enabled": true,
    "severity": {
      "unknown-global": "warning",
      "empty-group": "off"
    }
  }
}
```

When the client advertises `workspace.configuration`, the server also re-queries the `strudelLsp` section on a configuration notification. When the client does not advertise that capability, `workspace/didChangeConfiguration` may instead deliver the same object under `settings.strudelLsp`. Settings semantics:

- `diagnostics.enabled` is a boolean and defaults to `true`.
- `diagnostics.severity` optionally maps `syntax-error`, `unknown-global`, `unknown-pattern-method`, `empty-group`, `unmatched-close`, `mismatched-close` and `empty-step` to `error`, `warning`, `information`, `hint` or `off`.
- Omitted or invalid values retain provider-defined severities. `off` suppresses the diagnostic, and enabled quick fixes are derived from the resulting diagnostics so they disappear with suppression.
- Changes are applied to all open documents and diagnostics are republished. Without a configuration-capable client, defaults apply unless the client sends a settings notification.

Formatting preferences are still supplied by the client's standard LSP `tabSize` and `insertSpaces` options; two spaces are the fallback when omitted. No custom formatting setting exists. Language metadata remains pinned to the committed Strudel snapshot; compatibility/version selection is deferred until multiple metadata snapshots are supported.

Editor-specific settings remain outside the server package. Internal engine settings are not exposed. ADR-034 records the original first-release deferral, and ADR-052 records the narrow diagnostics extension.

## Implementation status

Implemented and advertised in `initialize`:

- `textDocumentSync: Incremental` with an incremental text document store.
- `completionProvider` with the `.` trigger character.
- `codeActionProvider` with the `quickfix` and `refactor.inline` kinds and `resolveProvider: false`.
- `hoverProvider`, `definitionProvider` and `referencesProvider`.
- `documentSymbolProvider` for `textDocument/documentSymbol` and `workspaceSymbolProvider` for `workspace/symbol`; no resolve support is claimed.
- `documentFormattingProvider` for `textDocument/formatting`; no range or on-type formatting is claimed.
- `semanticTokensProvider` with the exact legend and `full: true`; no range or delta provider is claimed.
- `renameProvider` with `prepareProvider: true` for `textDocument/prepareRename` and `textDocument/rename`.
- `signatureHelpProvider` with `(` and `,` trigger characters.
- Push diagnostics through `textDocument/publishDiagnostics`; no pull-diagnostic capability is claimed.

Verification evidence:

- `npm run test:features`: thirty-one provider tests cover conservative diagnostics, malformed input, diagnostics configuration remapping and suppression, quick-fix edits, range filtering and configuration, inline-constant refactoring and unsafe-binding rejection, position-aware completion, hover content, resolved-symbol navigation, document-symbol ranges and hierarchy, workspace-symbol matching, container names and result limits, formatting indentation and preferences, rename preparation and edits, semantic-token classification, signature help, mini-notation diagnostics and hover, and incremental range shifting.
- `npm run test:configuration`: four isolated tests cover missing and invalid settings, both LSP delivery shapes, severity remapping, suppression and global disablement.
- `npm run test:lsp`: three isolated filesystem tests cover deterministic ordering, symlink and traversal rejection, depth and file-size limits, unreadable paths and cancellation.
- `npm run test:mini`: five isolated token-model tests cover documented operators, token descriptions, structural faults, expected-closer metadata, live-coding suppression and unsupported-character progress.
- `npm run test:protocol`: nine raw stdio tests cover framed stdout purity, malformed JSON-RPC bodies and envelopes, unknown methods, invalid parameters, `$/cancelRequest` during a workspace scan, stale-edit suppression and document closure, no-workspace and multi-root initialization, unchanged defaults without a configuration capability, settings-notification changes, and shutdown/exit codes.
- `npm run test:soak`: one bounded lifecycle test runs three cycles of 64 rapid edits, checks transport purity, final document state and clean shutdown, and reports RSS growth as advisory evidence with no production telemetry.
- `npm run smoke:clients`: local VS Code and Neovim clients exercise initialize/capabilities, diagnostics, completion, document symbols, `didChange` synchronization and shutdown over stdio; `validation/client-smoke.json` records both passing runs, with all client configuration outside the server core (ADR-058).
- `npm test`: 87 tests in the current tree include the three stdio integration tests that verify capability advertisement, all twelve implemented request types, diagnostic publication, workspace configuration and dynamic republishing, quick-fix and inline-refactor code-action mapping, document-symbol and workspace-symbol, formatting, semantic-token and rename mapping, workspace file scanning with open-document overrides, document closure and rapid-edit version suppression, the nine protocol robustness tests, the one bounded soak/lifecycle test, the three LSP filesystem regression tests, plus seven package/manifest, advisory-benchmark, client-smoke, Phase 15 release-evidence and ADR-062 publication-state contract checks.

## Protocol lifecycle behaviour

- Stdout is reserved for framed JSON-RPC messages; diagnostic text and unexpected input are reported through `window/logMessage` notifications or ignored, never as raw stdout output.
- Malformed JSON bodies are ignored and malformed envelopes receive a framed log notification. Unknown methods return `-32601`, and handler failures return an empty typed fallback without stopping the server.
- Optional `initialize` fields are validated. `workspace/workspaceFolders` is queried only when the client advertised that capability; otherwise workspace symbol discovery uses the initialized roots or returns no results.
- A lower document version that arrives after a newer version is not scheduled for analysis. Closing a document cancels pending analysis and clears published diagnostics.
- `shutdown` followed by `exit` exits with code 0; `exit` without `shutdown` exits with code 1, matching the LSP lifecycle.
- The bounded soak suite published in `0.2.0` repeats the clean lifecycle after rapid edits and stale versions, reporting RSS growth as advisory evidence without adding production telemetry (ADR-056).

Deferred: completion resolution, range formatting, broader refactoring, Strudel compatibility/version selection and remaining extended capabilities. The published `0.1.0` has no custom configuration; the `0.2.0` diagnostics settings are documented in ADR-052, while internal engine settings remain unexposed under ADR-034.
