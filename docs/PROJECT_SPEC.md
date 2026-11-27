# Project Specification

Status: preparation document updated with resolved blocker decisions, 2026-11-25  
Authority: `AGENTS.md` sections 1–9.

## Purpose

Build an editor-agnostic Language Server Protocol implementation for **Strudel** that provides reliable language intelligence for live coding and algorithmic music composition. The server is intended for long-term extensibility, correctness, responsiveness and maintainability.

## Product shape

- TypeScript on Node.js, with `strict` mode enabled and retained.
- ECMAScript modules.
- Distributed as an npm package.
- Standard LSP over stdio is the primary transport.
- Usable offline once dependencies and required language metadata are installed.
- Independent of individual editors; editor-specific clients, configuration and examples stay outside the server core.

## Target language version

The target is the latest stable Strudel release. As of 2026-11-25, `@strudel/core` latest is `1.2.6` (published 2026-01-17). Metadata generation must pin authoritative source versions, and the metadata design must permit future support for multiple Strudel versions.

Source: <https://registry.npmjs.org/@strudel/core>

## Functional scope

The long-term objective is comprehensive, useful Strudel IDE support. Candidate capabilities are diagnostics and quick fixes, completion and completion resolution, hover documentation, signature help, go to definition and references, rename, document and workspace symbols, semantic tokens, formatting, code actions and refactoring, folding and selection ranges, inlay hints, call hierarchy, and Strudel mini-notation understanding.

Capabilities are selected by usefulness, correctness, dependency cost and maintenance cost. A feature is not implemented merely to increase the feature count. Status and priority belong in `docs/LSP_FEATURES.md` and `docs/ROADMAP.md`.

## Non-goals

- A complete JavaScript or TypeScript compiler or type checker.
- Treating Strudel as ordinary JavaScript plus completion rules.
- Standalone binary distribution in the initial release.
- Editor-specific assumptions or dependencies in the server core.
- Copying the Tree-sitter grammar, generated parser or bindings into this repository.

## Quality attributes

- **Correctness:** Strudel-specific semantics, accurate source ranges and actionable messages.
- **Resilience:** incomplete and temporarily malformed live-coding input must not crash the server or produce cascading diagnostics.
- **Responsiveness:** incremental parsing and analysis, cancellation of obsolete work, no expensive work blocking the LSP loop.
- **Maintainability:** explicit interfaces and stable abstractions between architectural layers.
- **Reproducibility:** pinned dependencies and metadata sources, committed lockfile, deterministic behaviour.
- **Measured performance:** p50, p95 and p99 latency tracked with representative workloads; thresholds established from measurement rather than invented.

## Clean-slate baseline

`AGENTS.md` designates the existing repository implementation as an experimental prototype, not an architectural foundation. Existing implementation code, project structure, dependencies, build configuration and tests may be replaced. Prototype behaviour is not preserved merely for compatibility.

Verified baseline at 2026-11-25:

- No `docs/` directory existed before preparation.
- The prototype is a VS Code extension layout with three npm projects and a single-file CommonJS server.
- The server has hardcoded completion/sample lists, naive bracket-counting diagnostics and stub definition/references handlers; it has no parser, semantic engine, benchmarks or real tests.
- The client starts the server with IPC while the server implements stdio and TCP, so the checked-out client/server pair is inconsistent.
- Stale generated JavaScript and build artifacts are committed.
- Six tracked files were modified before preparation and remain user work that must be preserved.

Repository identity, Git history, ownership information and licensing obligations remain preserved. Licence and metadata resolutions are recorded in `docs/DECISIONS.md`.

## Approved toolchain baseline

The user approved installation of the pinned root dependencies on 2026-11-25:

- Runtime: `tree-sitter@0.25.1`, `tree-sitter-strudel@2.0.2` (upgraded from 1.1.8 on 2026-11-26), `vscode-languageserver@11.0.1`, `vscode-languageserver-textdocument@1.0.16`
- Development: `@eslint/js@9.33.0`, `@strudel/core@1.2.6`, `@strudel/mini@1.2.6`, `@strudel/reference@1.2.2`, `@strudel/transpiler@1.2.6`, `@stylistic/eslint-plugin@2.13.0`, `@types/node@26.6.10`, `eslint@9.33.0`, `prettier@3.10.1`, `typescript@6.0.3`, `typescript-eslint@8.74.0`

`.npmrc` sets `legacy-peer-deps=true`. The original rationale was `tree-sitter-strudel@1.1.8`'s stale `tree-sitter ^0.22.4` peer range; 2.0.2 now declares an accurate `^0.25.0` peer. The setting remains until all dependencies are confirmed compatible without it. See `docs/DECISIONS.md`, `docs/PARSER_INTEGRATION.md` and `docs/TESTING_STRATEGY.md`.

## Authoritative metadata source set

The language database generation inputs are pinned to the following exact packages:

| Package               | Version | Purpose                                          |
| --------------------- | ------- | ------------------------------------------------ |
| `@strudel/reference`  | 1.2.2   | Generated JSDoc records for documented functions |
| `@strudel/core`       | 1.2.6   | Core pattern semantics and export names          |
| `@strudel/mini`       | 1.2.6   | Mini-notation semantics                          |
| `@strudel/transpiler` | 1.2.6   | Strudel source transformation behaviour          |

All four packages come from `git+https://codeberg.org/uzu/strudel.git` and declare `AGPL-3.0-or-later`. Generated metadata must record package names, versions, tarball integrity and this licence provenance.

`@strudel/reference@1.2.2` exports `reference.docs`, a 577-entry array of JSDoc records. Direct Node ESM imports of core/mini/transpiler fail because of upstream `@kabelsalat/web@0.4.1` packaging; those packages are source/integrity inputs until a Node-compatible extraction path is implemented. See `docs/DECISIONS.md` ADR-014.

## Decisions and open items

| Topic                                                  | Status                                                                   | Owner document                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------- |
| Parser licence policy                                  | Resolved: project uses AGPL-3.0-only to match the pinned parser          | `docs/PARSER_INTEGRATION.md`, `docs/DECISIONS.md` |
| Upstream parser licence file correction                | Solved for 2.0.2: metadata and LICENSE both declare AGPL-3.0             | `docs/PARSER_INTEGRATION.md`, `docs/DECISIONS.md` |
| Parser redistribution licence gate                     | Resolved: AGPL-3.0-only project licence; publication needs authorization | `docs/PARSER_INTEGRATION.md`, `docs/DECISIONS.md` |
| Exact parser npm version, provenance and compatibility | Resolved: `tree-sitter-strudel@2.0.2` with `tree-sitter@0.25.1`          | `docs/PARSER_INTEGRATION.md`, `docs/DECISIONS.md` |
| Missing `AGENTS.md` section 9                          | Resolved: complete section approved                                      | `docs/DECISIONS.md`, `docs/TESTING_STRATEGY.md`   |
| Test tooling                                           | Accepted and installed: `node:test` over compiled TypeScript output      | `docs/TESTING_STRATEGY.md`                        |
| Metadata source packages and pinned versions           | Resolved: reference 1.2.2 and core/mini/transpiler 1.2.6                 | `docs/DECISIONS.md`, `docs/PROJECT_SPEC.md`       |
| Generated metadata snapshot and offline lookup         | Resolved: Phase 5 generator, committed snapshot and database adapter     | `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`       |
| Development-only npm audit advisories                  | Resolved: patched transitively; full audit reports zero vulnerabilities  | `docs/DECISIONS.md`, `docs/TESTING_STRATEGY.md`   |
| Repository licence metadata mismatch                   | Resolved: AGPL-3.0-only, `Copyright (c) 2025-present Zedro`              | `docs/DECISIONS.md`, `LICENSE`                    |

## External sources

- <https://strudel.cc/>
- <https://registry.npmjs.org/@strudel/core>
- <https://strudel.cc/learn/mini-notation/>
- <https://github.com/PedroZappa/tree-sitter-strdl>
- <https://registry.npmjs.org/tree-sitter-strdl>
