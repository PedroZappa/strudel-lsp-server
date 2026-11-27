# LSP Features

Status: Phase 6 capabilities, signature help, conservative token-level mini-notation analysis, Phase 7 quick fixes, rename, document symbols, semantic tokens, formatting and inline-constant refactoring implemented and verified; remaining candidates are tracked below.

Authority: `AGENTS.md` sections 4 and 5.

## Evaluation policy

Capabilities are evaluated for usefulness, correctness, dependencies and maintenance cost. A capability is advertised in `initialize` only when implemented and verified. Prototype handlers are not carried forward merely because they exist.

Current prototype facts, for transition context only:

- `initialize` advertises only incremental text sync and completion.
- Diagnostics are naive whole-text bracket counting.
- Completion returns the full hardcoded function/sample list regardless of position.
- Hover matches the first word of a line rather than the token at the cursor.
- Definition returns `null` and references returns `[]`.
- Some handlers are registered but not advertised as capabilities.

None of this behaviour is treated as a specification.

## Capability matrix

| Capability                         | Status          | Proposed phase  | Notes                                                                                    |
| ---------------------------------- | --------------- | --------------- | ---------------------------------------------------------------------------------------- |
| Diagnostics                        | Implemented     | Early           | Conservative syntax warnings and unknown-call/method information; see policy.            |
| Quick fixes                        | Implemented     | Extended        | Safe mini-notation edits only; no fixes for speculative or unknown-name issues.          |
| Completion                         | Implemented     | Early           | Position-aware globals, locals and Pattern methods; `.` trigger.                         |
| Completion resolution              | Not implemented | With completion | Only if additional lazy metadata adds real value.                                        |
| Hover documentation                | Implemented     | Early           | Database descriptions, examples and inferred types.                                      |
| Signature help                     | Implemented     | Early           | Database-backed globals and methods; `(`, `,` triggers and active parameter.             |
| Go to definition                   | Implemented     | Early           | Resolved user and local symbols; builtins have no source declaration.                    |
| References                         | Implemented     | Early           | Resolved references plus optional declarations.                                          |
| Rename                             | Implemented     | Extended        | Document-scoped user symbols only; prepare and invalid-name checks are implemented.      |
| Document symbols                   | Implemented     | Extended        | Declared user symbols from the current semantic snapshot with exact selection ranges.    |
| Workspace symbols                  | Deferred        | Deferred        | No workspace index exists; open-document-only search would be incomplete.                |
| Semantic tokens                    | Implemented     | Extended        | Verified symbols and mini-notation tokens only; no unresolved-name guessing.             |
| Formatting                         | Implemented     | Extended        | Conservative indentation only; preferences come from standard LSP formatting options.    |
| Refactoring and other code actions | Implemented     | Extended        | Narrow `refactor.inline` for single-use literal constants; broader actions are deferred. |
| Folding ranges                     | Deferred        | Deferred        | Evaluate after core language intelligence is reliable.                                   |
| Selection ranges                   | Deferred        | Deferred        | Evaluate editor benefit against implementation cost.                                     |
| Inlay hints                        | Deferred        | Deferred        | Evaluate only with concrete, non-noisy use cases.                                        |
| Call hierarchy                     | Deferred        | Deferred        | Depends on robust cross-reference semantics.                                             |
| Mini-notation-aware analysis       | Implemented     | Early           | Parser-independent tokens; conservative structural warnings and operator hover.          |

Priorities are proposed by phase in `docs/ROADMAP.md` and remain subject to approval once licensing and metadata sources are resolved.

## Diagnostics policy

- Prefer useful, resilient diagnostics over aggressive reporting.
- Recover from incomplete or malformed source wherever possible.
- Never crash because a document is temporarily syntactically invalid.
- Avoid cascading diagnostics from one upstream error or incomplete context.
- Delay or suppress diagnostics when a reliable conclusion is not possible.
- Distinguish errors, warnings and informational diagnostics.
- Provide accurate source ranges and actionable messages.
- Reanalyse documents as they change without unnecessary recomputation.

Current implementation: outermost non-empty syntax error nodes produce warnings; missing nodes and speculative semantic conclusions are suppressed. Unknown calls and pattern methods produce informational diagnostics only when the syntax tree is clean. Unresolved value references are intentionally not reported because runtime globals may be injected outside the document. Mini-notation reports empty groups, unmatched or mismatched closers and missing steps at the start of or between `,` or `|` separators; unclosed groups, trailing separators, other trailing operators and unsupported characters are not reported during live editing.

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
- Workspace symbols remain deferred until a workspace index and cross-file module graph exist.

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

Configuration stays narrow and user-facing:

- Diagnostic enablement and severity.
- Formatting preferences are supplied by the client's standard LSP `tabSize` and `insertSpaces` options; no custom setting exists yet.
- Strudel compatibility/version selection.

Internal engine settings are not exposed without a concrete user-facing requirement.

## Implementation status

Implemented and advertised in `initialize`:

- `textDocumentSync: Incremental` with an incremental text document store.
- `completionProvider` with the `.` trigger character.
- `codeActionProvider` with the `quickfix` and `refactor.inline` kinds and `resolveProvider: false`.
- `hoverProvider`, `definitionProvider` and `referencesProvider`.
- `documentSymbolProvider` for `textDocument/documentSymbol`; no workspace-symbol capability is claimed.
- `documentFormattingProvider` for `textDocument/formatting`; no range or on-type formatting is claimed.
- `semanticTokensProvider` with the exact legend and `full: true`; no range or delta provider is claimed.
- `renameProvider` with `prepareProvider: true` for `textDocument/prepareRename` and `textDocument/rename`.
- `signatureHelpProvider` with `(` and `,` trigger characters.
- Push diagnostics through `textDocument/publishDiagnostics`; no pull-diagnostic capability is claimed.

Verification evidence:

- `npm run test:features`: twenty-six provider tests cover conservative diagnostics, malformed input, quick-fix edits and range filtering, inline-constant refactoring and unsafe-binding rejection, position-aware completion, hover content, resolved-symbol navigation, document-symbol ranges and hierarchy, formatting indentation and preferences, rename preparation and edits, semantic-token classification, signature help, mini-notation diagnostics and hover, and incremental range shifting.
- `npm run test:mini`: five isolated token-model tests cover documented operators, token descriptions, structural faults, expected-closer metadata, live-coding suppression and unsupported-character progress.
- `npm test`: 50 tests include a stdio integration test that verifies capability advertisement, all eleven implemented request types, diagnostic publication, quick-fix and inline-refactor code-action mapping, document-symbol, formatting, semantic-token and rename mapping, document closure and rapid-edit version suppression, plus one test-script discovery regression check.

Deferred: completion resolution, workspace symbols, range formatting, broader refactoring and remaining extended capabilities. Custom user-facing configuration for diagnostics and Strudel version selection is not exposed yet.
