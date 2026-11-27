# Benchmark fixtures

All fixtures are synthetic Strudel buffers hand-authored for this repository. They are not copied from external projects. Syntax follows the constructs used by the pinned Strudel 1.2.6 metadata and the project's parser integration tests.

| Fixture                       | Size              | Structure and purpose                                                                 |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `small-live-edit.strudel`     | 6 lines, 88 B     | Small live-coding buffer with chains, mini notation, an empty-group quick fix and a single-use literal constant. |
| `medium-composition.strudel`  | 16 lines, 409 B   | Several chained patterns and two user-defined functions for full analysis and feature requests. |
| `large-pattern-set.strudel`   | 54 lines, 1,665 B | Many declarations, function calls, chains and mini-notation arguments for scaling checks. |
| `incomplete-live.strudel`     | 4 lines, 60 B     | Partial call, partial identifier and partial mini-notation input for resilient diagnostics. |
| `workspace/`                  | 3 `.strudel` files | Nested workspace folders for bounded workspace-symbol discovery; `ignored.txt` verifies extension filtering. |

The harness and baseline are described in `docs/PERFORMANCE.md`.
