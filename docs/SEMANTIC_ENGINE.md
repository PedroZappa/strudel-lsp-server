# Semantic Engine

Status: Phase 4 model and Phase 5 database-backed catalog implemented on 2026-11-27. The model is deliberately limited and is not connected to LSP feature providers yet.

Authority: `AGENTS.md` sections 3 and 5.

## Purpose

The semantic engine turns the syntax representation into a Strudel-specific model that language features can query. It resolves symbols, scopes, references and types without depending on Tree-sitter APIs.

## Inputs and boundary

- Input: `SyntaxDocument` from the syntax adapter, plus document version.
- Side input: `SemanticCatalog`, an injected metadata lookup interface. Phase 5 provides a database-backed adapter with generated, manual and optional runtime-derived entries.
- Output: parser-independent `SemanticDocument` for a document version.
- Non-goal: a complete JavaScript/TypeScript type checker.

The semantic engine imports only the stable syntax contract and never imports Tree-sitter, its node types or its query APIs. Semantic tests hand-build `SyntaxDocument` fixtures and do not use the parser adapter.

## Implemented model

### Symbols and scopes

`SemanticDocument` exposes immutable maps of scopes and symbols, plus ordered references and mini-notation argument contexts.

Symbol kinds:

- `variable` — user variables and top-level assignments.
- `function` — user-defined functions.
- `parameter` — function and arrow-function parameters.
- `import` — imported local bindings.
- `builtin` — globally provided Strudel functions resolved through the catalog.
- `method` — chainable pattern methods resolved through the catalog.
- `sample` — reserved for catalog-provided sample identifiers.

Scopes are `global`, `function` or `block` and record bindings, parent relationships, child scopes and exact source ranges. References link use sites to resolved declarations or known builtins; unresolved references are represented explicitly rather than treated as errors.

### Type model

The current discriminated union is:

- `Pattern` — value produced by known pattern constructors and pattern methods.
- `PatternMethod` — callable member available on a pattern result, with a recorded return type.
- `MiniNotationPattern` — pattern inferred from a string in a catalog-declared mini-notation argument.
- `Function` — user function or global callable, with a recorded return type.
- `Number`, `String`, `Boolean`, `Array`, `Object` — basic argument/result shapes.
- `SampleName` — reserved for known sample identifiers.
- `Unknown` — explicit uncertainty, not an error by itself.

Inference covers variable initializers, imported bindings, user functions and parameters, calls to catalog globals, chained pattern methods, literal shapes, simple binary/conditional expressions and explicit returns. Unknown JavaScript constructs remain `Unknown` instead of producing speculative diagnostics.

Mini-notation is currently a flattened context model: a catalog entry declares which call arguments accept mini-notation, and the engine records the string range, owner name and `MiniNotationPattern` inference. A dedicated mini-notation submodel and token-level analysis remain Phase 6 work.

## Incrementality

- Analysis results are versioned by the `SemanticDocument` produced for a syntax version.
- The engine keeps a `WeakMap` from a previous semantic document to its analysis cache.
- Top-level statements are keyed by a stable content hash and occurrence. Unchanged statements are reused with shifted ranges after edits.
- Global declarations form a signature. When that signature changes, analysis falls back to a conservative full rebuild so type changes do not leave stale references.
- Cancellation tokens are checked before analysis, at statement boundaries and during expression inference. Cancellation throws `SemanticAnalysisCancelledError`; no cancelled snapshot is cached.
- Published semantic documents contain fresh arrays and maps and are not mutated by later analysis.

## Live-coding behaviour

- Incomplete calls, partial chains, error nodes and missing syntax are traversed defensively and do not crash analysis.
- Unresolved names stay unresolved in the model; presentation rules belong to later feature providers.
- Cascading diagnostics are avoided because Phase 4 produces no diagnostics.
- Exact source ranges are preserved from the syntax layer and shifted correctly for reused statements.

## Diagnostics inputs

The engine exposes semantic facts only. Feature providers will decide which facts become diagnostics and when context is insufficient. Likely categories include unknown identifiers in Strudel-specific contexts, invalid pattern method use, malformed mini-notation and invalid sample identifiers.

## Current limitations

- Feature providers do not yet construct the default database-backed catalog for LSP requests.
- Sample names are not resolved from string contents because no authoritative sample-name source is available in the pinned metadata set.
- Function return inference handles explicit returns but does not infer parameter types from usage.
- Incremental reuse is statement-level, not sub-expression-level.
- No LSP document store, diagnostics, completion or navigation consumes the model yet.

## Open questions

- How imports and REPL-style global injections should be selected per document or workspace.
- Whether mini-notation receives a dedicated semantic submodel or a flattened token model.
- Which generated parameter shapes should become full callable signatures.
- How version-specific metadata is selected per document or workspace.
- What invalidation granularity gives the best measured responsiveness.
