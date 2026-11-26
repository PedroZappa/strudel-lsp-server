# LSP Features

Status: planning matrix; no capability from the re-implementation exists yet.  
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

| Capability                   | Status          | Proposed phase  | Notes                                                                            |
| ---------------------------- | --------------- | --------------- | -------------------------------------------------------------------------------- |
| Diagnostics                  | Not implemented | Early           | Must be resilient, source-accurate and live-coding aware; see policy below.      |
| Quick fixes                  | Not implemented | Later           | Depends on actionable diagnostic kinds and safe edits.                           |
| Completion                   | Not implemented | Early           | Must use position, scope and Strudel metadata rather than a static list.         |
| Completion resolution        | Not implemented | With completion | Only if additional lazy metadata adds real value.                                |
| Hover documentation          | Not implemented | Early           | Requires documentation provenance in the language database.                      |
| Signature help               | Not implemented | Early           | Requires authoritative function signatures.                                      |
| Go to definition             | Not implemented | Early           | Prototype stub is not a foundation.                                              |
| References                   | Not implemented | Early           | Prototype stub is not a foundation.                                              |
| Rename                       | Not implemented | Later           | Requires reliable symbol resolution and workspace awareness.                     |
| Document symbols             | Not implemented | Later           | Requires semantic scope/symbol model.                                            |
| Workspace symbols            | Not implemented | Later           | Requires workspace indexing strategy.                                            |
| Semantic tokens              | Not implemented | Later           | Useful only if it reflects verified Strudel semantics, not generic highlighting. |
| Formatting                   | Not implemented | Later           | Needs explicit user-facing preferences and safe, deterministic edits.            |
| Code actions and refactoring | Not implemented | Later           | Scope each action by usefulness and safety.                                      |
| Folding ranges               | Deferred        | Deferred        | Evaluate after core language intelligence is reliable.                           |
| Selection ranges             | Deferred        | Deferred        | Evaluate editor benefit against implementation cost.                             |
| Inlay hints                  | Deferred        | Deferred        | Evaluate only with concrete, non-noisy use cases.                                |
| Call hierarchy               | Deferred        | Deferred        | Depends on robust cross-reference semantics.                                     |
| Mini-notation-aware analysis | Design subject  | Early           | Must be Strudel-specific; scope depends on parser integration decision.          |

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

## Configuration

Configuration stays narrow and user-facing:

- Diagnostic enablement and severity.
- Formatting preferences where formatting is implemented.
- Strudel compatibility/version selection.

Internal engine settings are not exposed without a concrete user-facing requirement.

## Implementation status

No re-implemented capability is complete. Status changes belong here together with verification evidence and any capability advertisement changes.
