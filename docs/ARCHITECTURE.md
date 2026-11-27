# Architecture

Status: transport, syntax adapter, semantic engine, language database, document store, feature providers, signature help, mini-notation token analysis and quick fixes implemented on 2026-11-27; remaining extended capabilities are under evaluation.

Authority: `AGENTS.md` sections 3–6.

## Architectural principles

1. Separate syntax parsing, semantic analysis, type inference, language intelligence and LSP transport.
2. Communicate between layers through explicit interfaces and stable internal abstractions.
3. Keep the semantic engine independent of Tree-sitter APIs so the parser or grammar can evolve.
4. Treat the parser as the syntax layer only, not as the semantic engine.
5. Do not build a general JavaScript/TypeScript compiler; implement Strudel semantics and only the JavaScript interoperability the language needs.
6. Keep the server editor-agnostic and responsive during active editing.

## Layer overview

```text
Editor (any LSP client)
        |  LSP over stdio
        v
+---------------------------+
| LSP transport / protocol  |  lifecycle, capabilities, requests, notifications,
| adapter and scheduling    |  cancellation, configuration, response mapping
+---------------------------+
        |  request context
        v
+---------------------------+
| Language intelligence     |  diagnostics, quick fixes, completion, hover, signature help,
| feature providers         |  navigation, mini-notation rules and other evaluated capabilities
+---------------------------+
        |  semantic queries
        v
+---------------------------+
| Semantic engine           |  scopes, symbols, references, resolution,
| and type inference        |  Strudel-specific type model
+---------------------------+
        |  parser-independent syntax representation
        v
+---------------------------+
| Syntax layer adapter      |  incremental parse trees, node kinds, ranges,
| (Tree-sitter integration) |  recovery behaviour, source locations
+---------------------------+
        |  document text and edits
        v
+---------------------------+
| Text document store       |  versions, incremental edits, snapshots
+---------------------------+

Side inputs:
  - Reproducible language database (generated, manual and runtime-derived metadata)
  - User configuration (focused, user-facing options only)
```

The current `src/server.ts` implements LSP lifecycle, incremental text sync, completion, code actions for quick fixes, hover, signature help, definition, references and push diagnostics. `src/syntax/` implements the pinned Tree-sitter adapter and the parser-independent `SyntaxDocument` contract. `src/semantic/` implements parser-independent snapshots, scopes, symbols, references, limited type inference, incremental reuse and cancellation checks. `src/miniNotation/` implements a lexical token and conservative issue submodel over mini-notation string content. `src/languageDatabase/` implements a reproducible, offline-capable metadata snapshot with a `SemanticCatalog` adapter. `src/lsp/` owns the text document store and per-version syntax/semantic snapshots. `src/features/` contains transport-independent diagnostics, quick-fix, completion, hover, signature help and navigation providers. Document updates are analysed outside the request handlers on the next event-loop turn; request handlers await the latest scheduled analysis, and superseded document versions are discarded before publication.

## Responsibilities

### LSP transport and scheduling

- Own the stdio JSON-RPC connection and LSP lifecycle.
- Advertise only capabilities that are actually implemented.
- Translate LSP requests into feature-provider calls and map results back to LSP types.
- Propagate cancellation and discard superseded work where appropriate.
- Keep expensive work off the communication-critical path.
- Contain all editor-specific behaviour outside the server core.

### Language intelligence

- Implement individually testable feature providers over the semantic model.
- Use accurate document ranges and return actionable diagnostics.
- Avoid cascading diagnostics when context is incomplete.
- Treat language database lookups as explicit dependencies rather than hidden globals.

### Semantic engine and type inference

- Build a parser-independent representation of scopes, symbols, bindings and references.
- Resolve Strudel calls, chainable pattern methods, user definitions and mini-notation string contexts.
- Attach validated token-level mini-notation facts without importing Tree-sitter or the pinned mini parser into this repository.
- Apply a limited, Strudel-specific type model.
- Support incremental invalidation and cancellation-aware analysis.
- Never require Tree-sitter node types at this layer.

### Syntax layer adapter

- Own the dependency on the chosen versioned Tree-sitter parser.
- Preserve source locations and support incremental parsing.
- Normalise parser-specific node kinds into a stable syntax representation.
- Isolate grammar/parser integration tests from semantic engine tests.

### Text document store

- Track document versions and incremental edits.
- Provide immutable snapshots to the syntax and semantic layers.
- Avoid unnecessary whole-document recomputation.

### Reproducible language database

- Combine generated metadata from pinned authoritative Strudel sources, manually maintained semantic information and runtime integration where genuinely necessary.
- Record metadata origin and source versions.
- Work offline after installation.
- Support future selection between Strudel versions.

`src/languageDatabase/generated.ts` is committed output of `scripts/generate-metadata.mjs`. It contains 576 named records from `@strudel/reference@1.2.2`, source provenance for all four pinned Strudel packages, and no machine-specific paths. The generator validates versions, tarball integrity, licences and repository URLs before writing output. `manual.ts` supplies curated semantics for common pattern constructors and controls, while `LanguageDatabaseOptions` permits explicit runtime-derived entries and additional Strudel versions.

## Data flow

### Document change

1. LSP transport applies the incremental edit to the document store.
2. Syntax adapter incrementally updates the syntax representation.
3. Semantic engine invalidates affected scopes/symbols and recomputes the minimum necessary model.
4. Diagnostics are published from the resulting semantic model, with suppression rules for incomplete context.

### Feature request

1. LSP transport creates a request context with document version, position and cancellation token.
2. Feature provider queries the semantic model and language database.
3. Results are mapped to LSP response types.
4. Obsolete requests are cancelled or discarded when a newer document version supersedes them.

## Stable contracts

Implemented syntax contracts (exported from `src/syntax/index.ts`):

- `TextDocumentSnapshot` — immutable text and version input to the syntax layer.
- `SyntaxDocument` — parser-independent syntax representation with source ranges.
- `SyntaxAdapter` — operations for incremental parse, update and node inspection.
- `SyntaxNode`, `SyntaxRange`, `SyntaxKind` — normalized syntax tree values with no Tree-sitter types.

Implemented semantic contracts (exported from `src/semantic/index.ts`):

- `SemanticDocument` — immutable scopes, symbols, references, mini-notation argument contexts and resolved types for a document version.
- `SemanticEngine` — versioned analysis with optional previous snapshot and cancellation token.
- `SemanticCatalog` — metadata lookup boundary consumed by the semantic engine.
- `StrudelType`, `SemanticScope`, `SemanticSymbol`, `SemanticReference` — parser-independent semantic values.

Implemented language database contracts (exported from `src/languageDatabase/index.ts`):

- `LanguageDatabase` — versioned lookup of global, pattern-method and sample metadata.
- `GeneratedMetadataSnapshot` — deterministic JSDoc-derived records with source provenance.
- `ManualSemanticEntry` — curated return types and mini-notation argument positions.
- `RuntimeSymbolMetadata` — optional runtime-derived extension point; no runtime import is used by default.
- `createCatalogFromLanguageDatabase` — adapter from the database to `SemanticCatalog`.

Implemented document and feature contracts (exported from `src/lsp/index.ts` and `src/features/index.ts`):

- `AnalyzedDocument` — one immutable text, syntax and semantic snapshot pair per document version.
- `DocumentAnalysisService` — incremental document updates with cached syntax/semantic results.
- `FeatureContext` — provider input combining the document snapshot, syntax node at the request offset and language database.
- `LanguageDiagnostic`, `DiagnosticFix`, `QuickFixResult`, `TextEditResult`, `CompletionCandidate`, `HoverResult`, `SignatureHelpResult`, `DefinitionResult` and `ReferenceResult` — transport-independent provider results mapped by `src/server.ts`.

Implemented mini-notation contracts (exported from `src/miniNotation/index.ts`):

- `MiniNotationToken`, `MiniNotationTokenKind`, `MiniNotationIssue` and `MiniNotationAnalysis` — parser-independent lexical facts, including expected closers for safe fixes, attached to semantic mini-notation arguments.
- `analyzeMiniNotation` and `TOKEN_DESCRIPTIONS` — document-offset scanner and descriptions derived from pinned Strudel sources.

Proposed contracts for later phases:

- `FeatureProvider` — common request contract if provider count makes the current explicit functions unwieldy.
- `RequestContext` — document version, position, configuration, cancellation and progress plumbing.

## Explicit constraints

- The parser dependency must be pinned to an explicit version and must not be vendored into this repository.
- No Tree-sitter types cross into the semantic engine or feature-provider interfaces.
- No blocking full-document analysis in the LSP message loop.
- No editor-specific requirements in the core package.
- Capabilities are advertised only when implemented and verified.

## Evolution strategy

- Parser upgrades are deliberate and validated with separate parser integration tests.
- Language metadata records source versions so multiple Strudel versions can be supported without rewriting the semantic engine.
- New LSP capabilities are added behind explicit provider interfaces and tracked in `docs/LSP_FEATURES.md`.
