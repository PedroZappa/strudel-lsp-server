# LSP Features

Status: Phase 6 capabilities, signature help, conservative token-level mini-notation analysis, Phase 7 quick fixes and rename implemented and verified; remaining candidates are tracked below.

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

| Capability                         | Status          | Proposed phase  | Notes                                                                               |
| ---------------------------------- | --------------- | --------------- | ----------------------------------------------------------------------------------- |
| Diagnostics                        | Implemented     | Early           | Conservative syntax warnings and unknown-call/method information; see policy.       |
| Quick fixes                        | Implemented     | Extended        | Safe mini-notation edits only; no fixes for speculative or unknown-name issues.     |
| Completion                         | Implemented     | Early           | Position-aware globals, locals and Pattern methods; `.` trigger.                    |
| Completion resolution              | Not implemented | With completion | Only if additional lazy metadata adds real value.                                   |
| Hover documentation                | Implemented     | Early           | Database descriptions, examples and inferred types.                                 |
| Signature help                     | Implemented     | Early           | Database-backed globals and methods; `(`, `,` triggers and active parameter.        |
| Go to definition                   | Implemented     | Early           | Resolved user and local symbols; builtins have no source declaration.               |
| References                         | Implemented     | Early           | Resolved references plus optional declarations.                                     |
| Rename                             | Implemented     | Extended        | Document-scoped user symbols only; prepare and invalid-name checks are implemented. |
| Document symbols                   | Not implemented | Later           | Semantic scope/symbol model exists; needs LSP provider and document store.          |
| Workspace symbols                  | Not implemented | Later           | Requires workspace indexing strategy.                                               |
| Semantic tokens                    | Not implemented | Later           | Useful only if it reflects verified Strudel semantics, not generic highlighting.    |
| Formatting                         | Not implemented | Later           | Needs explicit user-facing preferences and safe, deterministic edits.               |
| Refactoring and other code actions | Not implemented | Later           | Quick fixes tracked separately; broader actions need a usefulness and safety case.  |
| Folding ranges                     | Deferred        | Deferred        | Evaluate after core language intelligence is reliable.                              |
| Selection ranges                   | Deferred        | Deferred        | Evaluate editor benefit against implementation cost.                                |
| Inlay hints                        | Deferred        | Deferred        | Evaluate only with concrete, non-noisy use cases.                                   |
| Call hierarchy                     | Deferred        | Deferred        | Depends on robust cross-reference semantics.                                        |
| Mini-notation-aware analysis       | Implemented     | Early           | Parser-independent tokens; conservative structural warnings and operator hover.     |

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

## Rename policy

- Rename is document-scoped: there is no workspace index or cross-file symbol database yet.
- Only resolved variables, functions, parameters and import bindings with declarations are renamable.
- Builtins, pattern methods, unresolved names, no-op renames and documents with syntax errors are rejected.
- New names must be valid ECMAScript identifiers and must not be reserved or strict-mode reserved words.
- Every replacement range must still contain the original symbol text before an edit is returned; this prevents stale incremental ranges from being applied.
- `textDocument/prepareRename` returns the exact token range and placeholder before rename is offered.

## Configuration

Configuration stays narrow and user-facing:

- Diagnostic enablement and severity.
- Formatting preferences where formatting is implemented.
- Strudel compatibility/version selection.

Internal engine settings are not exposed without a concrete user-facing requirement.

## Implementation status

Implemented and advertised in `initialize`:

- `textDocumentSync: Incremental` with an incremental text document store.
- `completionProvider` with the `.` trigger character.
- `codeActionProvider` with only the `quickfix` kind and `resolveProvider: false`.
- `hoverProvider`, `definitionProvider` and `referencesProvider`.
- `renameProvider` with `prepareProvider: true` for `textDocument/prepareRename` and `textDocument/rename`.
- `signatureHelpProvider` with `(` and `,` trigger characters.
- Push diagnostics through `textDocument/publishDiagnostics`; no pull-diagnostic capability is claimed.

Verification evidence:

- `npm run test:features`: fourteen provider tests cover conservative diagnostics, malformed input, quick-fix edits and range filtering, position-aware completion, hover content, resolved-symbol navigation, rename preparation and edits, signature help, mini-notation diagnostics and hover, and incremental range shifting.
- `npm run test:mini`: five isolated token-model tests cover documented operators, token descriptions, structural faults, expected-closer metadata, live-coding suppression and unsupported-character progress.
- `npm test`: 37 tests include a stdio integration test that verifies capability advertisement, all eight implemented request types, diagnostic publication, code-action and rename mapping, document closure and rapid-edit version suppression.

Deferred: completion resolution, symbols, semantic tokens, formatting and remaining extended capabilities. User-facing configuration for diagnostics and Strudel version selection is not exposed yet.
