# Testing Strategy

Status: authoritative. `AGENTS.md` section 9 was completed and approved on 2026-11-25; Phase 2 validation results added on 2026-11-26.

Authority: `AGENTS.md` section 9 and global project requirements.

## Mandate

Testing is mandatory. The framework and supporting tooling were evaluated and selected based on project requirements, and the decision is recorded here.

The prototype declared Mocha and VS Code test tooling, but its test script pointed at missing compiled files and fixture directories. Phase 2 replaced that path with a compiled ESM smoke test for the stdio transport. Language-feature, semantic, metadata and performance suites remain to be added in later phases.

## Test layers

| Layer                      | Scope                                                                           | Isolation requirement                                                          | Examples                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Parser/grammar integration | Selected parser dependency, node kinds, ranges, incremental updates, recovery   | Separate from semantic engine tests; no hand-written grammar copy in this repo | Edit sequences, malformed input, injected mini-notation ranges                 |
| Semantic engine            | Scopes, symbols, references, limited type inference, invalidation               | No Tree-sitter types in test contracts                                         | User functions, chained pattern calls, unresolved identifiers, stale snapshots |
| Language features          | Diagnostics, completion, hover, navigation and other providers                  | Deterministic language database fixtures                                       | Position-dependent completion, accurate ranges, diagnostic suppression         |
| LSP transport              | Capability advertisement, request/response mapping, cancellation, configuration | Standard LSP clients or protocol harnesses; no editor-specific dependency      | Initialize, didChange, completion request, cancellation, shutdown              |
| Metadata generation        | Pinned source extraction and reproducibility                                    | Pinned inputs; generated output compared deterministically                     | Missing source package, version drift, known-good snapshot                     |
| Performance                | Latency and regression monitoring                                               | Dedicated harness; see `docs/PERFORMANCE.md`                                   | Open/edit/request workloads reporting p50/p95/p99                              |

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

Phase 2 established these root scripts:

- `npm run typecheck` — TypeScript strict-mode check with no emit.
- `npm run lint` — ESLint with TypeScript-aware rules over managed source and test files.
- `npm run format:check` — Prettier verification with prototype and generated files excluded.
- `npm test` — compile to ESM, then run `node --test dist/test`.
- `npm run benchmark` — benchmark command runner; workloads and p50/p95/p99 targets arrive in Phase 8.
- `npm run check` — chains the four correctness gates above.

The `Makefile` provides convenience targets for these commands; `make check` runs the same combined gate as `npm run check`.

Prototype and generated directories are outside the lint/format/build scopes. Results must be reported honestly; failures are not suppressed to make validation pass.

## Current validation status (2026-11-26)

| Command                   | Result | Notes                                                                                                                                                                                  |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts` | Pass   | Clean install from `package-lock.json`: 137 packages added, 0 vulnerabilities.                                                                                                         |
| `npm ls --depth=0`        | Pass   | All fifteen pinned root packages are installed at the selected versions.                                                                                                               |
| `npm audit --omit=dev`    | Pass   | Zero runtime vulnerabilities.                                                                                                                                                          |
| `npm audit`               | Pass   | Zero vulnerabilities.                                                                                                                                                                  |
| `npm run typecheck`       | Pass   | Strict TypeScript check succeeds for `src/` and `test/`.                                                                                                                               |
| `npm run lint`            | Pass   | ESLint succeeds with type-aware rules and the retained `@stylistic/eslint-plugin`.                                                                                                     |
| `npm run format:check`    | Pass   | Prettier succeeds for managed files.                                                                                                                                                   |
| `npm test`                | Pass   | One stdio transport smoke test passes; it performs an LSP initialize/shutdown/exit handshake and verifies that only `textDocumentSync: None` is advertised before providers exist.     |
| `npm run benchmark`       | Pass   | The runner starts and reports that no workloads are registered; no latency figures are claimed.                                                                                        |
| `npm run check`           | Pass   | The combined typecheck, lint, format and test gate passes.                                                                                                                             |
| `git diff --check`        | Pass   | Working-tree diff has no whitespace errors.                                                                                                                                            |
| `npm ls --all --json`     | Note   | Still reports `tree-sitter@0.25.1` as invalid against the parser's stale `^0.22.4` peer range. This is the documented ADR-013 override; direct-version checks and clean installs pass. |

Phase 1 parser smoke and metadata-source validation evidence remains recorded in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`. No language-feature, semantic-engine, metadata-generation or performance suites exist yet.
