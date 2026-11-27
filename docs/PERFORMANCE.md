# Performance

Status: Phase 24 scale and responsiveness work is complete and committed as `0f30fe5` in the published `0.5.0` release. The layer baseline contains 20 measured workloads, including two real-corpus workloads; opt-in local timing is available; performance thresholds remain advisory. Phase 25 published `0.5.0` through the controlled OIDC workflow, with registry, provenance, clean-install and installed stdio evidence recorded in ADR-076.

Authority: `AGENTS.md` section 6.

## Requirements

Performance is a first-class architectural requirement from the beginning.

- Design for incremental parsing and semantic analysis.
- Avoid unnecessary full-document recomputation.
- Cancel or discard obsolete and superseded requests where appropriate.
- Keep completion, hover and diagnostics responsive during active editing.
- Avoid blocking the LSP communication loop with expensive work.
- Benchmark representative real-world Strudel documents and projects.
- Measure rather than rely on assumptions.
- Maintain dedicated benchmarks and regression monitoring.

Track p50, p95 and p99 latency. Average execution time alone is not sufficient.

## Workloads

The committed layer harness is `scripts/benchmark.mjs`. It imports the compiled ESM modules from `dist/src/` and measures transport-independent layer boundaries; it does not spawn a language-server process or include JSON-RPC serialisation. A second harness, `scripts/benchmark-e2e.mjs`, measures one installed-binary JSON-RPC path and reports it separately in `benchmarks/end-to-end.json`; it has no thresholds and is not part of the layer baseline. Both harnesses share constants and percentile helpers from `scripts/lib/benchmarkStats.mjs`. Synthetic fixtures are hand-authored for this repository and described in `benchmarks/fixtures/README.md`.

| Workload                       | Fixture                           | Operation                                                                      |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------ |
| `parse-small`                  | `small-live-edit.strudel`         | Full Tree-sitter parse of a small live-coding buffer.                          |
| `parse-analyze-medium`         | `medium-composition.strudel`      | Full parse and semantic analysis with user-defined functions and chains.       |
| `parse-analyze-large`          | `large-pattern-set.strudel`       | Full parse and semantic analysis of many declarations and mini-notation calls. |
| `incremental-edit-small`       | `small-live-edit.strudel`         | Incremental syntax update plus semantic update for a one-character edit.       |
| `incremental-edit-large`       | `large-pattern-set.strudel`       | The same update on the large fixture.                                          |
| `diagnostics-small`            | `small-live-edit.strudel`         | Diagnostic derivation with default configuration applied to a valid buffer.    |
| `diagnostics-incomplete`       | `incomplete-live.strudel`         | Resilient diagnostics for partially typed input.                               |
| `completion-medium`            | `medium-composition.strudel`      | Pattern-method completion after a dot.                                         |
| `hover-large`                  | `large-pattern-set.strudel`       | Hover for a resolved declaration.                                              |
| `definition-large`             | `large-pattern-set.strudel`       | Definition lookup for a resolved reference.                                    |
| `signature-help-medium`        | `medium-composition.strudel`      | Signature help inside a pattern-method call.                                   |
| `document-symbols-large`       | `large-pattern-set.strudel`       | Outline traversal.                                                             |
| `workspace-symbols-scan`       | `workspace/`                      | Bounded file discovery, parsing, analysis and workspace-symbol query.          |
| `formatting-medium`            | `medium-composition.strudel`      | Indentation-only formatting of an unformatted copy.                            |
| `semantic-tokens-large`        | `large-pattern-set.strudel`       | Full-document semantic-token classification.                                   |
| `quick-fixes-small`            | `small-live-edit.strudel`         | Quick-fix derivation from fresh configured diagnostics.                        |
| `refactor-inline-small`        | `small-live-edit.strudel`         | Inline-constant eligibility scan.                                              |
| `rename-large`                 | `large-pattern-set.strudel`       | Rename preparation and edit computation.                                       |
| `parse-analyze-real-corpus`    | `@strudel/reference@1.2.2` sample | Full parse and analysis of 24 deterministic documentation examples.            |
| `incremental-edit-real-corpus` | `@strudel/reference@1.2.2` sample | Incremental syntax and semantic update of the same 24 examples.                |

### Real-corpus provenance and redistribution

The two real workloads read examples from the pinned development dependency `@strudel/reference@1.2.2`, whose tarball, integrity hash, repository and `AGPL-3.0-or-later` licence are recorded in `validation/real-corpus.json`. The project licence is `AGPL-3.0-only`, so the `or-later` grant permits use under the project's terms. No example text was copied into this repository: the runner verifies the installed package's provenance and the SHA-256 corpus hash against the committed validation report, excludes the seven accepted parser-gap examples, then selects every 20th clean example for a deterministic 24-example sample. Benchmark runs are offline after installation and do not fetch the tarball.

This is authoritative JSDoc example material rather than a capture of private user projects. It supplements, and does not replace, the synthetic fixtures that deliberately cover malformed live-coding states and large composition shapes.

## End-to-end installed-binary workload

`scripts/benchmark-e2e.mjs` packs the built server with an isolated npm cache, installs the tarball offline from the pinned lockfile into a temporary project, verifies the native parser prebuild, and launches the installed `node_modules/.bin/strudel-lsp-server` shim. The single `jsonrpc-installed-document-symbol` workload sends `textDocument/didChange` followed by a `textDocument/documentSymbol` request, so the timed path includes JSON-RPC framing, IPC, parsing, semantic analysis and response serialisation. Five server processes each perform five warm-up and twenty measured cycles; the same nearest-rank-within-batch and median-across-batches method is used for percentiles.

| Workload                            | Fixture                   | Measured p50 | Measured p95 | Measured p99 | Samples |
| ----------------------------------- | ------------------------- | -----------: | -----------: | -----------: | ------: |
| `jsonrpc-installed-document-symbol` | `small-live-edit.strudel` |        0.443 |        0.921 |        1.120 |     100 |

These values are advisory evidence from linux-x64 with Node `v26.13.1` and a 12th Gen Intel Core i9-12900KF. The machine-readable report is `benchmarks/end-to-end.json`; it has `advisory: true`, no thresholds and no entry in `benchmarks/baseline.json`. The harness builds, packs and installs the current working tree, so the `packageVersion: "0.4.0"` output is only the unchanged manifest version, not a registry download. This is not an editor-latency measurement and is not a blocking correctness gate; ADR-057 records the separation from the layer results.

## Measurement methodology

1. Build with `npm run build`; the benchmark runner consumes compiled modules.
2. Run five warm-up iterations per workload, then five batches of 20 measured iterations.
3. Time each operation with `node:perf_hooks.performance.now` in milliseconds. Preparation, file reads for the setup contexts and result consumption are outside the timed expression, except that file discovery is deliberately timed for `workspace-symbols-scan` because it is part of that LSP request.
4. Within each batch, use nearest-rank percentiles: index `ceil(q × n) - 1`. Report the median of the five batch percentiles for p50, p95 and p99, plus minimum, maximum and the total sample count. This prevents a single GC or scheduling pause from becoming the sole tail sample while still detecting sustained tail latency.
5. Compare incremental updates against full parse and analysis using the small, large and real-corpus workloads.
6. Store the machine-readable baseline in `benchmarks/baseline.json`, including its generating commit's environment and the real-corpus sample size.
7. Re-run the check on dependency, parser, semantic or feature-provider changes.

Run `npm run benchmark` for layer figures, `npm run benchmark:check` to compare them with the committed baseline, and `npm run benchmark:baseline` to deliberately replace that baseline. Run `npm run benchmark:timing` for the opt-in local-only diagnosis described below. Run `npm run benchmark:e2e` for the separate installed-binary figures and `npm run benchmark:e2e:write` to refresh its advisory report. The Makefile exposes the same commands as `make benchmark`, `make benchmark-check`, `make benchmark-baseline`, `make benchmark-timing`, `make benchmark-e2e` and `make benchmark-e2e-write`.

## Baseline environment

The committed baseline was generated on 2026-11-27 with:

- Node.js v26.13.1, Linux x64, 12th Gen Intel Core i9-12900KF, 24 logical CPUs, 31.141 GiB memory.
- `tree-sitter-strudel` 2.0.2, Strudel core 1.2.6, TypeScript 6.0.3.
- Development build via `tsc`, no minification and no editor client process.

The published `0.4.0` Phase 18 baseline used the same machine and dependency versions. CI runs on different hardware, so its latency results are advisory. No hardware-normalisation multiplier is invented: comparisons are made against the committed baseline only when the recorded environment matches, and the CI job reports rather than blocks. A persistent local failure must be investigated with the recorded environment.

## Results and targets

The following values are the committed Phase 24 baseline in milliseconds. Targets are warning thresholds, not correctness assertions.

| Workload                       | Baseline p50 | Baseline p95 | Baseline p99 | Target p50 | Target p95 | Target p99 |
| ------------------------------ | -----------: | -----------: | -----------: | ---------: | ---------: | ---------: |
| `parse-small`                  |        0.209 |        0.241 |        0.263 |      0.418 |      0.603 |      0.789 |
| `parse-analyze-medium`         |        0.923 |        1.103 |        2.063 |      1.846 |      2.758 |      6.189 |
| `parse-analyze-large`          |        5.964 |        8.088 |        8.340 |     11.928 |     20.220 |     25.020 |
| `incremental-edit-small`       |        0.245 |        0.273 |        0.286 |      0.490 |      0.683 |      0.858 |
| `incremental-edit-large`       |        6.532 |        6.668 |        6.918 |     13.064 |     16.670 |     20.754 |
| `diagnostics-small`            |        0.004 |        0.005 |        0.005 |      0.050 |      0.050 |      0.050 |
| `diagnostics-incomplete`       |        0.001 |        0.001 |        0.001 |      0.050 |      0.050 |      0.050 |
| `completion-medium`            |        0.148 |        0.181 |        0.202 |      0.296 |      0.453 |      0.606 |
| `hover-large`                  |        0.002 |        0.003 |        0.005 |      0.050 |      0.050 |      0.050 |
| `definition-large`             |        0.001 |        0.002 |        0.005 |      0.050 |      0.050 |      0.050 |
| `signature-help-medium`        |        0.004 |        0.012 |        0.023 |      0.050 |      0.050 |      0.069 |
| `document-symbols-large`       |        0.009 |        0.011 |        0.026 |      0.050 |      0.050 |      0.078 |
| `workspace-symbols-scan`       |        1.001 |        1.089 |        1.195 |      2.002 |      2.723 |      3.585 |
| `formatting-medium`            |        0.022 |        0.028 |        0.032 |      0.050 |      0.070 |      0.096 |
| `semantic-tokens-large`        |        0.022 |        0.023 |        0.042 |      0.050 |      0.057 |      0.126 |
| `quick-fixes-small`            |        0.002 |        0.004 |        0.005 |      0.050 |      0.050 |      0.050 |
| `refactor-inline-small`        |        0.005 |        0.008 |        0.012 |      0.050 |      0.050 |      0.050 |
| `rename-large`                 |        0.006 |        0.007 |        0.007 |      0.050 |      0.050 |      0.050 |
| `parse-analyze-real-corpus`    |        3.094 |        3.207 |        6.431 |      6.188 |      8.018 |     19.293 |
| `incremental-edit-real-corpus` |        3.148 |        3.249 |        6.681 |      6.296 |      8.123 |     20.043 |

Targets are computed from the measured baseline as `max(baseline × factor, 0.05 ms)`, with factors of 2 for p50, 2.5 for p95 and 3 for p99. Repeated runs showed stable medians for parser and analysis workloads, occasional GC/JIT spikes in p99, and greater variance for the filesystem-backed workspace scan. The wider factors absorb that observed variability while still detecting order-of-magnitude regressions. The absolute floor avoids false failures on sub-millisecond provider calls where timer and scheduling noise exceed the operation itself.

### Incremental semantic reuse

Global declaration symbol IDs now depend on declaration identity and order, not statement text. An initializer edit that preserves the declaration's inferred type and signature reanalyses only the changed statement while unchanged statements are reused with shifted ranges when necessary; unchanged ranges share immutable statement analyses. Before reusing anything, the engine analyses a changed declaration in isolation and compares its resulting semantics with the previous document. Any inferred-type or signature change, multiple changed declarations, a declaration rename, insertion, removal, reorder or catalog-version change forces a conservative rebuild. This prevents unchanged statements from retaining types derived from an old declaration. `test/semantic/semanticEngine.test.ts` and `test/lsp/incrementalAnalysis.test.ts` cover type-preserving reuse, type-changing rebuilds, reference identity, repeated ranged edits and invalidation.

The Phase 18 baseline for `incremental-edit-large` was 7.018/7.237/7.590 ms. The Phase 24 baseline is 6.532/6.668/6.918 ms, so no latency regression remains unexplained. In an opt-in diagnosis of the large edit, 47–48 of 48 statements were reused; `document.syntax` took roughly 5.8–6.5 ms while `semantic.analyze` took roughly 0.9–1.8 ms. Tree-sitter's incremental reparse now dominates this workload, so the semantic improvement does not translate into a large p50 win, but it removes the semantic rebuild from the tail and improves p95/p99 against Phase 18.

## Regression monitoring

`npm run benchmark:check` fails locally when a current layer percentile exceeds the corresponding stored target or when a workload is missing. CI runs this command in the `performance` job with `continue-on-error: true`, as it does for the installed-binary harness. ADR-074 records the decision to keep thresholds advisory: the baseline is hardware-specific, CI hardware differs, and no measured normalisation factor can turn a cloud-runner result into a trustworthy correctness gate. Local runs on the recorded environment use the numeric targets to investigate suspected regressions; `npm run check` remains the blocking correctness gate. A contract test asserts that both benchmark steps stay advisory and that the real-corpus workloads are part of the layer baseline.

## Local-only timing boundary

`src/performance/` exposes an opt-in `LocalTimingRecorder` with a no-op default. `SemanticAnalysisOptions.timing` and the optional third argument to `DocumentAnalysisService` accept a recorder; the LSP server constructs both without one, so ordinary editor sessions record nothing and expose no new configuration, environment variable, network call or telemetry. Tests and the layer runner inject an in-memory recorder. `npm run benchmark:timing` prints event counts and durations separately from the baseline; those samples include harness preparation and are diagnostic evidence only, never a performance gate.

The records include `semantic.statements.reused`, `semantic.statements.analyzed`, `semantic.analyze`, `document.syntax` and `document.analyze`. One final-candidate run recorded 8,295 reused statement analyses against 18,480 analyzed across all workloads, confirming that reuse is active. The Phase 14 soak suite continues to sample child-process RSS externally from `ps` and reports growth as advisory diagnostics; those samples are not latency measurements and add no production telemetry.

## Current status

Phase 24 is complete and committed as `0f30fe5`. The harness records 20 workloads, the committed baseline contains measured p50/p95/p99 values and numeric warning thresholds, both real workloads verify pinned provenance before running, and CI reports advisory regressions. The final installed-binary report records 0.443/0.921/1.120 ms p50/p95/p99 over 100 samples. No performance target is a blocking correctness gate. Phase 25 published `0.5.0` through the controlled OIDC workflow, with user-facing notes in `.github/RELEASE_NOTES_v0.5.0.md`. The exact-gate installed-binary rerun recorded 0.433/0.716/0.959 ms p50/p95/p99 over 100 samples with `packageVersion: "0.5.0"`. These are advisory local observations with no threshold or baseline update; ADR-076 records the release evidence. No local publish, republish, deprecation, dist-tag change, unpublish or retag was performed.

Phase 26 step-context work kept `npm run benchmark:check` green across all 20 workloads. On this machine `completion-medium` recorded 0.154/0.194/0.211 ms and `hover-large` 0.003/0.004/0.010 ms p50/p95/p99 over 100 samples. These values remain within the stored advisory thresholds and do not change the baseline, release surface or final `v1.0.0` freeze.

Phase 26 relative import-path work kept the same 20-workload check green. `completion-medium` recorded 0.162/0.193/0.210 ms and the filesystem-backed `workspace-symbols-scan` 0.910/1.050/1.107 ms p50/p95/p99 over 100 samples. Import-path completion invokes the bounded scan only when the cursor is inside an import string and has no dedicated workload; those two existing measurements bound its provider and filesystem components separately. No baseline, threshold, release surface or final `v1.0.0` freeze was changed.

Phase 26 deprecation-metadata work kept all 20 workloads green. Final working-tree validation recorded 0.172/0.203/0.239 ms for `completion-medium`, 0.002/0.003/0.006 ms for `hover-large` and 0.979/1.113/1.124 ms for `workspace-symbols-scan` p50/p95/p99 over 100 samples. The change adds a boolean check to existing metadata-backed providers and no new workload, baseline, threshold, release surface or final `v1.0.0` freeze.
