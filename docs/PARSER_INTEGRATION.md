# Parser Integration

Status: **version and compatibility resolved; syntax adapter implementation pending.**  
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

## Licence resolution

The repository named in `AGENTS.md` has an AGPL-3.0 `LICENSE` file but MIT metadata in `package.json`. The published npm package under the `tree-sitter-strdl` name declares MIT but points to a different fork/repository. No public issue or pull-request comment resolving the contradiction was found.

The user decided on 2026-11-25 that **MIT is authoritative** for this project and that they will correct the licence in the original `PedroZappa/tree-sitter-strdl` repository. No issue or pull request was opened, and no action was taken against the fork. The project licence blocker is marked solved as an owner-owned upstream follow-up; this record does not claim the upstream file has already changed.

The already-published npm tarballs still contain AGPL `LICENSE` files. Correcting the repository alone does not change those tarballs, so a corrected npm release from the original repository is a release gate before redistribution.

## Adopted versions and provenance

| Item                     | Value                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Parser package           | `tree-sitter-strudel@1.1.8`                                                                                                               |
| Parser repository        | `git+https://github.com/pedrozappa/tree-sitter-strdl.git`                                                                                 |
| Parser tarball           | `https://registry.npmjs.org/tree-sitter-strudel/-/tree-sitter-strudel-1.1.8.tgz`                                                          |
| Parser integrity         | `sha512-jKp0lHKWKWpBHi/GjYb7YbOH79SyOVUKCB9LezIRJWLDgop7PKM13+dntjzs8oyQhvXRIpZ25iJsXi7BF5Py7Q==`                                         |
| Parser SHA-1             | `91c493387a74fa1e0c0c728ee34f464984a5393a`                                                                                                |
| Tree-sitter runtime      | `tree-sitter@0.25.1`                                                                                                                      |
| Runtime integrity        | `sha512-mrcEdkYtHfrK1A6fs3O6FxkBo0Qig5XUXqHhxUOQu0bmPo00QF4XaSx4edpazdHwxnSCjlGKGgIqWdaN4dvTLA==`                                         |
| Runtime selection reason | The parser declares `peerOptional tree-sitter: ^0.22.4`, but its generated parser uses CLI 0.25-era metadata and requires runtime 0.25.x. |

Both versions are pinned exactly in `package.json` and recorded in `package-lock.json`.

## Runtime override

`tree-sitter@0.22.4` was tested first and failed at `Parser.setLanguage` with `TypeError: Cannot read properties of undefined (reading 'length')` while initialising node-type metadata. The generated parser declares `LANGUAGE_VERSION 15`, which aligns with the 0.25 runtime family.

`tree-sitter@0.25.1` passed the smoke validation. Because the parser's peer range is stale, `.npmrc` sets `legacy-peer-deps=true` so a clean `npm install --ignore-scripts` succeeds. This is a deliberate workaround for the parser package metadata, not a general relaxation of dependency policy. Revisit when the parser publishes an accurate peer range.

## Compatibility validation (2026-11-25)

A temporary CommonJS smoke script loaded both packages through the project's `node_modules` and produced:

| Check                    | Result                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Load and set language    | Pass with `tree-sitter-strudel@1.1.8` and `tree-sitter@0.25.1`.                                              |
| Initial parse            | `note("bd sd")` produced root `source_file`, `hasError: false`, indices `0..13`, child type `expression`.    |
| Incremental edit/reparse | Inserting `" cp"` and reparsing produced `note("bd sd cp")`, `hasError: false`, indices `0..16`.             |
| Malformed input          | `note("bd sd"` produced root `source_file` with `hasError: true` and did not throw.                          |
| Clean install            | `npm install --ignore-scripts` succeeded with `.npmrc`; `npm ls --depth=0` showed the exact pinned versions. |
| Runtime audit            | `npm audit --omit=dev` reported zero vulnerabilities.                                                        |

This validation confirms loading, source ranges, incremental reparsing and malformed-input recovery. It does not replace the dedicated parser/grammar test suite that Phase 3 will add.

## Integration requirements

- Build a syntax adapter that translates parser-specific nodes into the stable syntax representation described in `docs/ARCHITECTURE.md`.
- Keep grammar/parser corpus and binding tests in a separate test suite from semantic engine tests.
- Expand validation beyond the smoke script to the real Strudel language corpus.
- Do not copy grammar, generated parser or bindings into this repository.
- Re-run compatibility validation deliberately on every parser upgrade.
- Publish an MIT-corrected npm release from the original repository before redistribution of the parser package.
