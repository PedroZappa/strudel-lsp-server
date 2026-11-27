# Editor-client smoke harness

This directory contains local-only LSP client configurations for the Phase 14 two-client smoke check. It is deliberately outside `src/`, `test/` and the npm `files` allowlist, so the published server has no VS Code, Neovim or language-client dependency.

## Clients

| Client  | Implementation                                   | Configuration                         |
| ------- | ------------------------------------------------ | ------------------------------------- |
| VS Code | `vscode-languageclient@9.0.1` extension test host | `smoke/vscode/`                       |
| Neovim  | Built-in LSP client                              | `smoke/nvim/init.lua`                 |

Both clients launch the built `dist/src/server.js` over stdio. `smoke/vscode/node_modules` is a symlink to the existing prototype `client/node_modules`; no root dependency is added or installed. The symlink is untracked and should be recreated locally with `ln -s ../../client/node_modules smoke/vscode/node_modules` if it is absent. The VS Code harness requires an installed editor executable because it must not download one during validation. Set `VSCODE_EXECUTABLE_PATH` if the default macOS application path is not correct; set `NVIM_BIN` to override the Neovim executable.

## Behaviours exercised

Each client checks the same observable behaviours:

1. `initialize`/capabilities over stdio.
2. `textDocument/didOpen` publishes the `unknown-global` diagnostic for an unresolved call.
3. Position-aware completion returns the locally declared pattern.
4. `textDocument/documentSymbol` exposes that declaration.
5. `textDocument/didChange` is synchronized and updates document symbols.
6. Clean shutdown and client stop.

The client-side settings and editor launch code stay here; none of it is imported by the server.

## Commands

```bash
npm run smoke:clients
npm run smoke:clients:write
npm run smoke:vscode
npm run smoke:nvim
```

`npm run smoke:clients:write` refreshes `validation/client-smoke.json` only when both clients pass. The Makefile exposes the same workflows as `make smoke-clients`, `make smoke-clients-write`, `make smoke-vscode` and `make smoke-nvim`. These are local checks and are not part of CI because hosted runners do not guarantee installed editors.
