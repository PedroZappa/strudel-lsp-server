# Semantic Engine

Status: proposed design; not yet implemented.  
Authority: `AGENTS.md` sections 3 and 5.

## Purpose

The semantic engine turns the syntax representation into a Strudel-specific model that language features can query. It resolves symbols, scopes, references and types without depending on Tree-sitter APIs.

## Inputs and boundary

- Input: parser-independent syntax representation with source ranges, plus document version.
- Side input: versioned language database from `docs/ARCHITECTURE.md`.
- Output: parser-independent semantic model for a document version.
- Non-goal: a complete JavaScript/TypeScript type checker.

No Tree-sitter node type, query or API may appear in this layer’s interfaces.

## Proposed model

### Symbols and scopes

Symbol kinds to model:

- User-defined variables, functions and parameters.
- Imported or globally provided Strudel functions.
- Chainable pattern methods and their owning result kind.
- Sample/sound identifiers where the language database supplies them.
- Mini-notation tokens that need language-aware interpretation.

Each scope records bindings, parent relationships and source ranges. References link use sites to resolved declarations or known builtins.

### Type model

A limited Strudel-specific type model is sufficient initially; exact names are provisional:

- `Pattern` — value produced by pattern constructors and pattern methods.
- `PatternMethod` — callable member available on a pattern result.
- `MiniNotationPattern` — pattern produced from a mini-notation string context.
- `Number`, `String`, `Boolean`, `Array`, `Object` — basic argument/result shapes.
- `SampleName` — known sample/sound identifier, when metadata is available.
- `Unknown` — explicitly represented uncertainty, not an error by itself.

Inference focuses on call chains, argument shapes and pattern-producing functions. Unknown JavaScript constructs remain unknown rather than triggering speculative diagnostics.

## Incrementality

- Semantic state is associated with document versions.
- Document edits invalidate affected scopes and symbols.
- Reuse unchanged subgraphs where practical; avoid unnecessary whole-document recomputation.
- Requests carry cancellation tokens; obsolete analysis is cancelled or discarded.
- The semantic model is immutable for consumers during a request.

## Live-coding behaviour

- Incomplete calls, partial chains and temporary syntax errors must not crash analysis.
- Suppress diagnostics when context is insufficient for a reliable conclusion.
- Avoid cascading errors from a single upstream failure.
- Preserve accurate source ranges and distinguish errors, warnings and informational findings.

## Diagnostics inputs

The engine exposes semantic findings to feature providers, which decide presentation according to configuration. Likely categories include unknown identifiers in Strudel-specific contexts, invalid pattern method use, malformed mini-notation and invalid sample identifiers. Exact rules remain to be specified and validated.

## Open questions

- How imports and REPL-style global injections should be represented.
- Whether mini-notation receives a dedicated semantic submodel or a flattened token model.
- Which function signatures must be generated from authoritative Strudel sources.
- How version-specific metadata is selected per document or workspace.
- What invalidation granularity gives the best measured responsiveness.
