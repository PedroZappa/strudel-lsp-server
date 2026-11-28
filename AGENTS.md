# AGENTS.md

## 1. Project Purpose

Build a comprehensive, editor-agnostic Language Server Protocol (LSP) implementation for **Strudel**, providing reliable language intelligence for live coding and algorithmic music composition.

The project must be designed for long-term extensibility, correctness, responsiveness and maintainability.

The target is the latest stable Strudel release. Compatibility with future releases should be considered in the architecture.

### Clean-slate development

The existing repository implementation is an experimental prototype, not an architectural foundation.

- Existing implementation code, project structure, dependencies, build configuration and tests may be replaced when necessary.
- Do not preserve prototype architecture or legacy behaviour merely for compatibility.
- Follow the approved project architecture and specifications rather than adapting the design around existing code.
- Preserve repository identity, licensing obligations, ownership information and Git history.
- Do not copy the Tree-sitter grammar or generated parser into this repository.

## 2. Sources of Truth

Dedicated documentation defines project requirements. Keep `AGENTS.md` focused on agent behaviour and development rules; do not duplicate detailed specifications here.

Maintain these documents as the project develops:

| Document                         | Ownership                                                        |
| -------------------------------- | ---------------------------------------------------------------- |
| `docs/PROJECT_SPEC.md`           | Project goals, scope and non-functional requirements             |
| `docs/ARCHITECTURE.md`           | System architecture, modules, boundaries and data flow           |
| `docs/LANGUAGE_SPECIFICATION.md` | Strudel language constructs and semantic behaviour               |
| `docs/PARSER_INTEGRATION.md`     | Tree-sitter dependency, grammar integration and parser lifecycle |
| `docs/SEMANTIC_ENGINE.md`        | Semantic model, scopes, symbols and type inference               |
| `docs/LSP_FEATURES.md`           | LSP capabilities, behaviour and implementation status            |
| `docs/TESTING_STRATEGY.md`       | Test architecture, coverage and quality requirements             |
| `docs/PERFORMANCE.md`            | Benchmarks, performance targets and regression monitoring        |
| `docs/ROADMAP.md`                | Active phases, priorities, dependencies and deferred features    |
| `docs/ROADMAP_ARCHIVE.md`        | Historical phase records and evidence through `v1.0.0`           |
| `docs/DECISIONS.md`              | Significant architectural and technical decisions                |

Update the relevant document whenever implementation changes affect its area.

If documentation conflicts, identify the inconsistency and resolve it explicitly. Do not silently choose whichever interpretation is convenient.

## 3. Core Technical Constraints

### Language and runtime

- Use TypeScript with Node.js.
- Use TypeScript strict mode.
- Use ECMAScript modules (ESM).
- Distribute the server as an npm package.
- Use standard LSP communication over stdio as the primary transport.
- Keep the server independent of individual editor implementations.
- Do not introduce standalone binary distribution requirements into the initial release.

### Language architecture

- Implement a dedicated Strudel parser integration and semantic engine.
- Do not treat Strudel as ordinary JavaScript with additional completion rules.
- Separate syntax parsing, semantic analysis, type inference, language intelligence and LSP transport.
- Use explicit interfaces and stable internal abstractions between architectural layers.
- Do not build a complete JavaScript/TypeScript compiler or type checker. Implement Strudel-specific semantics and only the JavaScript interoperability needed by the language.
- Keep the semantic engine sufficiently independent of Tree-sitter APIs to permit future parser or grammar evolution.

### Tree-sitter integration

Use the independent parser project:

https://github.com/PedroZappa/tree-sitter-strdl

- Consume it as a versioned npm dependency.
- Pin the dependency to an explicit version.
- Do not duplicate its grammar, generated parser or bindings in this repository.
- Treat the parser as the syntax layer, not the semantic engine.
- Preserve source locations and support incremental parsing.
- Keep grammar/parser integration tests separate from semantic engine tests.
- Review parser licensing and resolve any inconsistencies in its licensing metadata before adopting or redistributing it. Do not assume a particular licence without verification.
- Update the dependency deliberately and validate compatibility before accepting upgrades.

### Strudel integration and metadata

- Use a reproducible language database combining generated metadata, manually maintained semantic information and runtime integration where necessary.
- Prefer extracting information from authoritative Strudel packages and source over duplicating definitions.
- Document the origin and version of generated metadata.
- Pin source versions used by metadata generation.
- The language server must remain usable offline once dependencies and required metadata are installed.
- Design metadata handling to permit future support for multiple Strudel versions.

### Editor compatibility

- Implement standard LSP behaviour without editor-specific assumptions.
- Support any compatible LSP editor in principle.
- Editor-specific clients, configuration and examples must remain separate from the server core.
- Do not make VS Code or Neovim dependencies architectural requirements.

## 4. Language Intelligence and LSP Features

The long-term objective is comprehensive, useful Strudel IDE support.

Evaluate relevant LSP capabilities, including:

- Diagnostics and quick fixes.
- Completion and completion resolution.
- Hover documentation.
- Signature help.
- Go to definition and references.
- Rename.
- Document and workspace symbols.
- Semantic tokens.
- Formatting.
- Code actions and refactoring.
- Folding and selection ranges.
- Inlay hints.
- Call hierarchy and other applicable navigation features.
- Strudel mini-notation understanding and language-aware analysis.

Do not implement features merely to increase a feature count. Evaluate their usefulness, correctness, dependencies and maintenance cost.

Track feature status, priorities and deferred work in `docs/LSP_FEATURES.md` and `docs/ROADMAP.md`.

## 5. Diagnostics and Live Coding

Live-coding usability is a first-class design requirement.

- Prefer useful, resilient diagnostics over aggressive reporting.
- Recover from incomplete or malformed source whenever possible.
- Do not crash because a document is temporarily syntactically invalid.
- Avoid cascading diagnostics caused by incomplete context or a single upstream error.
- Delay or suppress diagnostics when the available context is insufficient for a reliable conclusion.
- Distinguish errors, warnings and informational diagnostics.
- Provide accurate source ranges and actionable messages.
- Reanalyse documents as they change.
- Keep diagnostics responsive and avoid unnecessary recomputation.

Configuration should provide sensible defaults and a focused set of options, including diagnostic severity and enablement, formatting preferences where applicable, and Strudel compatibility/version settings.

Do not expose internal engine settings without a concrete user-facing requirement.

## 6. Performance Requirements

Performance is a first-class architectural requirement from the beginning, not a later optimisation task.

- Design for incremental parsing and semantic analysis.
- Avoid unnecessary full-document recomputation.
- Cancel obsolete or superseded requests where appropriate.
- Keep completion, hover and diagnostics responsive during active editing.
- Avoid blocking the LSP communication loop with expensive work.
- Benchmark representative real-world Strudel documents and projects.
- Measure performance rather than relying on assumptions.
- Maintain dedicated benchmarks and regression monitoring.

Track latency percentiles:

- P50
- P95
- P99

Do not rely exclusively on average execution time.

Document benchmark methodology, workloads, results and regression thresholds in `docs/PERFORMANCE.md`. Establish numeric performance targets through measurement and documented decisions rather than inventing arbitrary thresholds.

## 7. Code Quality and Conventions

- Enable TypeScript strict mode and retain it.
- Use ESLint with TypeScript-aware rules.
- Use Prettier for consistent formatting.
- Run TypeScript type checking as part of validation.
- Use `camelCase` for variables and functions.
- Use `PascalCase` for classes, types and interfaces.
- Prefer explicit types and interfaces at architectural boundaries.
- Avoid unjustified `any`, unsafe type assertions and unnecessary abstractions.
- Avoid unnecessary dependencies and premature optimisation.
- Keep modules cohesive, responsibilities clear and dependencies explicit.
- Prefer deterministic, reproducible behaviour.
- Do not suppress compiler, linter or test errors merely to make validation pass.

The testing framework and supporting tooling must be evaluated and selected based on project requirements. Document the decision.

## 8. Dependencies and Package Management

- Use npm.
- Commit `package-lock.json`.
- Keep runtime and development dependencies correctly separated.
- Prefer maintained, well-supported and permissively licensed dependencies.
- Review dependency security, maintenance status, licence and suitability before adoption.
- Document significant architectural dependencies and why they are used.
- Pin critical dependencies where reproducibility requires it.
- Avoid introducing dependencies for functionality that can be implemented simply and reliably without them.
- Do not silently replace established dependencies.

**Ask for explicit approval before installing new dependencies or software.**

## 9. Testing and Verification

Testing is mandatory.

- Evaluate and select the testing framework and supporting tooling based on project requirements. Record the selected tooling and rationale in `docs/TESTING_STRATEGY.md`.
- Test observable behaviour, including relevant edge cases and error paths. Choose test scope by risk and impact: unit tests for isolated semantics, integration and contract tests for layer boundaries and LSP behaviour, and dedicated benchmarks for performance. Do not add mechanical tests for trivial code when a more meaningful integration test is appropriate.
- Maintain separate suites for grammar/parser integration, semantic engine behaviour, language features, LSP transport and metadata generation. Parser tests must not depend on semantic engine internals, and semantic tests must not depend on Tree-sitter APIs.
- Include live-coding fixtures: incomplete or malformed input, partial calls and chains, invalid mini-notation, rapid edits, cancellation and recovery. Tests must be deterministic and must not require network access at runtime.
- Every bug fix must add or update a regression test that fails before the fix. Do not change, weaken, skip or delete tests merely to make validation pass; any test change requires a sound rationale and explicit authorization.
- Run applicable type checks, linting, formatting verification, focused tests and broader relevant checks. Run performance benchmarks when changes can affect latency; report p50, p95 and p99 rather than averages alone.
- Verify regressions and integration boundaries, not only newly added code. Report exactly what was and was not run.
- Never claim a build, test or behaviour passed unless it was actually verified. Never claim completion while known failures or material unresolved issues remain.
- Record validation commands, results and known limitations in the project documentation or change description as appropriate.

## 10. Authoritative References and Evidence Hierarchy

When deciding whether to support a Strudel language construct, prefer evidence in this order:

1. Official Strudel documentation.
2. Actual Strudel source code and runtime.
3. Official Strudel examples and tutorials.
4. Maintained community examples.
5. ECMAScript specifications and established JavaScript grammar references.

Record evidence supporting significant new syntax or semantic requirements. Distinguish documented language behavior from incidental runtime implementation behavior. Do not chase experimental features without evidence of relevance to real Strudel compositions.

## 11. Continuous Validation

Run tests and validation continuously throughout implementation. Do not postpone validation until the end of a phase or task.

- Run focused checks after meaningful changes.
- Run the broader applicable checks before declaring a phase or task complete.
- Revalidate integration boundaries and previously working behavior, not only new code.
- Report exactly what was and was not run.
- Never claim that a build, test, benchmark or validation step passed unless it was actually executed.

## 12. Makefile Workflow

Maintain a `Makefile` as the canonical entry point for developer and agent workflows in this repository.

- When working on the project, keep the `Makefile` updated with rules or recipes useful for working with the project.
- If a new workflow, command or tool is introduced or discovered, add a corresponding target so it is available through `make`.
- Keep the help listing and `.PHONY` declarations consistent with the available targets.
- Makefile rules are convenience wrappers. They must not duplicate or replace the authoritative `package.json` scripts, TypeScript configuration or documentation as the source of build and validation logic.

## 13. Implementation Roadmap

Implement the project through the explicit phases maintained in `docs/ROADMAP.md`. Completed phases and their evidence are preserved in `docs/ROADMAP_ARCHIVE.md`; they remain historical records and are not reopened without an explicit decision.

- Each phase must state its dependencies, tasks and exit criteria.
- Do not claim a phase is complete until its exit criteria are satisfied and verified.
- Priorities and candidate capabilities in the roadmap are proposals; implement them only when authorized.
- Phases may be adjusted when implementation reveals better approaches.
- Explain significant deviations from the active roadmap in `docs/ROADMAP.md` or `docs/DECISIONS.md`; corrections to completed records belong in `docs/ROADMAP_ARCHIVE.md` and must not rewrite published evidence.

## 14. Architectural Decisions

When encountering a significant architectural decision not covered by this document or the dedicated specifications:

1. Explain the problem.
2. Identify viable alternatives.
3. Present a recommendation and its rationale.
4. Stop and request approval when the decision materially affects architecture, compatibility, licensing or project direction.

Do not silently introduce major architectural changes. Record accepted decisions in `docs/DECISIONS.md`.

## 15. CI/CD and Release Management

Maintain automated CI for pull requests and pushes as the project matures. Validation must cover grammar/parser integration, type checking, linting, formatting, tests, incremental parsing correctness, compatibility and performance regressions. Performance checks must account for hardware variability and distinguish correctness failures from performance warnings.

Release policy:

- Use versioned releases.
- Validate package contents before publishing.
- Maintain release notes and a changelog.
- Publish npm packages through controlled workflows.
- Never publish automatically from ordinary commits.
- Require explicit release authorization.

## 16. Licensing and Provenance

Licensing compliance is mandatory.

- Before substantial implementation or reuse of external code, verify the authoritative licence and investigate discrepancies between licence declarations.
- Verify compatibility of external code and dependencies.
- Preserve copyright and attribution notices.
- Document reused code, assets and their sources.
- Verify dependency licences.
- Distinguish inspiration from actual code reuse.
- Record licensing decisions and evidence in `docs/DECISIONS.md`.
- Do not change, select or replace the project licence without explicit approval.

Stop and request clarification whenever licensing compatibility is uncertain.

## 17. Agent Safety and Git Permissions

### Mandatory approval requirements

Stop and ask before:

- Installing dependencies or software.
- Using `sudo`.
- Deleting files or directories.
- Performing database migrations.
- Executing untrusted scripts or plugins for the first time.
- Performing operations with significant destructive consequences.

### Git permissions

- Read-only Git inspection is unrestricted.
- Every Git command that modifies repository state requires explicit per-command approval.
- Never commit without an explicit request.
- Never amend, rebase, reset, force-push, or otherwise modify Git history without explicit approval.
- After every commit, push all local branches to the GitHub remote (`git push --all origin`). The user has given standing explicit authorization for this push as part of the commit workflow, so it does not require a separate per-command approval each time.

## 18. Definition of Done

A task is complete only when all applicable requirements are satisfied.

### Implementation

- Follows the established architecture and specifications.
- Meets the requested behavior.
- Does not introduce unnecessary complexity.

### Testing and verification

- Relevant tests are added or updated.
- Existing tests and integration boundaries are verified.
- Regression coverage is maintained.
- Incremental parsing and semantic update behavior remain correct where relevant.
- Applicable type checks, linting, formatting checks, tests and benchmarks are run.
- Validation results are reported honestly.

### Documentation and changes

- Generated artifacts remain synchronized where applicable.
- Relevant documentation is updated.
- Compatibility implications are documented.
- Public syntax-tree or protocol behavior changes are intentional and documented.

### Reporting

Clearly distinguish:

- Completed and verified work.
- Completed but unverified work.
- Outstanding work.
- Known limitations.

For milestones, all applicable acceptance criteria and CI checks must pass. A feature is not complete merely because its implementation appears to work.
