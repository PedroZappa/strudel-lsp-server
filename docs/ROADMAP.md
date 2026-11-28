# Roadmap

Status: `v1.0.0` is published and the v1 stability contract is in effect. This roadmap contains only work ahead of `v1.0.0`. Completed Phases 0–27 and their evidence are preserved in the [roadmap archive](ROADMAP_ARCHIVE.md).

Current baseline:

- `strudel-lsp-server@1.0.0` was published on 2026-11-28 from tag `v1.0.0` at commit `447736d3d1664e34d17e9fe6b5394e64f4327518` through the controlled OIDC workflow with `pedrozappa` as operator. ADR-084 records the authorization and ADR-085 records the registry, provenance, tarball, clean-install and stdio evidence.
- The advertised v1 capability matrix is the ADR-063 `0.5.0` surface plus the four ADR-077 additions re-frozen by ADR-082. No capability is advertised without implementation, tests, documentation and an ADR.
- ADR-063 defines SemVer impact and additive changes. Performance targets remain advisory under ADR-080 unless a blocking threshold is accepted in a new ADR.
- Dependency-update triggers and metadata-regeneration policy are recorded in ADR-065. Strudel compatibility/version selection stays unexposed until multiple metadata snapshots are supported.
- ADR-086 adds local TypeDoc API-reference generation as a development-only toolchain change; it does not alter the published package, runtime behaviour or capability surface.

Authority: `AGENTS.md` sections 2–18 and the other documents in `docs/`.

Expansion inputs: open questions in `docs/LANGUAGE_SPECIFICATION.md` and `docs/SEMANTIC_ENGINE.md`; deferred providers and conservative policies in `docs/LSP_FEATURES.md`; advisory performance notes in `docs/PERFORMANCE.md`; compatibility, packaging and tooling notes in `docs/PROJECT_SPEC.md`, `README.md` and `docs/DECISIONS.md`; and the current gap audit across the server, tests and validation harness.

Labels: a **proposed** phase needs phase-specific authorization before implementation; a **research** task produces evidence and an ADR recommendation, not a capability; a **candidate** needs a concrete usefulness and safety case before it enters a phase; a **watch item** has no phase until its trigger occurs. Nothing below is authorized for implementation.

## Planning gates

- Each proposed phase requires phase-specific authorization before implementation or release work begins. Version numbers and release sequencing are provisional until scope is approved.
- Semantic additions require authoritative evidence from official Strudel documentation, source, or bounded local declarations. Speculative runtime behaviour is not advertised.
- New providers, diagnostic codes and configuration keys are additive MINOR candidates under ADR-063. Removal, renaming or incompatible semantic change requires explicit approval.
- Cross-file edits, new diagnostic certainty claims and changes to the frozen provider surface require an explicit ADR and safety contract before implementation.
- Performance changes are measured with p50/p95/p99 and recorded in `docs/PERFORMANCE.md`; advisory results do not become blocking gates without an ADR.
- Negative capability tests remain part of the gate and are changed only when a provider is actually advertised.
- Historical evidence in `docs/ROADMAP_ARCHIVE.md`, released artifacts, release notes and ADRs is immutable. Current-state corrections must not rewrite it.

## v1.x.x phase sequence

The sequence below is provisional. Research tasks may run independently after authorization, but implementation and release tasks wait for their phase gate. A phase may be split or reordered when evidence shows a better boundary; significant changes are recorded here or in `docs/DECISIONS.md`.

### Phase 28 — v1.1 live-coding semantics (proposed, post-v1)

Dependencies: the published `v1.0.0` baseline and a phase-specific ADR recording authoritative evidence for `$:` active-pattern semantics and any new diagnostic behaviour.

Provisional release intent: candidate `v1.1.0` if the accepted changes remain additive under ADR-063. Research-only outcomes produce no release.

Tasks:

- [ ] Model `$:` labelled active-pattern declarations and evaluate document-symbol or context hints that do not claim runtime playback state.
- [ ] Define unknown-sample diagnostics only with a complete, versioned and authoritative sample catalog whose source, version and coverage gate are recorded; suppress all speculative cases during incomplete edits.
- [ ] Extend note/scale-aware mini-notation completion beyond the v1 baseline only with pinned language evidence.
- [ ] Investigate additional malformed mini-notation diagnostics beyond the four verified structural faults; require pinned lexer evidence, exact ranges and live-edit suppression before any diagnostic code is added.
- [ ] Research template-literal and nested-substitution mini-notation attachment as a bounded lexical extension; do not infer pattern evaluation or alter the structured recovery AST without evidence.
- [ ] Research editor-agnostic eval/hush code lens commands without implementing or advertising a command; runtime execution remains a standing non-goal unless a command contract and explicit ADR are accepted.

Exit criteria:

- [ ] Each added behaviour is backed by official Strudel documentation or source evidence, or by bounded local declarations, with tests for incomplete input, cancellation and recovery.
- [ ] No capability claims runtime execution, editor-specific behaviour or telemetry.
- [ ] Any new diagnostic code is additive under the ADR-063 SemVer framework and has documented suppression semantics.
- [ ] Unknown-sample diagnostics have a recorded catalog completeness gate before any diagnostic code is added; incomplete input and dynamic samples remain silent.
- [ ] New mini-notation findings preserve the pinned lexer as the source of ranges and do not turn recovery nodes into false errors.

### Phase 29 — v1.x protocol efficiency and workspace correctness (proposed, post-v1)

Dependencies: the published `v1.0.0` baseline; Phase 28 only where its semantic additions are accepted before this phase.

Provisional release intent: additive MINOR for new providers or user-visible protocol behaviour; PATCH for correctness fixes and documentation-only changes.

Tasks:

- [ ] Evaluate and implement pull diagnostics (`textDocument/diagnostic`) and diagnostic tags where a concrete client benefit is evidenced, preserving push diagnostics as the default fallback.
- [ ] Evaluate semantic-token range and delta requests against real editor workloads while preserving full-document tokens as the fallback.
- [ ] Review declaration/type-definition/implementation navigation, document links, color providers, linked editing, inline values, monikers, on-type formatting, expression reflow and new completion triggers; implement only with a concrete usefulness and safety case.
- [ ] Propagate the provider-computed signature-help `range` through the stdio response and add a protocol regression test for nested calls.
- [ ] Handle dynamic workspace-folder changes through `workspace/didChangeWorkspaceFolders` so workspace symbols, relative import-path completion and cross-file navigation observe added and removed roots without restart; keep the bounded on-demand scan and no watcher or persistent index.
- [ ] Investigate parser-dominant incremental edits using the existing p50/p95/p99 evidence; implement optimization only where profiling shows a safe gain without vendoring, patching or replacing the grammar.
- [ ] Add dedicated layer benchmarks for the shipped relative import-path completion and `documentHighlight` paths, which currently have no dedicated workloads, and report p50/p95/p99 alongside the existing suites.
- [ ] Refresh editor-client smoke evidence against the published v1 surface, including the four ADR-077 additions, while keeping client configuration outside the server package.
- [ ] Reconcile current-state documentation and stale code comments, including outdated test-count claims and the `documentHighlight` comment in `src/server.ts`, without changing historical release evidence.

Exit criteria:

- [ ] Implemented changes are additive MINOR candidates under ADR-063, and negative capability tests are updated only when a provider is actually advertised.
- [ ] Workspace-root changes are tested for initial-root, no-root, add and remove cases with unreadable-path and cancellation coverage preserved.
- [ ] Protocol payload tests cover signature-help ranges and the actual advertised capability matrix.
- [ ] No standing non-goal is reversed without an explicit ADR.
- [ ] Performance evidence is recorded in `docs/PERFORMANCE.md` with p50/p95/p99 and no unmeasured editor-latency claim.

### Phase 30 — v1.x semantic depth and workspace navigation (proposed, post-v1)

Dependencies: the Phase 29 correctness baseline. Work that depends on Phase 28 semantics waits for the Phase 28 gate; research into metadata and cross-file safety may begin independently after authorization.

Provisional release intent: additive MINOR for new capabilities or richer verified information; research and documentation-only outcomes produce no release.

Tasks:

- [ ] Define a semantic representation for optional, rest and overloaded parameters if authoritative metadata gains them, with tests for `activeSignature`, `activeParameter`, completion/resolve detail and generated-versus-curated precedence.
- [ ] Expand curated signatures only from pinned official Strudel source or documentation, prioritising high-frequency methods and recording each signature's provenance.
- [ ] Research bounded numeric constant folding and an evaluable mini-notation AST from the language-specification open questions; neither may become a JavaScript or TypeScript type checker.
- [ ] Research a bounded local declaration mechanism that could make unresolved-value diagnostics sound; no new diagnostic is added without a closed-world contract and false-positive regression evidence.
- [ ] Research dynamic and spread sample-key inference; unresolved, computed and incomplete keys remain silent unless a sound versioned catalog and local inference rule exist.
- [ ] Research bounded cross-file rename over explicit relative `.strudel` imports, then implement only with a multi-file safety contract covering exactly verified ranges, exported declarations, cancellation and stale edits.
- [ ] Research bounded cross-file call hierarchy using the same explicit-import edges as definition and references, with stale multi-document token and repeated-scan-cost tests.
- [ ] Evaluate relevance ranking for workspace symbols; any change must be deterministic, locale-independent and justified by editor-workload evidence before `docs/LSP_FEATURES.md` is revised.
- [ ] Evaluate verified mini-notation step semantic tokens for source-local keys and metadata-backed notes; any legend change requires a frozen-contract update and must not infer unknown samples or runtime pitch.
- [ ] Evaluate additional inlay-hint types and resolve-token enrichment only where sound inference or authoritative metadata exists, keeping hints opt-in and stale tokens inert.
- [ ] Evaluate causal diagnostic suppression and additional quick fixes only with before/after fixtures proving no cascades and no stale-client edits.

Exit criteria:

- [ ] Every new semantic claim has pinned evidence and a documented conservative fallback on malformed or incomplete input.
- [ ] Cross-file behaviour uses only the existing bounded workspace-scan contexts; no persistent index, file watcher or arbitrary filesystem access is introduced.
- [ ] Multi-file edits are deterministic, cancellable and validated against current source text before any edit is returned.
- [ ] Frozen capability, configuration and diagnostic-code contracts change only through an accepted ADR and corresponding tests.
- [ ] Research tasks end with a written recommendation; they do not advertise capabilities by default.

### Phase 31 — v1.x compatibility and release engineering (proposed, post-v1)

Dependencies: Phase 29 evidence and any Phase 30 additions that affect metadata, capabilities or packaging. No phase assumes an upstream release that has not occurred.

Provisional release intent: usually no registry action; user-facing compatibility or version configuration changes are additive MINOR candidates under ADR-063.

Tasks:

- [ ] Complete the multi-snapshot metadata design spike: snapshot identity, provenance, compatibility-setting shape, per-document or per-workspace selection and explicit fallback rules. Expose a setting only after the design, tests and ADR are accepted.
- [ ] Revisit upstream parser gaps for `%` in JavaScript expressions and `//` inside strings only after an upstream `tree-sitter-strudel` release fixes them; revalidate parser, corpus and compatibility gates without vendoring the grammar.
- [ ] Gather best-effort platform evidence for Linux arm64, macOS x64 and Windows arm64 before expanding the supported matrix; advisory evidence does not itself expand support claims.
- [ ] Research a Node-compatible runtime extraction path that reads authoritative Strudel facts without duplicating definitions or relying on browser-IIFE packaging.
- [ ] Verify the exact `vN.N.N` tag policy in the `npm-release` environment before a controlled publish, avoiding a predictable blocked job and rerun; treat this as release preflight evidence, not a workflow change until authorized.
- [ ] Reevaluate the published-package evidence surface, including changelog allowlist, SBOM and attestation options; adding a tool requires explicit dependency approval and an ADR.
- [ ] Follow the TypeDoc/minimatch advisory until a compatible upstream fix exists; any upgrade requires deliberate compatibility review under ADR-086 rather than an override that breaks TypeDoc.
- [ ] Decide whether to retire or quarantine legacy prototype directories that remain outside lint, format and build scopes, preserving repository history and any still-useful evidence.
- [ ] Keep the runtime dependency audit blocking and the full audit advisory under ADR-086; revisit that split only with explicit evidence and approval.

Exit criteria:

- [ ] Support-matrix and compatibility claims match observed validation evidence.
- [ ] Parser or metadata changes are version-pinned, regenerated deliberately and revalidated against the corpus baseline.
- [ ] Any new configuration key has contract tests, documentation and an ADR before exposure.
- [ ] Release workflow changes remain separately authorized; no phase implementation automatically publishes or mutates a registry.
- [ ] Licensing, provenance and dependency decisions remain documented before adoption or redistribution.

## Cross-cutting candidate backlog

This section records suggestions that are not yet assigned to an authorized phase. They are planning only; no item below is authorized for implementation.

- Compatibility/version selection — Phase 31 design spike; blocked on multiple metadata snapshots and a settings contract.
- Changelog packaging, SBOM and release attestations — Phase 31 research; no new dependency or workflow change without explicit approval.
- Legacy prototype retirement — Phase 31 decision; repository history and published evidence remain immutable.
- Test framework alternatives such as Vitest — watch item under ADR-013 unless current tooling proves inadequate.
- Watch-mode execution helper such as `tsx` — watch item under `docs/TESTING_STRATEGY.md`; no adoption without an ergonomics case.
- `typedoc-plugin-markdown`, API Extractor and dependency-cruiser — watch items under ADR-086; adopt only for a concrete Markdown API, declaration-bundle or import-graph requirement.
- TypeScript-aware lint toolchain pin — revisit when TypeScript 7 support is available under ADR-006; no upgrade without compatibility validation.
- Persistent workspace index, file watcher, TCP transport, standalone binary distribution, editor-specific core dependencies, runtime execution, production telemetry, complete JavaScript/TypeScript compiler and vendored grammar or generated parser source — standing non-goals, not roadmap candidates unless explicitly reopened.

## Engineering improvement backlog

This section records evidence-backed project improvements that are not capability commitments. Each item needs phase authorization and an ADR where it changes compatibility, support or release policy.

- Multi-snapshot metadata design spike — define how a future Strudel version snapshot, its provenance and a compatibility setting would be represented before version selection is exposed; see `docs/PROJECT_SPEC.md` and ADR-065.
- Upstream parser-gap closure — revisit `%` in JavaScript expressions and `//` in string literals only when an upstream `tree-sitter-strudel` release fixes them; validate through parser, corpus and compatibility gates without vendoring the grammar; see ADR-065.
- Workspace-folder and protocol correctness — implement the Phase 29 fixes for dynamic roots and signature-help ranges before adding features that rely on broader workspace assumptions.
- Parser-dominant edit profiling — identify whether reparse or semantic reuse dominates rapid-edit latency before changing the analysis pipeline; report p50/p95/p99 under ADR-074.
- Current-state documentation hygiene — keep `docs/LSP_FEATURES.md`, `docs/TESTING_STRATEGY.md`, `README.md` and source comments aligned with the published surface while preserving historical records.
- Editor-client smoke refresh — rerun both local clients against the full v1 surface when their environments are available; partial runs do not rewrite the committed evidence report.
- Release preflight for environment policy — verify that the exact `vN.N.N` tag policy exists in the `npm-release` environment before a controlled publish; see ADR-085.
- Best-effort platform validation — gather observed evidence for Linux arm64, macOS x64 and Windows arm64 before expanding the supported matrix; see ADR-078.
- Node-compatible runtime extraction research — investigate authoritative facts that can be read without duplicating Strudel definitions or relying on browser-IIFE packaging; see `docs/PROJECT_SPEC.md` and ADR-014.
- Toolchain advisory follow-up — monitor the TypeDoc/minimatch advisory and TypeScript-aware lint compatibility; adopt only reviewed upgrades under ADR-086 and ADR-006.

## Standing non-goals (not proposed for v1 or post-v1 unless explicitly reopened)

- Complete JavaScript or TypeScript compiler/type checker.
- Standalone binary distribution instead of the npm package.
- Editor-specific dependencies in the server core.
- Runtime execution, eval/hush commands or production telemetry in the server core.
- Persistent workspace index or file watcher as a prerequisite for navigation.
- Vendored grammar or generated parser source, and TCP transport.
