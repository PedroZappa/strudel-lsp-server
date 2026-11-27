# Strudel LSP Server

An editor-agnostic Language Server Protocol implementation for [Strudel](https://strudel.cc/), published as the npm package `strudel-lsp-server`. The server core speaks LSP over stdio and does not depend on any editor client.

## Features

- Diagnostics that stay quiet on incomplete live-coding input.
- Completion, hover documentation and signature help backed by pinned Strudel metadata.
- Definition, references, document symbols and bounded workspace symbols.
- Rename, quick fixes and a conservative inline-constant refactoring.
- Semantic tokens and indentation-only formatting.
- Mini-notation-aware diagnostics, hover and tokens.

## Installation and launch

Configure an LSP client to launch `strudel-lsp-server` over stdio:

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

See `docs/LSP_FEATURES.md` in the repository for exact capability details and `docs/PERFORMANCE.md` for measured latency baselines.

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

## Legacy prototype reference

The original prototype directories and editor files are retained but are not authoritative for the npm package. They remain excluded from the package build, lint and test scopes until an explicit retirement decision is made.

### Testing with Neovim

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

### Configuration Options

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

### Troubleshooting the prototype

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

## License

AGPL-3.0-only. See `LICENSE`. The pinned `tree-sitter-strudel@2.0.2` parser is also AGPL-3.0-only, Strudel packages are AGPL-3.0-or-later, and the Tree-sitter runtime is MIT. Dependency provenance and licensing decisions are documented in `docs/PARSER_INTEGRATION.md` and `docs/DECISIONS.md`.
