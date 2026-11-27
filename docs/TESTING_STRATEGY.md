# Testing Strategy

Status: authoritative. `AGENTS.md` section 9 was completed and approved on 2026-11-25; full Phase 6, Phase 7, Phase 8 and Phase 9 local validation results, including signature help, mini-notation analysis, quick fixes, rename, document and workspace symbols, semantic tokens, formatting, the performance harness and package installation verification, added on 2026-11-27.

Authority: `AGENTS.md` section 9 and global project requirements.

## Mandate

Testing is mandatory. The framework and supporting tooling were evaluated and selected based on project requirements, and the decision is recorded here.

The prototype declared Mocha and VS Code test tooling, but its test script pointed at missing compiled files and fixture directories. Phase 2 replaced that path with a compiled ESM smoke test for the stdio transport. Phase 4 added an isolated semantic engine suite using hand-built `SyntaxDocument` fixtures. Phase 5 added a metadata-generation and language-database suite. Phase 6 added a language-feature suite, a mini-notation token suite and expanded the stdio test into an end-to-end capability integration test. Phase 7 extended the feature suite with quick-fix edits, range filtering, inline-constant refactoring, rename validation, document-symbol outline checks, workspace-symbol matching, semantic-token classification and indentation-only formatting, and the stdio tests with quick-fix and refactor code-action, document-symbol, workspace-symbol, formatting, semantic-token and rename mapping. Phase 8 added a deterministic benchmark harness with synthetic fixtures, measured p50/p95/p99 baselines and an advisory regression check; it is separate from the correctness test suites.

## Test layers

| Layer                      | Scope                                                                                                                                        | Isolation requirement                                                          | Examples                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Parser/grammar integration | Selected parser dependency, node kinds, ranges, incremental updates, recovery                                                                | Separate from semantic engine tests; no hand-written grammar copy in this repo | Edit sequences, malformed input, injected mini-notation ranges                 |
| Semantic engine            | Scopes, symbols, references, limited type inference, invalidation                                                                            | No Tree-sitter types in test contracts                                         | User functions, chained pattern calls, unresolved identifiers, stale snapshots |
| Language features          | Diagnostics, quick fixes, rename, document and workspace symbols, semantic tokens, formatting, completion, hover, signature help, navigation | Deterministic language database fixtures                                       | Safe edit contents, range filtering, accurate ranges, diagnostic suppression   |
| Mini-notation analysis     | Token boundaries, descriptions, structural faults and live-coding suppression                                                                | Lexical suite independent of the Tree-sitter adapter                           | Documented 1.2.6 operators, incomplete input, unsupported characters           |
| LSP transport              | Capability advertisement, request/response mapping, cancellation, configuration                                                              | Standard LSP clients or protocol harnesses; no editor-specific dependency      | Initialize, didChange, completion request, cancellation, shutdown              |
| Metadata generation        | Pinned source extraction and reproducibility                                                                                                 | Pinned inputs; generated output compared deterministically                     | Missing source package, version drift, known-good snapshot                     |
| Performance                | Latency and regression monitoring                                                                                                            | Dedicated harness; see `docs/PERFORMANCE.md`                                   | Open/edit/request workloads reporting p50/p95/p99                              |

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
- `npm test` — compile to ESM, then run `node --test "dist/test/**/*.test.js"`.
- `npm run test:parser` — compile to ESM, then run only `dist/test/parser/**/*.test.js` grammar/parser integration tests.
- `npm run test:semantic` — compile to ESM, then run only `dist/test/semantic/**/*.test.js` semantic engine tests.
- `npm run test:metadata` — compile to ESM, then run only `dist/test/metadata/**/*.test.js` language database tests.
- `npm run test:features` — compile to ESM, then run only `dist/test/features/**/*.test.js` language feature tests.
- `npm run test:mini` — compile to ESM, then run only `dist/test/miniNotation/**/*.test.js` token-model tests.
- `npm run generate:metadata` — regenerate the committed snapshot from pinned local inputs.
- `npm run benchmark` — build and run all benchmark workloads with p50/p95/p99 output.
- `npm run benchmark:check` — build, rerun the workloads and compare them with the committed thresholds.
- `npm run benchmark:baseline` — deliberately regenerate the committed baseline after a validated change.
- `npm run verify:package` — build, pack, verify tarball contents, install offline from the tarball and exercise the stdio executable.
- `npm run check` — chains typecheck, lint, format verification and the full test suite.

Test discovery uses quoted glob patterns instead of bare directories. Node 24 interprets positional `node --test` arguments as glob patterns and attempts to load a directory as a module; Node 26 additionally accepts directories. `test/packageScripts.test.ts` verifies that the suite patterns use globs and together cover every compiled suite file.

The `Makefile` provides convenience targets for these commands; `make check` runs the same combined gate as `npm run check`, `make test-parser`, `make test-semantic`, `make test-metadata`, `make test-features` and `make test-mini` run isolated suites, `make generate-metadata` regenerates the snapshot, `make benchmark`, `make benchmark-check` and `make benchmark-baseline` wrap the benchmark scripts, and `make verify-package` wraps the packaged installation check.

## Continuous integration

`.github/workflows/ci.yml` is the GitHub Actions workflow for pushes to `main`, pull requests and manual `workflow_dispatch` runs. It uses the pinned npm scripts as the authoritative validation logic; `make ci` is the local convenience equivalent for the correctness, packaging and benchmark checks, while CI additionally runs a runtime dependency audit.

| Job           | Node versions | Blocking checks                                                                                                                                | Notes                                                                                                                                |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `verify`      | 24, 26        | Clean install, typecheck, lint, format verification, full test suite, each isolated suite, build, tarball preview and `npm run verify:package` | Matrix covers the active LTS and current stable runtimes without changing local lint/type pinning.                                   |
| `performance` | 26            | None; clean install, build and advisory `npm run benchmark:check`                                                                              | Reports p50/p95/p99 and threshold breaches with `continue-on-error: true` because hosted hardware differs from the baseline machine. |
| `audit`       | 26            | Clean install and `npm audit --omit=dev`                                                                                                       | Full `npm audit` is informational (`continue-on-error`) because advisory data is outside PR changes.                                 |

Dependencies are installed with `npm ci --ignore-scripts` from the committed `package-lock.json`, matching the documented local install. npm download caching is keyed to that lockfile. Actions are pinned to commit SHAs with version comments, the workflow has `contents: read` permissions, and newer runs for the same ref cancel superseded runs.

CI does not publish packages or change Git state. Release publication remains a separately authorised workflow and is still blocked by the parser redistribution licence gate recorded in `docs/ROADMAP.md`. `npm run verify:package` uses the npm cache populated by the clean install in the same job; it verifies the local tarball and offline operation, not publication. Performance regression reporting is advisory as documented in `docs/PERFORMANCE.md`; the correctness gate remains blocking.

Prototype directories remain outside the lint/format/build scopes. The committed `src/languageDatabase/generated.ts` snapshot is inside those scopes and must be generator-formatted. Results must be reported honestly; failures are not suppressed to make validation pass.

## Current validation status (2026-11-27)

| Command                   | Result | Notes                                                                                                                                                                                   |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts` | Pass   | Clean install from `package-lock.json`: 137 packages added, 0 vulnerabilities.                                                                                                          |
| `npm ls --depth=0`        | Pass   | All fifteen pinned root packages are installed at the selected versions.                                                                                                                |
| `npm audit --omit=dev`    | Pass   | Zero runtime vulnerabilities.                                                                                                                                                           |
| `npm audit`               | Pass   | Zero vulnerabilities.                                                                                                                                                                   |
| `npm run typecheck`       | Pass   | Strict TypeScript check succeeds for `src/` and `test/`.                                                                                                                                |
| `npm run lint`            | Pass   | ESLint succeeds with type-aware rules and the retained `@stylistic/eslint-plugin`.                                                                                                      |
| `npm run format:check`    | Pass   | Prettier succeeds for managed files.                                                                                                                                                    |
| `npm test`                | Pass   | Fifty-four tests pass: two stdio integration, one test-script discovery regression check, five parser, seven semantic, five metadata, twenty-nine feature and five mini-notation tests. |
| `npm run test:parser`     | Pass   | Five parser integration tests pass independently of semantic tests.                                                                                                                     |
| `npm run test:semantic`   | Pass   | Seven semantic engine tests pass independently of parser tests.                                                                                                                         |
| `npm run test:metadata`   | Pass   | Five metadata generation and language database tests pass independently of parser and semantic suites.                                                                                  |
| `npm run test:features`   | Pass   | Twenty-nine provider tests pass independently of parser and metadata suites.                                                                                                            |
| `npm run test:mini`       | Pass   | Five mini-notation token tests pass independently of the Tree-sitter adapter.                                                                                                           |
| `npm run benchmark`       | Pass   | Eighteen deterministic workloads report p50, p95 and p99 in milliseconds over committed synthetic fixtures.                                                                             |
| `npm run benchmark:check` | Pass   | Current percentiles are within the committed warning thresholds and all workload IDs are present.                                                                                       |
| `npm run verify:package`  | Pass   | Tarball contains the server, README and licence but no tests or benchmarks; runtime-only offline install and stdio initialize/shutdown succeeded.                                       |
| `npm run check`           | Pass   | The combined typecheck, lint, format and test gate passes.                                                                                                                              |
| `git diff --check`        | Pass   | Working-tree diff has no whitespace errors.                                                                                                                                             |
| `npm ls --all`            | Pass   | `tree-sitter-strudel@2.0.2` declares `tree-sitter ^0.25.0`; no invalid peer-range warning remains. Only unrelated optional peer notices are reported.                                   |

The CI workflow was added on 2026-11-27. A GitHub-hosted Node 24 run exposed the bare-directory test discovery failure; test scripts now pass compiled test globs. Node 24 is not installed locally, so glob execution was verified on Node 26 while `test/packageScripts.test.ts` guards the script form for both supported versions.

Phase 1 parser smoke evidence and the Phase 3 upgrade validation are recorded in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`. The parser suite runs against `tree-sitter-strudel@2.0.2` and covers stable node kinds and ranges, chained method calls, variable declarations, UTF-16 positions with non-ASCII input, incremental edit/reparse, and malformed-input recovery. The Phase 4 semantic suite covers symbol and scope resolution, pattern inference, mini-notation argument contexts, imports, incomplete input, incremental reuse, invalidation and cancellation. The Phase 5 metadata suite covers deterministic regeneration, pinned provenance, offline catalog lookup, version selection, runtime-derived entries and semantic-engine integration. The Phase 6 feature suite covers conservative diagnostics, malformed input, position-aware completion, hover content, resolved-symbol navigation, signature help, mini-notation diagnostics and hover, and incremental mini-notation range shifting. Phase 7 adds quick-fix edit contents, range filtering and non-actionable diagnostics, inline-constant refactor edits, range filtering and unsafe-binding rejection, plus rename edits, prepare ranges, invalid names, incomplete input, document-symbol ranges and hierarchy, workspace-symbol relaxed matching, container names and result limits, semantic-token classification, and formatting indentation, preferences and protected content, to the feature suite. The mini-notation suite covers documented 1.2.6 operators, token descriptions, structural faults, expected-closer metadata, incomplete input and unsupported-character progress. The stdio integration tests cover advertised capabilities, all implemented request types, diagnostic publication, quick-fix and inline-refactor code-action, document-symbol and workspace-symbol, formatting, semantic-token and rename mapping, workspace file scanning with open-document overrides, document closure and rapid-edit version suppression. Phase 8 adds a separate benchmark harness rather than a node:test suite: `scripts/benchmark.mjs` measures 18 layer-boundary workloads over committed synthetic fixtures, uses five warm-up iterations and five batches of 20 measured samples, reporting nearest-rank percentiles as the median across batches, and compares them with `benchmarks/baseline.json`. The baseline records environment metadata, measured percentiles and numeric warning thresholds; `npm run benchmark:check` fails on a breach or missing workload. CI runs that check as advisory (`continue-on-error: true`) because hosted hardware differs from the baseline machine, so latency variance cannot block correctness work. Detailed results, thresholds and limitations are in `docs/PERFORMANCE.md`. Phase 9 adds a packaging check rather than another correctness suite: `scripts/verify-package.mjs` packs the built server, asserts the tarball allowlist, performs a runtime-only offline install from that tarball using the npm cache and committed lockfile, and verifies the installed executable with an LSP initialize/shutdown handshake. Publication itself remains blocked as recorded in `docs/ROADMAP.md`.
