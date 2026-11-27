# Parser Integration

Status: **version 2.0.2 adopted; compatibility, adapter integration and AGPL licensing policy resolved.**

Authority: `AGENTS.md` section 3, "Tree-sitter integration".

## Requirement

`AGENTS.md` names <https://github.com/PedroZappa/tree-sitter-strdl> as the independent parser project. The re-implementation must consume a versioned npm dependency, pin it to an explicit version, avoid duplicating grammar/parser/bindings, preserve source locations, support incremental parsing, and keep parser integration tests separate from semantic engine tests. Licensing inconsistencies had to be resolved before adoption or redistribution.

## Verified facts (2026-11-25)

| Source                                         | Evidence                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| npm registry                                   | `tree-sitter-strdl` latest is `1.3.4`, published 2025-11-28. Its repository field points to `github.com/joshuadanpeterson/tree-sitter-strdl`, licence field is MIT, peer dependency is `tree-sitter ^0.22.4`. Version `1.1.8` is also published with the same repository owner and MIT metadata. |
| npm registry                                   | `tree-sitter-strudel` latest is `1.1.8`, published 2025-08-01. Its repository field points to `github.com/pedrozappa/tree-sitter-strdl` and its licence field is MIT.                                                                                                                            |
| `PedroZappa/tree-sitter-strdl` GitHub API      | Default branch `main`; detected licence `AGPL-3.0`; description "Tree-sitter parser for Strudel, a Tidal Cycles based live coding DSL."                                                                                                                                                          |
| `PedroZappa/tree-sitter-strdl` `LICENSE`       | Full GNU Affero General Public License v3 text. The file was changed to AGPL-3.0 in a signed 2025-07-29 commit by the repository owner.                                                                                                                                                          |
| `PedroZappa/tree-sitter-strdl` `package.json`  | Name `tree-sitter-strudel`, version `1.1.8`, `license: MIT`, repository `https://github.com/pedrozappa/tree-sitter-strdl`, author "Zedro".                                                                                                                                                       |
| `joshuadanpeterson/tree-sitter-strdl`          | A fork of `PedroZappa/tree-sitter-strdl`. Its `LICENSE` is AGPL-3.0 while its `package.json` declares MIT and identifies version `1.3.4` with author Josh Peterson.                                                                                                                              |
| npm README for `tree-sitter-strdl@1.3.4`       | Describes a maintained fork of Pedro Zappa's grammar, extends it beyond upstream `1.1.8`, and points to `joshuadanpeterson/tree-sitter-strdl`.                                                                                                                                                   |
| `tree-sitter-strudel@1.1.8` tarball inspection | Contains native prebuilds for `darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-arm64`, `win32-x64`, plus `tree-sitter-strudel.wasm`. Its `LICENSE` file is AGPL-3.0.                                                                                                             |
| `tree-sitter-strdl@1.3.4` tarball inspection   | Contains grammar/bindings/query files but no prebuild binaries and no WASM artifact. Its `LICENSE` file is AGPL-3.0.                                                                                                                                                                             |

Sources:

- <https://registry.npmjs.org/tree-sitter-strdl>
- <https://registry.npmjs.org/tree-sitter-strudel>
- <https://registry.npmjs.org/tree-sitter>
- <https://api.github.com/repos/PedroZappa/tree-sitter-strdl>
- <https://raw.githubusercontent.com/PedroZappa/tree-sitter-strdl/main/LICENSE>
- <https://raw.githubusercontent.com/PedroZappa/tree-sitter-strdl/main/package.json>
- <https://raw.githubusercontent.com/joshuadanpeterson/tree-sitter-strdl/main/LICENSE>
- <https://raw.githubusercontent.com/joshuadanpeterson/tree-sitter-strdl/main/package.json>
- <https://codeberg.org/uzu/strudel/raw/branch/main/LICENSE>
- <https://registry.npmjs.org/@strudel/core/1.2.6>

## Licence resolution

Historical facts (2026-11-25): the repository named in `AGENTS.md` had an AGPL-3.0 `LICENSE` file but MIT metadata in `package.json`. The published npm package under the `tree-sitter-strdl` name declared MIT but pointed to a different fork/repository. No public issue or pull-request comment resolving the contradiction was found.

The user initially decided that **MIT was authoritative** for the 1.1.8-era plan and intended an owner-owned correction to the original `PedroZappa/tree-sitter-strdl` repository. No issue or pull request was opened, and no action was taken against the fork. That plan is retained for provenance in ADR-003 but is superseded.

Current resolution (2026-11-27): the adopted `tree-sitter-strudel@2.0.2` package declares `AGPL-3.0-only` in `package.json` and bundles a matching AGPL-3.0 `LICENSE`. Strudel itself uses AGPL-3.0, while the Tree-sitter runtime is MIT. By explicit user decision in ADR-032, this project is now `AGPL-3.0-only`, so no MIT-corrected parser release is required. Publication still requires separate explicit release authorization.

## Adopted versions and provenance (updated 2026-11-26)

| Item                    | Value                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Parser package          | `tree-sitter-strudel@2.0.2`                                                                       |
| Parser repository       | `git+https://github.com/pedrozappa/tree-sitter-strdl.git`                                         |
| Parser tarball          | `https://registry.npmjs.org/tree-sitter-strudel/-/tree-sitter-strudel-2.0.2.tgz`                  |
| Parser integrity        | `sha512-5pCUygbKamQoRh+d/gqaVsTi4/bJp2ErZw+cdvuHx49J77tAI19VK0DS7V/7geVTa79u9MTDPGOOxNMksv6FmQ==` |
| Parser SHA-1            | `bb73b375473f8f9d7b1e64908762559bbc7f1c2b`                                                        |
| Parser declared licence | `AGPL-3.0-only` in `package.json`; AGPL-3.0 `LICENSE` file — now consistent                       |
| Tree-sitter runtime     | `tree-sitter@0.25.1`                                                                              |
| Runtime integrity       | `sha512-mrcEdkYtHfrK1A6fs3O6FxkBo0Qig5XUXqHhxUOQu0bmPo00QF4XaSx4edpazdHwxnSCjlGKGgIqWdaN4dvTLA==` |
| Runtime peer range      | `tree-sitter@^0.25.0` — accurate for the 0.25 runtime family                                      |

Both versions are pinned exactly in `package.json` and recorded in `package-lock.json`.

### Upgrade from 1.1.8 to 2.0.2

The user directed the upgrade to `tree-sitter-strudel@2.0.2` on 2026-11-26. This is a major grammar rewrite: node types changed substantially (see the next section). The adapter's stable `SyntaxKind` contract absorbed the changes in `kinds.ts` and `types.ts`; no semantic layer changes were needed.

The 2.0.2 package resolves two earlier concerns:

- **Licence metadata is now consistent**: both `package.json` (`AGPL-3.0-only`) and the bundled `LICENSE` file declare AGPL-3.0. The previous 1.1.8 contradiction between MIT metadata and an AGPL licence file no longer applies to the adopted version.
- **Peer range is now accurate**: 2.0.2 declares `tree-sitter ^0.25.0`, matching the pinned `tree-sitter@0.25.1`. The stale-peer workaround is no longer needed for this parser.

### Node type changes in 2.0.2

The grammar moved from Strudel-specific node names to a JavaScript-like structure. The adapter absorbs all of this in `src/syntax/kinds.ts`; no other layer sees parser node names.

| 1.1.8 node                  | 2.0.2 equivalent                               |
| --------------------------- | ---------------------------------------------- |
| `function_call`             | `call_expression`                              |
| `method_call`               | `member_expression` inside `call_expression`   |
| `chained_method`            | nested `call_expression` + `member_expression` |
| `expression`                | `expression_statement` / removed wrapper       |
| `lexical_declaration`       | `variable_declaration`                         |
| `assignment`                | `assignment_expression`                        |
| `additive_expression`       | `binary_expression`                            |
| `multiplicative_expression` | `binary_expression`                            |

New named node types in 2.0.2 include `arguments`, `assignment_pattern`, `await_expression`, `block`, `computed_property_name`, `conditional_expression`, `export_declaration`, `formal_parameters`, `function_declaration`, `import_declaration`, `import_specifier`, `labeled_statement`, `named_imports`, `new_expression`, `parenthesized_expression`, `return_statement`, `spread_element`, `subscript_expression`, `tagged_template_expression`, `template_string`, `template_substitution`, `try_statement`, and `unary_expression`. All are mapped in `kinds.ts`.

## Runtime override

`tree-sitter@0.22.4` was tested first against 1.1.8 and failed at `Parser.setLanguage` with `TypeError: Cannot read properties of undefined (reading 'length')` while initialising node-type metadata. The generated parser declares `LANGUAGE_VERSION 15`, which aligns with the 0.25 runtime family.

`tree-sitter@0.25.1` is pinned. With 2.0.2, the parser's peer range (`^0.25.0`) matches the runtime, so the earlier `legacy-peer-deps` rationale no longer applies to the parser. `.npmrc` retains `legacy-peer-deps=true` as a general setting; removing or narrowing it is deferred until all dependencies are confirmed compatible without it.

## Compatibility validation

### Phase 1 smoke validation (2026-11-25, `tree-sitter-strudel@1.1.8`)

A temporary CommonJS smoke script loaded both packages through the project's `node_modules` and produced:

| Check                    | Result                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Load and set language    | Pass with `tree-sitter-strudel@1.1.8` and `tree-sitter@0.25.1`.                                              |
| Initial parse            | `note("bd sd")` produced root `source_file`, `hasError: false`, indices `0..13`, child type `expression`.    |
| Incremental edit/reparse | Inserting `" cp"` and reparsing produced `note("bd sd cp")`, `hasError: false`, indices `0..16`.             |
| Malformed input          | `note("bd sd"` produced root `source_file` with `hasError: true` and did not throw.                          |
| Clean install            | `npm install --ignore-scripts` succeeded with `.npmrc`; `npm ls --depth=0` showed the exact pinned versions. |
| Runtime audit            | `npm audit --omit=dev` reported zero vulnerabilities.                                                        |

### Phase 3 upgrade validation (2026-11-26, `tree-sitter-strudel@2.0.2`)

After the upgrade, the dedicated parser integration suite under `test/parser/` was updated for the new node structure and passes with `tree-sitter-strudel@2.0.2` and `tree-sitter@0.25.1`:

| Check                    | Result                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Load and set language    | Pass.                                                                                                                                 |
| Initial parse            | `note("bd sd").fast(2)` produces `source_file` → `expression_statement` → `call_expression` with `member_expression` and `arguments`. |
| Variable declarations    | `const pat = s("bd").fast(2)` produces `variable_declaration` / `variable_declarator` with nested chains.                             |
| Non-ASCII offsets        | UTF-16 positions verified with `// 🎵` prefix; parser indices match LSP character offsets.                                            |
| Incremental edit/reparse | Inserting `" cp"` into a string, reparsing, and `nodeAt` lookup all pass.                                                             |
| Malformed input          | `note("bd sd"` sets `hasError: true` without throwing; incremental repair to valid input passes.                                      |
| Full check gate          | `npm run check` passes: typecheck, lint, format, 6 tests.                                                                             |
| Dependency audit         | `npm audit --omit=dev` and `npm audit` report zero vulnerabilities.                                                                   |

The temporary Phase 1 smoke script has been replaced by the persistent `test/parser/` suite.

## Adapter integration (2026-11-26)

The syntax adapter lives in `src/syntax/` and implements the parser-independent `SyntaxAdapter` contract from `docs/ARCHITECTURE.md`:

- `types.ts` defines `SyntaxDocument`, `SyntaxNode`, `SyntaxRange`, `SyntaxEdit`, `SyntaxKind` and `TextDocumentSnapshot` without Tree-sitter types. The `SyntaxKind` union reflects the 2.0.2 node set.
- `kinds.ts` maps `tree-sitter-strudel@2.0.2` node names into stable `SyntaxKind` values. Parser node names appear only in this file.
- `textCoordinates.ts` converts parser indices into UTF-16 LSP positions, verified against non-ASCII source.
- `treeSitterSyntaxAdapter.ts` retains the native Tree-sitter tree in a `WeakMap` keyed by `SyntaxDocument`, supports `parse`, `update` with incremental edits, and `nodeAt` lookup.
- `index.ts` is the public entry point for the syntax layer.

Parser integration tests run independently via `npm run test:parser` or `make test-parser`. They cover stable node kinds/ranges, chained method calls, variable declarations, non-ASCII offsets, incremental edit/reparse, and recovery from malformed input. No semantic engine internals are imported.

## Integration requirements

- [x] Build a syntax adapter that translates parser-specific nodes into the stable syntax representation described in `docs/ARCHITECTURE.md`.
- [x] Keep grammar/parser corpus and binding tests in a separate test suite from semantic engine tests.
- [ ] Expand validation beyond the smoke script to the real Strudel language corpus (Phase 4+).
- [x] Do not copy grammar, generated parser or bindings into this repository.
- [x] Re-run compatibility validation deliberately on every parser upgrade.
- [x] Resolve AGPL-3.0 licensing implications of `tree-sitter-strudel@2.0.2` before redistributing the parser package. The 2.0.2 package declares AGPL-3.0-only consistently in both metadata and LICENSE, and ADR-032 aligns the published project with that identifier.
