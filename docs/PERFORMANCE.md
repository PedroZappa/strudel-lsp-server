# Performance

Status: requirements and methodology only; no benchmarks or targets exist yet.  
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

## Workloads to define

Workloads must be recorded with source, size, structure and Strudel version. Candidate categories:

- Small live-coding buffers with frequent single-character edits.
- Medium compositions with many chained pattern calls and user-defined functions.
- Large pattern sets with extensive mini-notation.
- Rapid edit bursts followed by completion, hover and diagnostic requests.
- Invalid and partially typed input representative of live coding.

## Measurement methodology

1. Record machine, OS, Node.js version, dependency versions and build configuration.
2. Define warm-up and sample counts before measuring.
3. Measure distinct phases separately: text edit, syntax update, semantic update, diagnostic computation and individual feature requests.
4. Report p50, p95 and p99 for each relevant operation, plus sample size.
5. Compare incremental updates against full recomputation.
6. Store baseline results with the commit that produced them.
7. Re-run benchmarks on dependency upgrades, parser upgrades and significant semantic changes.

## Targets

Numeric targets must be established through measurement and a documented decision. No arbitrary thresholds are declared here.

Once data exists, this document must record:

- The target workloads and rationale.
- Numeric p50/p95/p99 thresholds.
- The hardware/environment used to establish them.
- How regressions are detected and reviewed.

## Instrumentation plan

- Add timing hooks at stable layer boundaries without exposing internal settings as user configuration.
- Capture cancellation and superseded-request counts.
- Ensure instrumentation does not itself block the LSP loop.
- Keep benchmark code and fixtures separate from production feature code.

## Current status

No benchmark suite, workload, baseline or target exists in the repository. The prototype has no performance instrumentation. Phase 6 added signature-help lookup and a linear token scan per analyzed double-quoted mini-notation string; Phase 7 added code-action computation, document-scoped rename lookup, a scope/symbol traversal for document symbols and a full-document semantic-token pass from the cached semantic snapshot. None has a measured latency figure yet. Phase 8 must include them in representative edit, diagnostic, hover, code-action, document-symbol, semantic-token and rename workloads.

CI now executes `npm run benchmark` in a dedicated `performance` job, so future workloads and targets can be wired into the same gate. The job currently reports that no workloads are registered and does not claim or enforce a latency threshold.
