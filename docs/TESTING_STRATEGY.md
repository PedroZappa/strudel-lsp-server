# Testing Strategy

Status: authoritative. `AGENTS.md` section 9 was completed and approved on 2026-11-25.  
Authority: `AGENTS.md` section 9 and global project requirements.

## Mandate

Testing is mandatory. The framework and supporting tooling were evaluated and selected based on project requirements, and the decision is recorded here.

There are currently no meaningful automated tests. The prototype declares Mocha and VS Code test tooling, but its test script points at missing compiled files and fixture directories, and no test cases exist.

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

Specific commands cannot be finalised until the new package and scripts exist. The eventual validation set must include:

- TypeScript type checking.
- ESLint with TypeScript-aware rules.
- Prettier formatting verification.
- The full `node --test` correctness suite.
- The dedicated performance harness reporting p50, p95 and p99.
- Relevant focused and integration checks after each change.

The current root scripts still belong to the prototype. Final scripts are established in Phase 2. Results must be reported honestly; failures are not suppressed to make validation pass.

## Current validation status (2026-11-25)

| Command                                                                                                                                                  | Result | Notes                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ls --depth=0`                                                                                                                                       | Pass   | All fifteen pinned root packages are installed at the selected versions.                                                                                                                                                                                                                               |
| `npm audit --omit=dev`                                                                                                                                   | Pass   | Zero runtime vulnerabilities.                                                                                                                                                                                                                                                                          |
| `npm audit`                                                                                                                                              | Pass   | Zero vulnerabilities after the approved `npm audit fix --ignore-scripts` transitive dev-dependency patches.                                                                                                                                                                                            |
| `npm install --ignore-scripts`                                                                                                                           | Pass   | Clean install succeeds with `.npmrc` legacy-peer override for the parser's stale peer range.                                                                                                                                                                                                           |
| `npm ls --all --json`                                                                                                                                    | Note   | Reports `tree-sitter@0.25.1` as invalid against the parser's stale `^0.22.4` peer range. This is the documented ADR-013 override; direct-version checks and clean installs pass.                                                                                                                       |
| Parser smoke validation via temporary `node --test`-independent script                                                                                   | Pass   | `tree-sitter-strudel@1.1.8` loads in `tree-sitter@0.25.1`; parse, source ranges, incremental reparse and malformed-input recovery all behaved as recorded in `docs/PARSER_INTEGRATION.md`.                                                                                                             |
| Metadata source validation via temporary Node ESM command                                                                                                | Pass   | `@strudel/reference@1.2.2` exposes `reference.docs` with 577 JSDoc records. Direct Node ESM imports of core/mini/transpiler are unavailable because of upstream `@kabelsalat/web@0.4.1` packaging; recorded in `docs/DECISIONS.md` ADR-014.                                                            |
| `npx prettier --check AGENTS.md package.json docs/DECISIONS.md docs/PARSER_INTEGRATION.md docs/TESTING_STRATEGY.md docs/PROJECT_SPEC.md docs/ROADMAP.md` | Pass   | Checked after formatting the changed Markdown files.                                                                                                                                                                                                                                                   |
| `npm run lint`                                                                                                                                           | Fail   | Pre-existing prototype sources produce 19 errors and 6 warnings in `client/src/extension.ts`, `dist/extension.js`, `server/src/server.js` and `server/src/server.ts`. The ESLint configuration itself loads correctly after retaining `@stylistic/eslint-plugin`. Prototype sources were not modified. |
| `npx tsc --noEmit -p tsconfig.json`                                                                                                                      | Fail   | `TS6059`: the root `tsconfig.json` sets `rootDir: src` while the prototype sources live in `client/` and `server/`. This is a pre-existing scaffold configuration issue.                                                                                                                               |
| `npm test`                                                                                                                                               | Fail   | The prototype script calls `client/out/test/runTest`, which is absent. No new test suite exists yet.                                                                                                                                                                                                   |
| `git diff --check`                                                                                                                                       | Fail   | Reports pre-existing whitespace issues in `.gitignore`, `neovim-test.lua` and `server/src/server.ts`. Those user changes were not altered.                                                                                                                                                             |

These failures are recorded, not suppressed. They belong to the prototype scaffold that Phase 2 will replace; no correctness, integration or performance suite has been established yet.
