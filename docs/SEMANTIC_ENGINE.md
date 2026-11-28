# Semantic Engine

Status: Phase 4 model, Phase 5 database-backed catalog, Phase 6 provider integration, signature help, mini-notation token analysis and recovery AST, and Phase 7 quick-fix inputs implemented on 2026-11-27. Real documentation corpus validation also passed on 2026-11-27 with no semantic invariant failures over 484 pinned examples. Phase 20 adds unambiguous generated aliases, metadata-gated sample-name resolution, conservative receiver-based parameter inference and additive multi-signature models under ADR-068. Phase 28 adds parser-independent `activePattern` markers under ADR-087. The model remains deliberately limited.

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
- `activePattern` — a static `$:` registration marker inferred from its body expression. It is not a binding, is excluded from identifier resolution and feature candidate sets, and carries no playback or scheduler state.
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

### Reference resolution and callable detail

Phase 20 indexes generated synonyms only when one generated record owns the name and no existing global or Pattern-method record conflicts with it. An alias keeps the target's metadata and records `aliasOf`; ambiguous synonyms (`delayt`, `dt`, `ir`) and out-of-scope synonyms are skipped. A plain double-quoted, identifier-like argument to a mini-notation-capable call creates a `sample` reference only when the injected catalog explicitly provides that sample name; the range covers the unquoted name. Unmatched strings produce no reference and no diagnostic.

Function and parenthesized arrow parameters are inferred as `Pattern` only when the body uses the parameter as the receiver of a known Pattern method that is not ambiguous with a common JavaScript method and every collected observation agrees. Generic JS method names, unknown methods and mixed evidence leave the parameter `Unknown`; nested function bodies are excluded. Parameter symbols and declarations use identifier ranges even for default and rest parameters. User callables and curated catalog callables expose an additive `SemanticSignature` with parameter labels, `optional`/`rest` markers, documentation and a `catalog` or `user` source; generated JSDoc parameter lists remain the fallback, and curated entries inherit generated documentation unless they supply their own.

Mini-notation has a dedicated parser-independent submodel in `src/miniNotation/`. A catalog entry still declares which call arguments accept mini-notation; the engine scans the content of plain double-quoted literals and records ordered tokens, absolute document ranges, conservative structural issues and an additive recovery AST on each `MiniNotationArgument`. Template substitutions are not analyzed because mapping nested expressions is outside this lightweight model; the pinned transpiler only converts double-quoted literals and template literals to mini notation. Mismatched closers record the expected closer, allowing the feature layer to offer a deterministic replacement without reparsing the message.

The Phase 21 AST preserves nesting for `[...]`, `<...>`, `{...}` and `(...)`, classifies steps, rests and numbers, and records operator nodes with the range of the preceding node in the same group. Recovery state is explicit: empty groups carry `empty`, unclosed groups and trailing operands or separators carry `incomplete`, and unmatched or mismatched closers become `error` nodes using the existing diagnostic codes. It is a syntax-shape model rather than pattern evaluation; note pitch, sample identity, velocity, randomness outcomes and the experimental haskellish statement layer are not inferred.

Token boundaries and semantics were validated against pinned sources: `@strudel/mini@1.2.6` `krill.pegjs` defines numbers (lines 61–94), step characters (107–110), group delimiters (113–128), slice operators (132–163), sequences and stacks (166–197), quoted mini notation (205–206) and the haskellish statement layer (210–281). `@strudel/core@1.2.6` JSDoc confirms `*` as `.fast()` (`pattern.mjs:1914`), `/` as `.slow()` (`pattern.mjs:1948`), `:` as list/sample parameters (`controls.mjs:24–31, 97–110`), `~` as silence (`pattern.mjs:1245`) and Euclidean calls (`euclid.mjs:54–69`). `@strudel/reference@1.2.2` supplies the generated JSDoc metadata; it is one minor version behind mini/core, so grammar evidence takes precedence for token boundaries. Descriptions live in `src/miniNotation/documentation.ts`; in particular `!` is replication, not velocity. The Phase 21 AST adds no constructs beyond that grammar: it deliberately omits note-pitch parsing, sample-name validation, velocity, mini-level `shuffle` and the experimental haskellish layer.

## Incrementality

- Analysis results are versioned by the `SemanticDocument` produced for a syntax version.
- The engine keeps a `WeakMap` from a previous semantic document to its analysis cache.
- Top-level statements are keyed by a stable content hash and occurrence. Unchanged statements are reused with shifted symbol, reference, mini-notation token, AST node and AST operator-target ranges after edits; analyses whose ranges did not move are shared immutably.
- Global declaration symbol IDs depend on declaration identity and order, not statement text. A changed initializer is analysed in isolation first; only when its inferred type and signature are unchanged do other statements get reused with references to the same global symbol. An inferred-type or signature change, multiple changed declarations, a declaration rename, insertion, removal, reorder or catalog-version change forces a conservative full rebuild so reused statements cannot retain types derived from old declarations.
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
- The default catalog has no sample records, so sample-name resolution is available only when explicit sample catalog metadata is injected; mini-notation strings are never guessed as samples. ADR-088 confirms that no complete Strudel 1.2.6 sample catalog passes the Phase 28 gate, so unmatched names produce no unknown-sample diagnostic.
- Parameter inference covers only unambiguous Pattern-method receiver usage; other JavaScript or runtime evidence is intentionally ignored. The pinned grammar exposes user rest parameters as an `error` node, so they are recognized conservatively from that shape rather than as a dedicated syntax node.
- Incremental reuse is statement-level, not sub-expression-level.
- Mini-notation analysis is lexical plus an additive recovery-oriented AST. It is not a full 1.2.6 compiler, pattern evaluator or haskellish statement parser; operator nodes record syntactic targets without applying operations.
- Curated signatures cover a small evidence-backed set; generated records without curated data still expose only the flat JSDoc parameter list, and overloaded selection is arity-based rather than type-based.
- Bare identifier arrow parameters are not modeled; inference applies to function and parenthesized arrow formal parameter lists.
- Real-corpus validation now records a Phase 20 baseline of 1,277 unresolved references across 484 documentation examples. ADR-068 classifies them as 913 method-style uses of catalog globals that are not registered Pattern methods, 252 other method uses outside the Pattern catalog, 100 unknown values and 12 unknown calls. They remain unresolved rather than speculative diagnostics; see `validation/real-corpus.json`.

## Open questions

- How imports and REPL-style global injections should be selected per document or workspace.
- Whether the additive recovery AST should later grow into an evaluable mini-notation syntax tree without changing the pinned diagnostics contract.
- Whether curated signatures should be expanded as more authoritative Strudel sources become available.
- How version-specific metadata is selected per document or workspace.
- What invalidation granularity gives the best measured responsiveness.
