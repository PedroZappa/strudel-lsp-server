# Performance

Status: Phase 8 benchmark harness, workloads, baseline and advisory regression check implemented on 2026-11-27; the separate advisory installed-binary harness was added for Phase 14 work and is published in `0.2.0` on 2026-11-27.

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

The committed layer harness is `scripts/benchmark.mjs`. It imports the compiled ESM modules from `dist/src/` and measures transport-independent layer boundaries; it does not spawn a language-server process or include JSON-RPC serialisation. A second harness, `scripts/benchmark-e2e.mjs`, measures one installed-binary JSON-RPC path and reports it separately in `benchmarks/end-to-end.json`; it has no thresholds and is not part of the layer baseline. Both harnesses share constants and percentile helpers from `scripts/lib/benchmarkStats.mjs`. Fixtures are synthetic buffers hand-authored for this repository and described in `benchmarks/fixtures/README.md`.

| Workload                 | Fixture                      | Operation                                                                      |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| `parse-small`            | `small-live-edit.strudel`    | Full Tree-sitter parse of a small live-coding buffer.                          |
| `parse-analyze-medium`   | `medium-composition.strudel` | Full parse and semantic analysis with user-defined functions and chains.       |
| `parse-analyze-large`    | `large-pattern-set.strudel`  | Full parse and semantic analysis of many declarations and mini-notation calls. |
| `incremental-edit-small` | `small-live-edit.strudel`    | Incremental syntax update plus semantic update for a one-character edit.       |
| `incremental-edit-large` | `large-pattern-set.strudel`  | The same update on the large fixture.                                          |
| `diagnostics-small`      | `small-live-edit.strudel`    | Diagnostic derivation with default configuration applied to a valid buffer.    |
| `diagnostics-incomplete` | `incomplete-live.strudel`    | Resilient diagnostics for partially typed input.                               |
| `completion-medium`      | `medium-composition.strudel` | Pattern-method completion after a dot.                                         |
| `hover-large`            | `large-pattern-set.strudel`  | Hover for a resolved declaration.                                              |
| `definition-large`       | `large-pattern-set.strudel`  | Definition lookup for a resolved reference.                                    |
| `signature-help-medium`  | `medium-composition.strudel` | Signature help inside a pattern-method call.                                   |
| `document-symbols-large` | `large-pattern-set.strudel`  | Outline traversal.                                                             |
| `workspace-symbols-scan` | `workspace/`                 | Bounded file discovery, parsing, analysis and workspace-symbol query.          |
| `formatting-medium`      | `medium-composition.strudel` | Indentation-only formatting of an unformatted copy.                            |
| `semantic-tokens-large`  | `large-pattern-set.strudel`  | Full-document semantic-token classification.                                   |
| `quick-fixes-small`      | `small-live-edit.strudel`    | Quick-fix derivation from fresh configured diagnostics.                        |
| `refactor-inline-small`  | `small-live-edit.strudel`    | Inline-constant eligibility scan.                                              |
| `rename-large`           | `large-pattern-set.strudel`  | Rename preparation and edit computation.                                       |

The fixtures use syntax representative of Strudel 1.2.6 as pinned by `package.json`; no external composition was copied. The workspace fixture includes a nested directory and a non-Strudel file so extension filtering is exercised.

## End-to-end installed-binary workload

`scripts/benchmark-e2e.mjs` packs the built server with an isolated npm cache, installs the tarball offline from the pinned lockfile into a temporary project, verifies the native parser prebuild, and launches the installed `node_modules/.bin/strudel-lsp-server` shim. The single `jsonrpc-installed-document-symbol` workload sends `textDocument/didChange` followed by a `textDocument/documentSymbol` request, so the timed path includes JSON-RPC framing, IPC, parsing, semantic analysis and response serialisation. Five server processes each perform five warm-up and twenty measured cycles; the same nearest-rank-within-batch and median-across-batches method is used for percentiles.

| Workload                            | Fixture                   | Measured p50 | Measured p95 | Measured p99 | Samples |
| ----------------------------------- | ------------------------- | -----------: | -----------: | -----------: | ------: |
| `jsonrpc-installed-document-symbol` | `small-live-edit.strudel` |        0.337 |        0.575 |        0.735 |     100 |

These values are advisory evidence from darwin-arm64 with Node `v26.8.2` and an Apple M4 Pro. The machine-readable report is `benchmarks/end-to-end.json`; it has `advisory: true`, no thresholds and no entry in `benchmarks/baseline.json`. This is not an editor-latency measurement and is not a blocking correctness gate; ADR-057 records the separation from the layer results.

## Measurement methodology

1. Build with `npm run build`; the benchmark runner consumes compiled modules.
2. Run five warm-up iterations per workload, then five batches of 20 measured iterations.
3. Time each operation with `node:perf_hooks.performance.now` in milliseconds. Preparation, file reads for the setup contexts and result consumption are outside the timed expression, except that file discovery is deliberately timed for `workspace-symbols-scan` because it is part of that LSP request.
4. Within each batch, use nearest-rank percentiles: index `ceil(q × n) - 1`. Report the median of the five batch percentiles for p50, p95 and p99, plus minimum, maximum and the total sample count. This prevents a single GC or scheduling pause from becoming the sole tail sample while still detecting sustained tail latency.
5. Compare incremental updates against full parse and analysis using the small and large fixtures.
6. Store the machine-readable baseline in `benchmarks/baseline.json`, including its generating commit's environment.
7. Re-run the check on dependency, parser, semantic or feature-provider changes.

Run `npm run benchmark` for layer figures, `npm run benchmark:check` to compare them with the committed baseline, and `npm run benchmark:baseline` to deliberately replace that baseline. Run `npm run benchmark:e2e` for the separate installed-binary figures and `npm run benchmark:e2e:write` to refresh its advisory report. The Makefile exposes the same commands as `make benchmark`, `make benchmark-check`, `make benchmark-baseline`, `make benchmark-e2e` and `make benchmark-e2e-write`.

## Baseline environment

The committed baseline was generated on 2026-11-27 with:

- Node.js v26.13.1, Linux x64, 12th Gen Intel Core i9-12900KF, 24 logical CPUs, 31.141 GiB memory.
- `tree-sitter-strudel` 2.0.2, Strudel core 1.2.6, TypeScript 6.0.3.
- Development build via `tsc`, no minification and no editor client process.

CI runs on different hardware, so the performance job is advisory. A slower cloud runner can exceed these targets without proving a code regression; a persistent or local failure must be investigated with the recorded environment.

## Results and targets

The following values are the committed baseline in milliseconds. Targets are warning thresholds, not correctness assertions.

| Workload                 | Baseline p50 | Baseline p95 | Baseline p99 | Target p50 | Target p95 | Target p99 |
| ------------------------ | -----------: | -----------: | -----------: | ---------: | ---------: | ---------: |
| `parse-small`            |        0.225 |        0.248 |        0.310 |      0.450 |      0.620 |      0.930 |
| `parse-analyze-medium`   |        0.922 |        1.456 |        1.628 |      1.844 |      3.640 |      4.884 |
| `parse-analyze-large`    |        5.953 |        7.158 |        8.281 |     11.906 |     17.895 |     24.843 |
| `incremental-edit-small` |        0.250 |        0.283 |        0.302 |      0.500 |      0.707 |      0.906 |
| `incremental-edit-large` |        7.018 |        7.237 |        7.590 |     14.036 |     18.093 |     22.770 |
| `diagnostics-small`      |        0.002 |        0.002 |        0.002 |      0.050 |      0.050 |      0.050 |
| `diagnostics-incomplete` |        0.000 |        0.000 |        0.000 |      0.050 |      0.050 |      0.050 |
| `completion-medium`      |        0.121 |        0.145 |        0.152 |      0.242 |      0.363 |      0.456 |
| `hover-large`            |        0.002 |        0.002 |        0.003 |      0.050 |      0.050 |      0.050 |
| `definition-large`       |        0.002 |        0.002 |        0.002 |      0.050 |      0.050 |      0.050 |
| `signature-help-medium`  |        0.004 |        0.006 |        0.012 |      0.050 |      0.050 |      0.050 |
| `document-symbols-large` |        0.009 |        0.010 |        0.018 |      0.050 |      0.050 |      0.054 |
| `workspace-symbols-scan` |        0.887 |        1.088 |        1.156 |      1.774 |      2.720 |      3.468 |
| `formatting-medium`      |        0.027 |        0.032 |        0.033 |      0.054 |      0.080 |      0.099 |
| `semantic-tokens-large`  |        0.021 |        0.025 |        0.030 |      0.050 |      0.063 |      0.090 |
| `quick-fixes-small`      |        0.004 |        0.004 |        0.004 |      0.050 |      0.050 |      0.050 |
| `refactor-inline-small`  |        0.004 |        0.007 |        0.011 |      0.050 |      0.050 |      0.050 |
| `rename-large`           |        0.009 |        0.010 |        0.012 |      0.050 |      0.050 |      0.050 |

Targets are computed from the measured baseline as `max(baseline × factor, 0.05 ms)`, with factors of 2 for p50, 2.5 for p95 and 3 for p99. Repeated runs showed stable medians for parser and analysis workloads, occasional GC/JIT spikes in p99, and greater variance for the filesystem-backed workspace scan. The wider factors absorb that observed variability while still detecting order-of-magnitude regressions. The absolute floor avoids false failures on sub-millisecond provider calls where timer and scheduling noise exceed the operation itself.

The large incremental edit is currently slower than a full parse and analysis of the same fixture because Tree-sitter reuses the syntax tree while the semantic engine rebuilds a fresh document snapshot. Improving incremental semantic reuse is deferred; it needs evidence from real editing workloads before adding complexity.

## Regression monitoring

`npm run benchmark:check` fails when a current layer percentile exceeds the corresponding stored target or when a workload is missing. CI runs this command in the `performance` job with `continue-on-error: true`, so it reports regressions without blocking unrelated correctness failures. The separate installed-binary harness also runs with `continue-on-error: true` and stores no thresholds, so neither benchmark is a correctness gate. The correctness gate remains `npm run check`.

## Instrumentation plan

- Layer-boundary timing lives in `scripts/benchmark.mjs` and installed-binary timing in `scripts/benchmark-e2e.mjs`; neither adds production timing hooks or user-facing configuration.
- The runners keep fixtures, baseline data and results separate from `src/` and the published package.
- Cancellation and superseded-version behaviour are covered by the stdio integration tests rather than by latency samples.
- The Phase 14 soak suite published in `0.2.0` samples child-process RSS externally from `ps` and reports growth as advisory test diagnostics. Those samples are not latency measurements, do not enter the baseline and do not add production telemetry.
- Future instrumentation should capture request cancellation counts only when a concrete latency investigation requires them.

## Current status

Phase 8 is implemented. The harness records 18 workloads, the committed baseline contains measured p50/p95/p99 values and numeric warning thresholds, and CI reports advisory regressions. No performance target is a blocking correctness gate. Phase 6 and Phase 7 providers still lack production-side timing instrumentation; their latencies are measured through the harness rather than from live editor sessions.

The Phase 14 diagnostics settings published in `0.2.0` apply a pure default configuration to each diagnostics and quick-fix derivation. The subsequent workspace-file hardening added symlink, containment, unreadable-path and deterministic-order guards. In the final `npm run benchmark:check` on darwin-arm64 with Node 26.8.2, all 18 workloads remained within the committed thresholds; `diagnostics-small` p50/p95/p99 were 0.003/0.003/0.003 ms, `quick-fixes-small` were 0.002/0.002/0.002 ms and `workspace-symbols-scan` was 0.605/0.648/0.684 ms. The committed baseline was not rewritten because these remain layer-level advisory measurements rather than editor latency.

`npm run test:soak` now adds three bounded lifecycle cycles with 64 rapid edits and advisory RSS observation, but it does not measure p50/p95/p99 or change the 18-workload baseline. The full `npm run check` passed 85/85 tests on darwin-arm64 with Node 26.8.2 after the two-client smoke evidence contract was added; the Phase 15 release-evidence contract subsequently raised the gate to 86/86, and the ADR-062 publication-state contract raised it to 87/87, the Phase 17 documentation-contract suite raised it to 90/90, and the Phase 18 compatibility-contract suite raised it to 93/93, and the Phase 19 exact-authorization test raised the current candidate gate to 94/94. Observed RSS growth of roughly 3.3–3.4 MiB per cycle was treated as warm-up evidence, not a regression threshold.

The separate installed-binary workload is implemented under ADR-057. Its advisory report records 0.337/0.575/0.735 ms p50/p95/p99 over 100 samples, while `npm run benchmark:check` still passed all 18 layer workloads after the shared statistics extraction. Neither result is an editor-latency claim or a blocking gate.
