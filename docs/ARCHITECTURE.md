# Architecture

Status: transport scaffold implemented on 2026-11-26; remaining layers are proposed and not yet implemented.

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
| Language intelligence     |  diagnostics, completion, hover, navigation,
| feature providers         |  formatting and other evaluated capabilities
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

The current `src/server.ts` implements only the LSP transport lifecycle and advertises `textDocumentSync: None`. Feature providers, the semantic engine, the syntax adapter and the language database are not yet implemented.

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

## Proposed stable contracts

Names below are proposals for implementation, not existing code:

- `TextDocumentSnapshot` — immutable text and version input to the syntax layer.
- `SyntaxDocument` — parser-independent syntax representation with source ranges.
- `SyntaxAdapter` — operations for incremental parse, update and node inspection.
- `SemanticDocument` — scopes, symbols, references and resolved types for a document version.
- `LanguageDatabase` — versioned metadata lookup interface.
- `FeatureProvider` — common request contract for language intelligence features.
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
