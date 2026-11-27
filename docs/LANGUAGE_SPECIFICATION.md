# Strudel Language Specification

Status: host-language constructs are preliminary; mini-notation token rules below were verified against the pinned Strudel source on 2026-11-27.

Target version: `@strudel/core@1.2.6`, `@strudel/mini@1.2.6` and `@strudel/transpiler@1.2.6`, with `@strudel/reference@1.2.2` for JSDoc metadata.

## Scope

Strudel is a JavaScript-hosted live-coding language. Language intelligence must understand both the surrounding JavaScript-like DSL and the mini-notation embedded in pattern strings. It must not degrade into generic JavaScript completion plus string highlighting.

Sources:

- Strudel mini-notation documentation: <https://strudel.cc/learn/mini-notation/>
- `@strudel/core` package: <https://registry.npmjs.org/@strudel/core>
- Parser project README: <https://github.com/PedroZappa/tree-sitter-strdl>

## Host-language constructs

Verified examples from authoritative sources include:

```js
s('bd').fast(2);
note('c e g b');
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

Mini-notation is a compact rhythm/pattern language embedded in strings. Verified rules from the official documentation and pinned 1.2.6 sources:

- Double-quoted literals and template literals are converted to mini notation by the pinned transpiler; single-quoted literals remain ordinary strings.
- Space-separated events form a sequence inside one cycle.
- `*` speeds a pattern up and `/` slows it down; numeric and patterned operands are allowed.
- `<...>` is slow alternation, playing one alternative per cycle.
- `{...}` is polymeter and optional `%n` sets explicit steps per cycle.
- `[...]` nests or subdivides events within one outer event.
- `~` or `-` represents a rest.
- `,` produces a parallel stack; `|` selects one alternative randomly.
- `@` and `_` assign temporal weight.
- `!` replicates a step without speeding it up; it is not velocity.
- `?` applies probabilistic deletion; the default probability is 0.5.
- `:` supplies list/sample parameters such as `bd:0:0.3`.
- `(beats, segments[, rotation])` expresses Euclidean rhythms.
- `^` marks the first step of a sequence; `a . b c` is feet syntax equivalent to `a [b c]`, while `a.b` is one atom.

The authoritative grammar is `node_modules/@strudel/mini/krill.pegjs` from the pinned `@strudel/mini@1.2.6`. The generated `krill-parser.js` and `@strudel/mini/test/mini.test.mjs` confirm token boundaries and defaults; `@strudel/core@1.2.6` JSDoc documents `*` as `.fast()`, `/` as `.slow()`, `~` as silence, `:` as sample parameters and Euclidean calls. `@strudel/reference@1.2.2` is the pinned JSDoc metadata source and is one minor version behind mini/core, so grammar evidence takes precedence when the two conflict.

Example from the official documentation:

```js
note('<[g3,b3,e4] [a3,c3,e4] [b3,d3,f#4]>*2');
```

The language server's token submodel is lexical rather than a full mini parser. It intentionally suppresses speculative issues for unclosed delimiters, trailing operators and unsupported characters during live coding.

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

- How optional, rest and overloaded parameters should be represented if authoritative metadata gains them.
- Whether a recovery parser should replace the current lexical mini-notation token model.
- Exact diagnostic rules for unknown sample names and malformed mini-notation beyond verified structural faults.
- How much JavaScript expression evaluation is needed for useful constant folding without building a JS type checker.
