# Strudel Language Specification

Status: preliminary. Constructs below must be verified against the pinned Strudel source version before being encoded in the semantic engine.  
Target version: `@strudel/core@1.2.6` as of 2026-11-25.

## Scope

Strudel is a JavaScript-hosted live-coding language. Language intelligence must understand both the surrounding JavaScript-like DSL and the mini-notation embedded in pattern strings. It must not degrade into generic JavaScript completion plus string highlighting.

Sources:

- Strudel mini-notation documentation: <https://strudel.cc/learn/mini-notation/>
- `@strudel/core` package: <https://registry.npmjs.org/@strudel/core>
- Parser project README: <https://github.com/PedroZappa/tree-sitter-strdl>

## Host-language constructs

Verified examples from authoritative sources include:

```js
s("bd").fast(2)
note("c e g b")
```

Constructs to model:

- Variable declarations and user-defined functions.
- Calls to pattern-producing functions such as `s`, `sound`, `n`, `note` and `stack`.
- Chainable pattern methods such as `.fast`.
- Object and array literals used as pattern arguments.
- String literals that are either mini-notation or ordinary strings depending on syntax and call context.
- Parameters, lexical scopes and references to user-defined bindings.

The parser project README states that its injected mini-notation functions include `s`, `sound`, `n`, `note`, `scale`, `chord`, `arp`, `gain`, `speed`, `pan`, `cutoff`, `lpf`, `hpf`, `hpq`, `delay`, `rev`, `stack` and `cat`. This list is parser metadata, not yet an authoritative semantic database.

## Mini-notation

Mini-notation is a compact rhythm/pattern language embedded in strings. According to the official documentation:

- Backticks allow multi-line mini-notation; double quotes allow single-line mini-notation.
- Single quotes produce an ordinary string that is not parsed as mini-notation.
- Space-separated events form a sequence inside one cycle.
- `*` speeds a pattern up; `/` slows it down; decimal factors are allowed.
- `<...>` defines sequence length from the number of events.
- `[...]` nests or subdivides events within one outer event.
- `~` or `-` represents a rest.
- `,` produces parallel events/chords.
- `@` assigns temporal weight.
- `!` replicates without speeding up.
- `?` applies probabilistic removal; `|` chooses between alternatives randomly.
- `(beats, segments[, offset])` expresses Euclidean rhythms.

Example from the official documentation:

```js
note("<[g3,b3,e4] [a3,c3,e4] [b3,d3,f#4]>*2")
```

## Semantic information to model

- Which calls produce patterns and which arguments accept mini-notation.
- Which string syntax triggers mini-notation interpretation in each call context.
- Pattern method names, signatures and return kinds.
- Sample/sound identifiers and their source package/version.
- User-defined bindings, parameters and lexical scope.
- Numeric, string, array and object argument shapes.
- Interpretation of incomplete input during live editing.

## Versioning

- Metadata generation must record the exact Strudel source version used.
- Constructs must be revalidated when the pinned Strudel version changes.
- The semantic engine must be designed so future Strudel versions can be described by additional metadata rather than hardcoded rewrites.

## Open questions

- Authoritative signature database source and generation process.
- Whether mini-notation parsing uses the same parser dependency or a dedicated adapter over its injected grammar.
- Exact diagnostic rules for unknown functions, unknown sample names and malformed mini-notation.
- How much JavaScript expression evaluation is needed for useful constant folding without building a JS type checker.
