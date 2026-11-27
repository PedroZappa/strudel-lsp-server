# Semantic Engine

Status: Phase 4 model, Phase 5 database-backed catalog, Phase 6 provider integration, signature help, mini-notation token analysis and Phase 7 quick-fix inputs implemented on 2026-11-27. The model remains deliberately limited.

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

Mini-notation has a dedicated parser-independent submodel in `src/miniNotation/`. A catalog entry still declares which call arguments accept mini-notation; the engine now also scans the content of plain double-quoted literals and records ordered tokens, absolute document ranges and conservative structural issues on each `MiniNotationArgument`. Template substitutions are not analyzed because mapping nested expressions is outside this lightweight model; the pinned transpiler only converts double-quoted literals and template literals to mini notation. Mismatched closers record the expected closer, allowing the feature layer to offer a deterministic replacement without reparsing the message.

Token boundaries and semantics were validated against pinned sources: `@strudel/mini@1.2.6` `krill.pegjs` defines numbers (lines 61–94), step characters (107–110), group delimiters (113–128), slice operators (132–163), sequences and stacks (166–197), quoted mini notation (205–206) and the haskellish statement layer (210–281). `@strudel/core@1.2.6` JSDoc confirms `*` as `.fast()` (`pattern.mjs:1914`), `/` as `.slow()` (`pattern.mjs:1948`), `:` as list/sample parameters (`controls.mjs:24–31, 97–110`), `~` as silence (`pattern.mjs:1245`) and Euclidean calls (`euclid.mjs:54–69`). `@strudel/reference@1.2.2` supplies the generated JSDoc metadata; it is one minor version behind mini/core, so grammar evidence takes precedence for token boundaries. Descriptions live in `src/miniNotation/documentation.ts`; in particular `!` is replication, not velocity.

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

The engine exposes semantic facts only. Feature providers decide which facts become diagnostics, quick fixes and presentation, and suppress them when context is insufficient. Current categories include unknown identifiers in Strudel-specific contexts, invalid pattern method use and validated mini-notation structural faults; invalid sample identifiers remain unimplemented.

## Current limitations

- The LSP server constructs the default database-backed catalog; editor clients cannot yet select a Strudel metadata version per workspace.
- Sample names are not resolved from string contents because no authoritative sample-name source is available in the pinned metadata set.
- Function return inference handles explicit returns but does not infer parameter types from usage.
- Incremental reuse is statement-level, not sub-expression-level.
- Mini-notation tokenization is lexical and conservative, not a recovery parser: it does not attempt a full 1.2.6 AST or haskellish statement analysis.
- Signature labels use the flat JSDoc parameter list; overloads, optional and rest parameters, and user-defined signatures are not modeled beyond resolved symbol kinds.

## Open questions

- How imports and REPL-style global injections should be selected per document or workspace.
- Whether a future mini-notation recovery parser should replace the lexical token model.
- How optional, rest and overloaded parameters should be represented when authoritative metadata provides them.
- How version-specific metadata is selected per document or workspace.
- What invalidation granularity gives the best measured responsiveness.
