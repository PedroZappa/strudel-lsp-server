# Validation evidence

## Real documentation corpus evidence

`validation/real-corpus.json` is the machine-readable record of Phase 11 real-corpus validation. It is produced by `scripts/validate-corpus.mjs` and checked by `npm run validate:corpus` (or `make validate-corpus`) in CI and locally. Regeneration is deliberate: `npm run validate:corpus:write` (or `make validate-corpus-write`).

The corpus is every non-empty JSDoc example in the pinned `@strudel/reference@1.2.2` package. That package is generated from the official Strudel source at `git+https://codeberg.org/uzu/strudel.git`, is pinned by tarball integrity in `package-lock.json`, and is a development dependency only. The validator rechecks version, tarball, integrity, licence and repository before use, then parses and analyses each example unmodified with the pinned `tree-sitter-strudel@2.0.2` adapter and the default language database. One appended newline exercises incremental update and semantic reuse for every example.

The report stores source provenance, a corpus hash, aggregate counts and SHA-256 identifiers for examples that expose upstream parser gaps. It does **not** store example source text, and no corpus file is added to the npm package or copied into this repository. Validation is offline and deterministic; no network request is made at test time. Phase 18 regenerated the report from the final pins with no byte change and accepted seven parser gaps plus 1,308 unresolved references under ADR-065. Phase 20 then reduced the unresolved baseline to 1,277 through unambiguous aliases while adding curated signature metadata; the regenerated report is reviewed in ADR-068. Results and known limitations are interpreted in `docs/PARSER_INTEGRATION.md`, with the decisions recorded in `docs/DECISIONS.md`.

## Editor-client smoke evidence

`validation/client-smoke.json` records the Phase 14 two-client smoke result. It is produced by `npm run smoke:clients:write` (or `make smoke-clients-write`) after both local clients pass. The report stores editor versions, transport and the six behaviours each client exercised; it stores no editor-specific server configuration. The harness is local-only because hosted CI does not guarantee installed editors, and its decision and rationale are in ADR-058.
