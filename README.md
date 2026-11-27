# Strudel LSP Server

An editor-agnostic Language Server Protocol implementation for [Strudel](https://strudel.cc/). The npm package is named `strudel-lsp-server` and the first release is `0.1.0`. The server core speaks LSP over stdio and does not depend on any editor client.

## Features

- Diagnostics that stay quiet on incomplete live-coding input.
- Completion, hover documentation and signature help backed by pinned Strudel metadata.
- Definition, references, document symbols and bounded workspace symbols.
- Rename, quick fixes and a conservative inline-constant refactoring.
- Semantic tokens and indentation-only formatting.
- Mini-notation-aware diagnostics, hover and tokens.

## Requirements

The `0.1.0` package supports Node.js 24 and 26 with npm 11.x. The required first-release validation matrix is Linux x64 with glibc, macOS arm64 and Windows x64; the parser also ships prebuilds for Linux arm64, macOS x64 and Windows arm64, which remain best-effort until validated. See [ADR-035](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/DECISIONS.md).

The bundled language database targets `@strudel/core`, `@strudel/mini` and `@strudel/transpiler` `1.2.6`, plus `@strudel/reference` `1.2.2`. Strudel version selection is not exposed in `0.1.0`.

## Installation and launch

Install the package and configure an LSP client to launch `strudel-lsp-server` over stdio:

```bash
npm install --global strudel-lsp-server@0.1.0
```

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

The server advertises only capabilities that are implemented and verified: incremental text document sync, diagnostics, completion, hover, signature help, definition, references, document symbols, workspace symbols, rename, formatting, semantic tokens, code actions and document/workspace symbol requests. Workspace symbols use a bounded on-demand scan of `.strudel` files; no persistent workspace index or cross-file module graph is created.

See [LSP_FEATURES.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/LSP_FEATURES.md) for exact capability details and [PERFORMANCE.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/PERFORMANCE.md) for measured latency baselines.

## Known limitations

Published version `0.1.0` deliberately limits scope:

- It has no custom configuration channel; diagnostic enablement/severity overrides and Strudel version selection are deferred. The current development tree adds an unreleased, focused diagnostics configuration described below and in ADR-052.
- Diagnostics stay conservative on incomplete live-coding input rather than reporting unreliable cascading errors.
- Formatting is indentation-only. Range formatting is deferred.
- Workspace symbols use a bounded on-demand scan of `.strudel` files rather than a persistent workspace index or cross-file module graph.
- Only stdio transport is provided; the package has no TCP mode.
- Platforms other than the required Linux x64, macOS arm64 and Windows x64 matrix are best-effort until validated.

## Configuration

The published `0.1.0` package has no custom settings: diagnostics are enabled by default with conservative provider-defined severities, formatting follows the client's standard LSP `tabSize` and `insertSpaces` options, and language metadata uses the pinned Strudel snapshot.

The unreleased development tree adds focused diagnostics settings under the standard LSP `strudelLsp` section: `diagnostics.enabled` plus optional per-code severities (`error`, `warning`, `information`, `hint` or `off`). Clients that advertise `workspace.configuration` are queried for this section; `workspace/didChangeConfiguration` also applies settings and republishes diagnostics. Defaults remain unchanged when no configuration is supplied. Formatting preferences and Strudel metadata selection remain outside this narrow surface, and client-specific configuration stays outside the package. See [LSP_FEATURES.md](https://github.com/PedroZappa/strudel-lsp-server/blob/main/docs/LSP_FEATURES.md#configuration) for the exact settings shape and ADR-052 for the decision.

## Development

```bash
npm run check
npm run benchmark:check
npm run verify:package
```

The Makefile provides the same workflows through `make check`, `make benchmark-check`, `make verify-package` and `make verify-all`. `npm run verify:package` packs the built server, performs a clean offline installation from that tarball, and verifies the installed stdio executable with an initialize/shutdown handshake.

## Repository layout

```text
src/          Server source and feature providers
test/         Parser, semantic, metadata, feature and stdio suites
docs/         Authoritative specifications and decisions
scripts/      Metadata generation, benchmarks and package verification
benchmarks/   Synthetic fixtures and committed performance baseline
client/       Legacy VS Code prototype, excluded from the package build
server/       Legacy TypeScript prototype, excluded from the package build
```

## Legacy prototype reference (not part of `0.1.0`)

The original prototype directories and editor files are retained but are not authoritative for the npm package. They remain excluded from the package build, lint and test scopes until an explicit retirement decision is made. The commands below are historical reference only; use the installation and launch instructions above for `strudel-lsp-server@0.1.0`.

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

## Repository and support

- Source: <https://github.com/PedroZappa/strudel-lsp-server>
- Documentation: <https://github.com/PedroZappa/strudel-lsp-server/tree/main/docs>
- Issues: <https://github.com/PedroZappa/strudel-lsp-server/issues>

## License

AGPL-3.0-only. See `LICENSE`. The pinned `tree-sitter-strudel@2.0.2` parser is also AGPL-3.0-only, Strudel packages are AGPL-3.0-or-later, and the Tree-sitter runtime is MIT. Dependency provenance and licensing decisions are documented in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`.
