# Testing Strategy

Status: authoritative. `AGENTS.md` section 9 was completed and approved on 2026-11-25; full Phase 6 and Phase 7 validation results, including signature help, mini-notation analysis, quick fixes, rename, document symbols and semantic tokens, added on 2026-11-27.

Authority: `AGENTS.md` section 9 and global project requirements.

## Mandate

Testing is mandatory. The framework and supporting tooling were evaluated and selected based on project requirements, and the decision is recorded here.

The prototype declared Mocha and VS Code test tooling, but its test script pointed at missing compiled files and fixture directories. Phase 2 replaced that path with a compiled ESM smoke test for the stdio transport. Phase 4 added an isolated semantic engine suite using hand-built `SyntaxDocument` fixtures. Phase 5 added a metadata-generation and language-database suite. Phase 6 added a language-feature suite, a mini-notation token suite and expanded the stdio test into an end-to-end capability integration test. Phase 7 extended the feature suite with quick-fix edits, range filtering, rename validation, document-symbol outline checks and semantic-token classification, and the stdio test with code-action, document-symbol, semantic-token and rename mapping. Performance suites remain to be added in Phase 8.

## Test layers

| Layer                      | Scope                                                                                                              | Isolation requirement                                                          | Examples                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Parser/grammar integration | Selected parser dependency, node kinds, ranges, incremental updates, recovery                                      | Separate from semantic engine tests; no hand-written grammar copy in this repo | Edit sequences, malformed input, injected mini-notation ranges                 |
| Semantic engine            | Scopes, symbols, references, limited type inference, invalidation                                                  | No Tree-sitter types in test contracts                                         | User functions, chained pattern calls, unresolved identifiers, stale snapshots |
| Language features          | Diagnostics, quick fixes, rename, document symbols, semantic tokens, completion, hover, signature help, navigation | Deterministic language database fixtures                                       | Safe edit contents, range filtering, accurate ranges, diagnostic suppression   |
| Mini-notation analysis     | Token boundaries, descriptions, structural faults and live-coding suppression                                      | Lexical suite independent of the Tree-sitter adapter                           | Documented 1.2.6 operators, incomplete input, unsupported characters           |
| LSP transport              | Capability advertisement, request/response mapping, cancellation, configuration                                    | Standard LSP clients or protocol harnesses; no editor-specific dependency      | Initialize, didChange, completion request, cancellation, shutdown              |
| Metadata generation        | Pinned source extraction and reproducibility                                                                       | Pinned inputs; generated output compared deterministically                     | Missing source package, version drift, known-good snapshot                     |
| Performance                | Latency and regression monitoring                                                                                  | Dedicated harness; see `docs/PERFORMANCE.md`                                   | Open/edit/request workloads reporting p50/p95/p99                              |

## Framework evaluation

| Option                    | Strengths                                                                                       | Costs                                                                                                       | Assessment                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Node built-in `node:test` | Zero dedicated test dependency; ESM support; suitable for module, protocol and subprocess tests | TypeScript tests need a compile step or an execution helper; less built-in ergonomics than a full framework | Selected                                       |
| Vitest                    | Mature TypeScript/ESM support, watch mode, mocking and coverage; widely used                    | Additional dependency; Node version requirement; more tooling to maintain                                   | Useful if rich test ergonomics prove necessary |
| Mocha                     | Present in prototype devDependencies                                                            | Existing setup is broken; no tests; older toolchain assumptions                                             | Rejected                                       |

Local environment at 2026-11-25: Node v26.8.2, npm 11.19.1.

## Decision

Use Node's built-in test runner over compiled ESM JavaScript, with the TypeScript compiler producing test output. This avoids a separate test-framework dependency while still supporting module, protocol and subprocess tests.

An execution helper such as `tsx` may be evaluated for watch-mode developer ergonomics, but is not adopted. Installing any further dependency requires explicit approval.

Rationale: the built-in runner covers the required module, protocol and subprocess tests, keeps the dependency surface small, and works with the pinned TypeScript toolchain. Vitest remains a documented alternative if richer ergonomics become necessary.

## Approved toolchain

The user approved and the project installed these pinned root dependencies on 2026-11-25:

- Runtime: `vscode-languageserver@11.0.1`, `vscode-languageserver-textdocument@1.0.16`
- Development: `@eslint/js@9.33.0`, `@stylistic/eslint-plugin@2.13.0`, `@types/node@26.6.10`, `eslint@9.33.0`, `prettier@3.10.1`, `typescript@6.0.3`, `typescript-eslint@8.74.0`

`@stylistic/eslint-plugin` is retained because the existing ESLint configuration imports it. TypeScript output is the intended test compilation path; no test-framework dependency was added.

## Test quality requirements

- Tests are deterministic and do not rely on network access at runtime.
- Generated fixtures record source versions and provenance.
- Live-coding fixtures include incomplete chains, partial calls, malformed mini-notation and rapid edits.
- Error paths are tested, including missing metadata and cancelled requests.
- Parser corpus tests remain separate from semantic engine tests.
- Capability advertisement is verified against implemented features.
- Performance benchmarks are maintained separately from correctness tests.
- Every bug fix adds or updates a regression test that fails before the fix.
- Tests are not changed, weakened, skipped or deleted merely to make validation pass.

## Validation gates

Root scripts established in Phases 2–6:

- `npm run typecheck` — TypeScript strict-mode check with no emit.
- `npm run lint` — ESLint with TypeScript-aware rules over managed source and test files.
- `npm run format:check` — Prettier verification with prototype and generated files excluded.
- `npm test` — compile to ESM, then run `node --test dist/test`.
- `npm run test:parser` — compile to ESM, then run only `dist/test/parser` grammar/parser integration tests.
- `npm run test:semantic` — compile to ESM, then run only `dist/test/semantic` semantic engine tests.
- `npm run test:metadata` — compile to ESM, then run only `dist/test/metadata` language database tests.
- `npm run test:features` — compile to ESM, then run only `dist/test/features` language feature tests.
- `npm run test:mini` — compile to ESM, then run only `dist/test/miniNotation` token-model tests.
- `npm run generate:metadata` — regenerate the committed snapshot from pinned local inputs.
- `npm run benchmark` — benchmark command runner; workloads and p50/p95/p99 targets arrive in Phase 8.
- `npm run check` — chains typecheck, lint, format verification and the full test suite.

The `Makefile` provides convenience targets for these commands; `make check` runs the same combined gate as `npm run check`, `make test-parser`, `make test-semantic`, `make test-metadata`, `make test-features` and `make test-mini` run isolated suites, and `make generate-metadata` regenerates the snapshot.

Prototype directories remain outside the lint/format/build scopes. The committed `src/languageDatabase/generated.ts` snapshot is inside those scopes and must be generator-formatted. Results must be reported honestly; failures are not suppressed to make validation pass.

## Current validation status (2026-11-27)

| Command                   | Result | Notes                                                                                                                                                 |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts` | Pass   | Clean install from `package-lock.json`: 137 packages added, 0 vulnerabilities.                                                                        |
| `npm ls --depth=0`        | Pass   | All fifteen pinned root packages are installed at the selected versions.                                                                              |
| `npm audit --omit=dev`    | Pass   | Zero runtime vulnerabilities.                                                                                                                         |
| `npm audit`               | Pass   | Zero vulnerabilities.                                                                                                                                 |
| `npm run typecheck`       | Pass   | Strict TypeScript check succeeds for `src/` and `test/`.                                                                                              |
| `npm run lint`            | Pass   | ESLint succeeds with type-aware rules and the retained `@stylistic/eslint-plugin`.                                                                    |
| `npm run format:check`    | Pass   | Prettier succeeds for managed files.                                                                                                                  |
| `npm test`                | Pass   | Forty-two tests pass: one stdio integration, five parser, seven semantic, five metadata, nineteen feature and five mini-notation tests.               |
| `npm run test:parser`     | Pass   | Five parser integration tests pass independently of semantic tests.                                                                                   |
| `npm run test:semantic`   | Pass   | Seven semantic engine tests pass independently of parser tests.                                                                                       |
| `npm run test:metadata`   | Pass   | Five metadata generation and language database tests pass independently of parser and semantic suites.                                                |
| `npm run test:features`   | Pass   | Nineteen provider tests pass independently of parser and metadata suites.                                                                             |
| `npm run test:mini`       | Pass   | Five mini-notation token tests pass independently of the Tree-sitter adapter.                                                                         |
| `npm run benchmark`       | Pass   | The runner starts and reports that no workloads are registered; no latency figures are claimed.                                                       |
| `npm run check`           | Pass   | The combined typecheck, lint, format and test gate passes.                                                                                            |
| `git diff --check`        | Pass   | Working-tree diff has no whitespace errors.                                                                                                           |
| `npm ls --all`            | Pass   | `tree-sitter-strudel@2.0.2` declares `tree-sitter ^0.25.0`; no invalid peer-range warning remains. Only unrelated optional peer notices are reported. |

Phase 1 parser smoke evidence and the Phase 3 upgrade validation are recorded in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`. The parser suite runs against `tree-sitter-strudel@2.0.2` and covers stable node kinds and ranges, chained method calls, variable declarations, UTF-16 positions with non-ASCII input, incremental edit/reparse, and malformed-input recovery. The Phase 4 semantic suite covers symbol and scope resolution, pattern inference, mini-notation argument contexts, imports, incomplete input, incremental reuse, invalidation and cancellation. The Phase 5 metadata suite covers deterministic regeneration, pinned provenance, offline catalog lookup, version selection, runtime-derived entries and semantic-engine integration. The Phase 6 feature suite covers conservative diagnostics, malformed input, position-aware completion, hover content, resolved-symbol navigation, signature help, mini-notation diagnostics and hover, and incremental mini-notation range shifting. Phase 7 adds quick-fix edit contents, range filtering and non-actionable diagnostics, plus rename edits, prepare ranges, invalid names, incomplete input, document-symbol ranges and hierarchy, and semantic-token classification, to the feature suite. The mini-notation suite covers documented 1.2.6 operators, token descriptions, structural faults, expected-closer metadata, incomplete input and unsupported-character progress. The stdio integration test covers advertised capabilities, all implemented request types, diagnostic publication, code-action, document-symbol, semantic-token and rename mapping, document closure and rapid-edit version suppression. No performance suite exists yet.
