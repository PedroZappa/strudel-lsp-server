# LSP Features

Status: Phase 6 capabilities, signature help, conservative token-level mini-notation analysis, Phase 7 quick fixes, rename, document and workspace symbols, semantic tokens, formatting and inline-constant refactoring implemented and verified. The published `0.2.0` release adds focused diagnostics configuration (ADR-052), hardened workspace-symbol filesystem discovery (ADR-053), clean consumer-install verification with `.npmrc` removal and hermetic package verification (ADR-054/055), a bounded soak/lifecycle suite (ADR-056), a separate advisory installed-binary benchmark (ADR-057), and two independent editor-client smoke runs (ADR-058). `0.1.0` remains available. The published `0.2.0` release gate had 86 tests; the tree had 87 after ADR-062, 90 after the Phase 17 documentation-contract tests, 93 after the Phase 18 compatibility-contract tests and 94 after the Phase 19 exact-authorization test and 95 after the post-publication evidence-contract test. ADR-063 classifies the stable v1 baseline, known limitations, additive candidates and standing non-goals, ADR-064 records the package and support readiness decisions, ADR-065 records the compatibility closure, ADR-066 authorizes the exact `0.3.0` controlled publication, and ADR-067 records its publication and smoke evidence. Phase 20 adds unambiguous alias resolution, metadata-gated sample references, conservative parameter inference and overload-capable curated signatures under ADR-068, with the gate raised to 103/103. Phase 21 adds a Strudel-owned mini-notation recovery AST with structured hover and exact operator completion under ADR-069; capabilities and diagnostic codes remain unchanged and the gate is 110/110. Phase 22 published `0.4.0` with 113 verified tests and unchanged capabilities. Phase 23 adds folding ranges, selection ranges, opt-in type inlay hints, completion resolution, range formatting, call hierarchy, `workspaceSymbol/resolve`, conservative extract refactoring and bounded cross-file navigation under ADR-073 and is committed as `46b2cd7`. Phase 24 adds real-corpus benchmarks, incremental semantic reuse and opt-in local timing under ADR-074 and is committed as `0f30fe5`; its gate was 144/144. The Phase 25 contract test raises the current gate to 145/145. `0.5.0` was published through the controlled OIDC workflow from `51f2aa5` with ADR-075 authorization and ADR-076 evidence, including registry identity, SLSA v1 provenance, a clean public-registry install and the installed stdio handshake. Phase 23 capabilities are therefore published in `0.5.0`, while Phase 24 changes are internal. Remaining candidates are tracked below.

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

| Capability                         | Status                 | Proposed phase | Notes                                                                                                                                                                 |
| ---------------------------------- | ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostics                        | Implemented            | Early          | Conservative syntax warnings and unknown-call/method information; focused settings are published in `0.2.0`.                                                          |
| Quick fixes                        | Implemented            | Extended       | Safe mini-notation edits only; no fixes for speculative or unknown-name issues.                                                                                       |
| Completion                         | Implemented            | Early          | Position-aware globals, locals and Pattern methods; `.` trigger; pinned mini-notation operators when the cursor is on an operator token.                              |
| Completion resolution              | Implemented (0.5.0)    | Phase 23       | Lazily adds signature, parameter and source documentation from the pinned snapshot using a validated versioned token.                                                 |
| Hover documentation                | Implemented            | Early          | Database descriptions, examples and inferred types.                                                                                                                   |
| Signature help                     | Implemented            | Early          | Database-backed globals and methods; overload-capable curated signatures and inferred user signatures with `activeSignature`; `(`, `,` triggers and active parameter. |
| Go to definition                   | Implemented (extended) | Early/Phase 23 | Resolved user and local symbols; `0.5.0` also resolves explicit relative `.strudel` imports through the bounded workspace scan. Builtins have no source declaration.  |
| References                         | Implemented (extended) | Early/Phase 23 | Resolved references plus optional declarations; `0.5.0` cross-file references require explicit imports and verified exported declarations.                            |
| Rename                             | Implemented            | Extended       | Document-scoped user symbols only; prepare and invalid-name checks are implemented.                                                                                   |
| Document symbols                   | Implemented            | Extended       | Declared user symbols from the current semantic snapshot with exact selection ranges.                                                                                 |
| Workspace symbols                  | Implemented (extended) | Extended/23    | Bounded on-demand folder scan with open-document overrides; `0.5.0` lazy `location.range` resolution is gated on client `workspace.symbol.resolveSupport`.            |
| Semantic tokens                    | Implemented            | Extended       | Verified symbols and mini-notation tokens only; no unresolved-name guessing.                                                                                          |
| Formatting                         | Implemented (extended) | Extended/23    | Conservative indentation only; `0.5.0` adds range formatting by filtering the same full-document edits.                                                               |
| Refactoring and other code actions | Implemented (extended) | Extended/23    | `refactor.inline` for single-use literal constants; `0.5.0` `refactor.extract` for a verified numeric literal with an unused generated name.                          |
| Folding ranges                     | Implemented (0.5.0)    | Phase 23       | Deterministic regions from verified multi-line syntax nodes; incomplete documents produce no ranges.                                                                  |
| Selection ranges                   | Implemented (0.5.0)    | Phase 23       | Leaf-to-root chains from syntax nodes containing each requested position, including recovery boundaries with extent.                                                  |
| Inlay hints                        | Implemented (0.5.0)    | Phase 23       | Opt-in `strudelLsp.inlayHints.enabled`; type hints only for resolved symbols with known Strudel types.                                                                |
| Call hierarchy                     | Implemented (0.5.0)    | Phase 23       | Prepare and incoming/outgoing edges only for verified user function declarations and resolved calls; versioned item tokens reject stale or malformed inputs.          |
| Mini-notation-aware analysis       | Implemented            | Early          | Parser-independent tokens plus an additive recovery AST; conservative structural warnings, structured hover and exact-range operator completion.                      |

Status labels describe the published `0.5.0` tree; features marked `0.5.0` were not part of published `0.4.0`. Priorities are proposed by phase in `docs/ROADMAP.md` and remain subject to approval. The parser redistribution licence decision is recorded in ADR-032, and the pinned metadata snapshot is documented in `docs/PARSER_INTEGRATION.md`.

## v1 contract classification

ADR-063 establishes the initial v1 contract. Phase 26 freezes the final capability matrix after the proposed feature-expanded phases; until then, these categories distinguish what users can rely on from what is still planned.

- **Stable contract baseline:** the `strudel-lsp-server` npm package and executable, stdio LSP transport, Node `^24.0.0 || ^26.0.0` with npm `>=11 <12`, supported Linux x64/macOS arm64/Windows x64 matrix, the capability matrix extended in `0.5.0`, the `strudelLsp.diagnostics` settings shape and seven diagnostic codes, and the pinned parser/metadata snapshot. ADR-064 retains the npm allowlist of compiled `dist/src` outputs and `LICENSE`; ADR-065 confirms the Strudel `1.2.6` language snapshot and supported platform matrix. Phase 23 additions were released in Phase 25 and do not change this baseline. Changes to these items follow the SemVer rules in ADR-063 and the update policy in ADR-065.
- **Known limitations:** unresolved value references are conservatively not reported, generated signatures without curated data remain flat JSDoc parameter lists, sample names resolve only when explicit catalog metadata is supplied, mini-notation analysis combines a pinned lexer with a recovery-oriented syntax tree rather than compiling or evaluating Strudel patterns, workspace navigation has no persistent index or file watcher, the two upstream grammar gaps for `%` modulo in JavaScript expressions and `//` inside strings are formally accepted for the pinned parser under ADR-065, and performance evidence is advisory without an editor-latency SLA. Phase 23 keeps further boundaries: inlay hints require explicit opt-in and never infer unknown types; completion and workspace-symbol resolution enrich or reveal only data from validated tokens; cross-file navigation requires explicit relative imports and scanned, exported declarations; call hierarchy is document-local; and range formatting reuses indentation-only edits. These are documented limitations, not unimplemented capabilities claimed as stable. ADR-077 plans sample-aware completion for Phase 26; until it is implemented and frozen, the sample-name limitation above remains current.
- **Additive candidates:** Phases 20, 21, 23 and 24 have implemented semantic depth, structured mini-notation analysis, editor ergonomics/navigation, real-corpus workloads and incremental semantic reuse under ADR-068, ADR-069, ADR-073 and ADR-074; they become stable only when released and included in the Phase 26 freeze. Rows marked `0.5.0` above describe the published release rather than `0.4.0`; the earlier blanket deferral of folding, selection ranges, inlay hints and call hierarchy is superseded by implemented Phase 23 work. Phase 24 changes are internal rather than new LSP capabilities, and performance thresholds remain advisory under ADR-074.
- **Planned v1 additions (not implemented):** ADR-077 amends Phase 26 with context-aware mini-notation step completion and hover sourced first from literal `samples({...})` keys, relative `.strudel` import-path completion, deprecation metadata in completion and hover, and conditional `documentHighlight`. These are planning targets, not advertised capabilities and not part of `0.5.0`; they enter the frozen matrix only after implementation, tests and Phase 26 acceptance. Post-v1 candidates and standing non-goals are recorded in `docs/ROADMAP.md` under ADR-077.
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

## Mini-notation policy

- The pinned lexer remains the source of token ranges, descriptions and the four stable structural diagnostic codes.
- The additive AST supplies group nesting, operator targets and explicit `empty`, `incomplete`, `error` and `unknown` states without introducing a new capability or diagnostic.
- Hover uses the smallest AST node or token at the cursor; delimiter hovers report the exact delimiter text rather than the enclosing group.
- Completion is offered only on a pinned operator token, replaces that exact range and never turns a mini-notation step into a JavaScript identifier completion.
- Signature help remains host-call scoped because the pinned mini grammar defines no call signatures; the existing `s(...)` signature is still available inside a mini argument.
- Pitch, sample identity, velocity, random outcomes and the experimental haskellish layer are not inferred from mini-notation strings.

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
- `0.5.0` `refactor.extract` applies only to an exact numeric literal node inside an expression, variable-declaration or return statement. Literals inside imports, exports, assignments, strings and templates are skipped.
- The generated constant name starts at `extracted` and uses a bounded numeric suffix if needed; a name is used only when no symbol, reference or source-text occurrence exists.
- Extracted edits insert a `const` declaration before the containing statement and replace only the verified literal, preserving indentation and all other text.
- Other refactorings remain deferred until they have a concrete usefulness and safety case.

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
- Every result carries an opaque token containing the metadata version, name, kind and exact reveal range. No file is reopened during resolution.
- When the client advertises `workspace.symbol.resolveSupport.properties` containing `location.range`, initial results omit that range and `workspaceSymbol/resolve` restores it only from a valid current token. Other clients keep complete ranges.
- Stale, malformed or mismatched tokens return the original item unchanged. No cross-file module graph or symbol resolution is claimed.

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
- `0.5.0` range formatting runs the same analysis and returns only edits whose target line lies inside the requested range; an end position at character zero excludes that boundary line.
- On-type formatting and expression reflow remain unadvertised.

## Structural editor navigation policy

- Folding ranges come from verified multi-line syntax nodes such as blocks, arrays, objects, arguments, comments, imports and declarations; duplicate start/end pairs are removed and results are sorted by line.
- Folding documents with syntax errors return no ranges, so partial live-coding input is not given misleading boundaries.
- Selection ranges form one leaf-to-root chain per position using parsed nodes that contain the requested offset; whitespace-only tokens and zero-width nodes are skipped.
- Parser recovery nodes are retained when they have extent, because partially typed input can still provide useful selection boundaries.
- LSP positions are converted back to clamped UTF-16 offsets so non-ASCII text and CRLF line endings preserve correct boundaries.

## Inlay hint policy

- Hints are disabled by default and require `strudelLsp.inlayHints.enabled: true`.
- Only resolved variable, parameter, function and import references with a non-`Unknown` Strudel type produce `: <type>` hints; unresolved names, assignments and stale token text are skipped.
- Hints are placed at the reference end, labelled as `Type`, padded on the right, sorted by position, and deduplicated by end coordinate.
- A server-side refresh is requested when the setting changes and the client advertises `workspace.inlayHint.refreshSupport`.

## Completion and workspace-symbol resolution policy

- Catalog completion candidates carry a frozen token with the pinned catalog version, record kind and name.
- `completionItem/resolve` enriches a candidate only when the token matches the item name and current snapshot; it adds a signature, documented parameters, JSDoc text and alias provenance when present.
- A mismatched, stale or malformed token returns the original completion item without enrichment. Local variables, mini-notation operators and other non-catalog candidates carry no token.
- `workspaceSymbol/resolve` is limited to the withheld exact `location.range`; it does not add documentation, perform file access or accept a client-supplied path.

## Call hierarchy policy

- Preparation is offered only at a verified user function declaration in a syntax-clean document; catalog symbols, variables and unresolved names produce no item.
- Each item carries a frozen token containing semantic version, URI, symbol id and name. Incoming and outgoing calls reject stale or malformed tokens before analysis.
- Incoming edges use resolved call references whose enclosing verified function is the caller. Outgoing edges use resolved calls in the target function's scope tree.
- Catalog-only calls and unresolved references never invent edges; malformed documents return no hierarchy data.

## Cross-file navigation policy

- Definition and references consult cross-file data only when the current document contains an explicit `import ` token, then use only the existing bounded workspace-scan contexts.
- Import specifiers must be relative, end in `.strudel`, contain no NUL and have no URL scheme or absolute path; the resolved target must be among the supplied contexts.
- A cross-file target must be an exported variable or function whose declaration text still matches the recorded name.
- References merge only verified imports of that same exported symbol and resolved references in scanned contexts; similarly named but unresolved symbols are never merged.
- The provider performs no filesystem access of its own, maintains no persistent index, and remains cancellable through the existing request token.

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
  },
  "inlayHints": {
    "enabled": true
  }
}
```

`inlayHints` is a `0.5.0` addition; published `0.4.0` ignores it.

When the client advertises `workspace.configuration`, the server also re-queries the `strudelLsp` section on a configuration notification. When the client does not advertise that capability, `workspace/didChangeConfiguration` may instead deliver the same object under `settings.strudelLsp`. Settings semantics:

- `diagnostics.enabled` is a boolean and defaults to `true`.
- `diagnostics.severity` optionally maps `syntax-error`, `unknown-global`, `unknown-pattern-method`, `empty-group`, `unmatched-close`, `mismatched-close` and `empty-step` to `error`, `warning`, `information`, `hint` or `off`.
- Omitted or invalid values retain provider-defined severities. `off` suppresses the diagnostic, and enabled quick fixes are derived from the resulting diagnostics so they disappear with suppression.
- `inlayHints.enabled` is a boolean and defaults to `false`; missing or invalid values retain the disabled default.
- Changes are applied to all open documents and diagnostics are republished. A change to the inlay-hint setting also requests a hint refresh when the client supports it. Without a configuration-capable client, defaults apply unless the client sends a settings notification.

Formatting preferences are still supplied by the client's standard LSP `tabSize` and `insertSpaces` options; two spaces are the fallback when omitted. No custom formatting setting exists. Language metadata remains pinned to the committed Strudel snapshot; compatibility/version selection is deferred until multiple metadata snapshots are supported.

Editor-specific settings remain outside the server package. Internal engine settings are not exposed. ADR-034 records the original first-release deferral, and ADR-052 records the narrow diagnostics extension.

## Implementation status

Implemented and advertised in `initialize` in the current tree:

- `textDocumentSync: Incremental` with an incremental text document store.
- `completionProvider` with the `.` trigger character and `resolveProvider: true`.
- `codeActionProvider` with `quickfix`, `refactor.inline` and `0.5.0` `refactor.extract` kinds and `resolveProvider: false`.
- `hoverProvider`, `definitionProvider` and `referencesProvider`, including bounded cross-file import resolution in `0.5.0`.
- `callHierarchyProvider` for prepare, incoming calls and outgoing calls in `0.5.0`.
- `documentSymbolProvider` and `workspaceSymbolProvider` with `resolveProvider: true`; lazy range withholding is enabled only for clients that advertise partial-range support.
- `documentFormattingProvider` and `0.5.0` `documentRangeFormattingProvider`; no on-type formatting is claimed.
- `foldingRangeProvider` and `selectionRangeProvider` in `0.5.0`.
- `inlayHintProvider` in `0.5.0`; requests return no hints unless `strudelLsp.inlayHints.enabled` is true.
- `semanticTokensProvider` with the exact legend and `full: true`; no range or delta provider is claimed.
- `renameProvider` with `prepareProvider: true` for `textDocument/prepareRename` and `textDocument/rename`.
- `signatureHelpProvider` with `(` and `,` trigger characters.
- Push diagnostics through `textDocument/publishDiagnostics`; no pull-diagnostic capability is claimed.

Verification evidence:

- `npm run test:features`: 51 provider tests cover the established diagnostics, quick-fix, completion, hover, signature, navigation, symbol, formatting, rename, semantic-token and mini-notation behaviour plus folding boundaries, leaf-to-root selection chains, opt-in type hints, conservative extract refactoring, validated completion/workspace-symbol resolution, call hierarchy and bounded cross-file navigation.
- `npm run test:configuration`: six isolated tests cover diagnostics defaults and delivery shapes plus inlay-hint opt-in, invalid-value fallback and both settings shapes.
- `npm run test:lsp`: seven isolated filesystem tests cover deterministic ordering, symlinks, traversal, size/depth limits, unreadable paths, cancellation and cross-file navigation safety.
- `npm run test:parser`: six parser-integration tests include UTF-16 position-to-offset clamping used by structural providers.
- `npm run test:mini`: nine isolated tests cover documented operators, token descriptions, structural faults, recovery AST behaviour and live-coding suppression.
- `npm run test:protocol`: eleven raw stdio tests cover framed stdout purity, malformed input, unknown methods, stale completion/workspace-symbol tokens, negative capability assertions, incomplete live-coding requests, workspace-boundary checks, cancellation, configuration changes and shutdown/exit codes.
- `npm run test:soak`: one bounded lifecycle test runs three cycles of 64 rapid edits, checks transport purity, final document state and clean shutdown, and reports RSS growth as advisory evidence with no production telemetry.
- `npm run smoke:clients`: the committed `validation/client-smoke.json` records historical VS Code and Neovim runs with configuration outside the server core (ADR-058); it was not rerun for the Phase 23 tree on this Linux runner; the historical VS Code evidence remains authoritative.
- `npm test`: 140 tests in the current tree, including stdio integration assertions for every advertised capability, negative assertions for unadvertised capabilities, resolve-token lifecycle regressions, live-coding requests, workspace bounds, and the focused suites above.

## Protocol lifecycle behaviour

- Stdout is reserved for framed JSON-RPC messages; diagnostic text and unexpected input are reported through `window/logMessage` notifications or ignored, never as raw stdout output.
- Malformed JSON bodies are ignored and malformed envelopes receive a framed log notification. Unknown methods return `-32601`, and handler failures return an empty typed fallback without stopping the server.
- Optional `initialize` fields are validated. `workspace/workspaceFolders` is queried only when the client advertised that capability; otherwise workspace symbol discovery uses the initialized roots or returns no results.
- A lower document version that arrives after a newer version is not scheduled for analysis. Closing a document cancels pending analysis and clears published diagnostics.
- `shutdown` followed by `exit` exits with code 0; `exit` without `shutdown` exits with code 1, matching the LSP lifecycle.
- The bounded soak suite published in `0.2.0` repeats the clean lifecycle after rapid edits and stale versions, reporting RSS growth as advisory evidence without adding production telemetry (ADR-056).

Deferred in the current tree: on-type formatting, semantic-token range and delta requests, declaration/type-definition/implementation navigation, document links, color providers, code lens, linked editing, inline values, monikers, persistent workspace indexing, Strudel compatibility/version selection and refactorings broader than the two conservative actions above. `documentHighlight` is a conditional Phase 26 goal under ADR-077 and remains unadvertised until implemented; pull diagnostics, `$:` active-pattern semantics, unknown-sample diagnostics and bounded numeric constant folding are post-v1 candidates. Negative capability assertions cover unimplemented providers. The published `0.1.0` has no custom configuration; `0.2.0` diagnostics settings are documented in ADR-052, `0.5.0` adds opt-in inlay hints under ADR-073, and internal engine settings remain unexposed under ADR-034.
