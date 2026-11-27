# Strudel LSP Server

An editor-agnostic Language Server Protocol implementation for [Strudel](https://strudel.cc/). The npm package is named `strudel-lsp-server`; `0.2.0` is published and `0.1.0` remains available. The server core speaks LSP over stdio and does not depend on any editor client.

## Features

- Diagnostics that stay quiet on incomplete live-coding input, with focused LSP configuration in `0.2.0`.
- Completion, hover documentation and signature help backed by pinned Strudel metadata.
- Definition, references, document symbols and bounded workspace symbols.
- Rename, quick fixes and a conservative inline-constant refactoring.
- Semantic tokens and indentation-only formatting.
- Mini-notation-aware diagnostics, hover and tokens.

## Requirements

The package supports Node.js 24 and 26 with npm 11.x. The validated matrix is Linux x64 with glibc, macOS arm64 and Windows x64; the parser also ships prebuilds for Linux arm64, macOS x64 and Windows arm64, which remain best-effort until validated. See [ADR-035](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/DECISIONS.md).

Supported Strudel snapshot: `1.2.6`, with `@strudel/core`, `@strudel/mini` and `@strudel/transpiler` pinned to that version. `@strudel/reference@1.2.2` is the pinned JSDoc metadata source, not a second supported language version. Strudel version selection is not exposed in `0.1.0` or `0.2.0`; ADR-065 records the dependency-update policy.

## Installation and launch

Install the package and configure an LSP client to launch `strudel-lsp-server` over stdio:

```bash
npm install --global strudel-lsp-server
```

The latest published version is `0.2.0`; pin `@0.2.0` for a reproducible install. Installation uses default npm peer resolution; `legacy-peer-deps=true` is not required.

```json
{
  "command": "strudel-lsp-server"
}
```

For a local source checkout:

```bash
npm ci --ignore-scripts
npm run build
node dist/src/server.js
```

The core server does not provide a TCP mode. Editor-specific clients and configuration remain outside this package.

## Capabilities

The server advertises only capabilities that are implemented and verified: incremental text document sync, diagnostics, completion, hover, signature help, definition, references, document symbols, workspace symbols, rename, formatting, semantic tokens, code actions and document/workspace symbol requests. Workspace symbols use a bounded on-demand scan of `.strudel` files with symlink, path-traversal and unreadable-file guards; no persistent workspace index or cross-file module graph is created.

See [LSP_FEATURES.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/LSP_FEATURES.md) for exact capability details and [PERFORMANCE.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/PERFORMANCE.md) for measured latency baselines.

## Known limitations

The published `0.1.0` and `0.2.0` releases deliberately limit scope:

- Published `0.1.0` has no custom configuration channel. `0.2.0` adds the focused diagnostics configuration described below and in ADR-052; Strudel version selection and internal engine settings remain deferred.
- Diagnostics stay conservative on incomplete live-coding input rather than reporting unreliable cascading errors.
- Formatting is indentation-only. Range formatting is deferred.
- Workspace symbols use a bounded on-demand scan of `.strudel` files rather than a persistent workspace index or cross-file module graph; symlink entries and paths outside the workspace root are skipped.
- Only stdio transport is provided; the package has no TCP mode.
- Platforms other than the required Linux x64, macOS arm64 and Windows x64 matrix are best-effort until validated.
- The pinned `tree-sitter-strudel@2.0.2` grammar has two accepted upstream gaps: `%` modulo in JavaScript expressions and `//` inside string literals. Semantic analysis still completes for affected examples; see ADR-065.

## Configuration

The published `0.1.0` package has no custom settings: diagnostics are enabled by default with conservative provider-defined severities, formatting follows the client's standard LSP `tabSize` and `insertSpaces` options, and language metadata uses the pinned Strudel snapshot.

The published `0.2.0` release adds focused diagnostics settings under the standard LSP `strudelLsp` section: `diagnostics.enabled` plus optional per-code severities (`error`, `warning`, `information`, `hint` or `off`). Clients that advertise `workspace.configuration` are queried for this section, including on a configuration notification; clients without that capability can send `workspace/didChangeConfiguration` with settings under `settings.strudelLsp`. Either path republishes diagnostics for all open documents, and defaults remain unchanged when no configuration is supplied. Formatting preferences and Strudel metadata selection remain outside this narrow surface, and client-specific configuration stays outside the package. See [LSP_FEATURES.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/LSP_FEATURES.md#configuration) for the exact settings shape and ADR-052 for the decision.

## Development

```bash
npm run check
npm run test:configuration
npm run test:lsp
npm run test:protocol
npm run test:soak
npm run benchmark:check
npm run benchmark:e2e
npm run smoke:clients
npm run verify:contents
npm run verify:package
npm run verify:consumer
```

The Makefile provides the same workflows through `make check`, `make test-configuration`, `make test-lsp`, `make test-protocol`, `make test-soak`, `make benchmark-check`, `make benchmark-e2e`, `make smoke-clients`, `make pack-check`, `make verify-package`, `make verify-consumer` and `make verify-all`. `npm run verify:contents` previews and checks the tarball allowlist with an isolated npm cache. `npm run verify:package` uses the same isolated cache for packing, performs a clean offline installation from that tarball using the surrounding cache, and verifies the installed stdio executable with an initialize/shutdown handshake. `npm run verify:consumer` checks installation without inherited npm configuration or legacy peer dependencies. `npm run test:soak` exercises rapid edits and repeated initialize/shutdown cycles; RSS growth is reported as advisory test diagnostics rather than production telemetry. `npm run benchmark:e2e` measures one document-symbol request path through stdio JSON-RPC and the installed bin; its p50/p95/p99 are stored in the separate advisory `benchmarks/end-to-end.json` report, not in the layer-level baseline. `npm run smoke:clients` runs local VS Code and Neovim LSP clients against the built server; their configuration stays in `smoke/` and results are recorded in `validation/client-smoke.json`. These editor clients are local evidence only and are not dependencies of the published server.

## Repository layout

```text
src/          Server source and feature providers
test/         Parser, semantic, metadata, configuration, LSP filesystem, feature, mini-notation, protocol, soak and stdio suites
docs/         Authoritative specifications and decisions
scripts/      Metadata generation, benchmarks and package verification
benchmarks/   Synthetic fixtures, committed layer baseline and advisory installed-binary report
validation/   Corpus and client-smoke evidence reports
smoke/        Local VS Code and Neovim client configurations, excluded from the package
client/       Legacy VS Code prototype, excluded from the package build
server/       Legacy TypeScript prototype, excluded from the package build
```

## Legacy prototype reference (not part of the published npm package)

The original prototype directories and editor files are retained but are not authoritative for the npm package. They remain excluded from the package build, lint and test scopes until an explicit retirement decision is made. The commands below are historical reference only; use the installation and launch instructions above for the latest published release, `strudel-lsp-server@0.2.0`.

### Historical Neovim prototype test

1. **Start the LSP server** (Terminal 1):
   ```bash
   cd server/out
   node server.js --tcp
   ```

2. **Open Neovim** (Terminal 2):
   ```bash
   nvim -u neovim-test.lua test.strdl
   ```

3. **Test completion**: Type `sound("` and press `Ctrl+x` `Ctrl+o`

4. **Test hover**: Press `K` on a function name

### Historical prototype configuration options

The prototype supported two modes:

- **stdio mode** (default for the current package):
  ```bash
  node server.js
  ```

- **TCP mode** (prototype debugging only):
  ```bash
  node server.js --tcp
  ```

The prototype TCP mode listens on port `5007`. The packaged server does not provide TCP mode.

### Historical prototype troubleshooting

- Check LSP status in Neovim:
  ```vim
  :LspStatus
  ```

- View LSP logs:
  ```vim
  :lua vim.lsp.set_log_level('debug')
  :lua print(vim.lsp.get_log_path())
  ```

- Ensure port 5007 is available:
  ```bash
  lsof -i :5007
  ```

## Reporting problems

Include the smallest reproduction that shows the problem and the following details:

- Package version from `npm ls strudel-lsp-server`, plus Node and npm versions from `node --version` and `npm --version`.
- Operating system and architecture, the editor or LSP client, and the exact command used to launch the server.
- A minimal `.strudel` snippet, the steps taken, expected behaviour and observed behaviour.
- Any diagnostic code, message and source range shown by the client.
- The relevant client LSP trace or server stderr captured by the client. Do not paste raw server stdout: it is the LSP protocol stream and can contain complete document contents.

Redact tokens, passwords, OTP or recovery codes, private keys, internal URLs, private workspace paths and any composition text you do not want to disclose. Do not attach credential files or npm configuration containing authentication values.

## Repository and support

- Source: <https://github.com/PedroZappa/strudel-lsp-server>
- Documentation: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>

## License

AGPL-3.0-only. See `LICENSE`. The pinned `tree-sitter-strudel@2.0.2` parser is also AGPL-3.0-only, Strudel packages are AGPL-3.0-or-later, and the Tree-sitter runtime is MIT. Dependency provenance and licensing decisions are documented in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`.
