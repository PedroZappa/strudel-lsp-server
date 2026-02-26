# Strudel LSP Server

A Language Server Protocol (LSP) implementation for [Strudel](https://strudel.cc/) - a browser-based live coding language for algorithmic music patterns.

## Features

- **Completion**: 85+ Strudel functions and 70+ sample names
- **Hover**: Function documentation
- **Diagnostics**: Basic syntax validation (bracket matching)
- **Supported Editors**: Neovim (0.10+), VS Code

## Strudel Functions Included

Pattern functions: `sound`, `note`, `s`, `n`, `fast`, `slow`, `stack`, `cat`, `seq`, `jux`, `rev`, `room`, `delay`, `cutoff`, `gain`, `pan`, `speed`, `shape`, `vowel`, `crush`, `chop`, `sometimes`, `every`, `when`, `layer`, `linger`, `ply`, `repeat`, `arp`, `stride`, `begin`, `end`, and more.

Samples: `bd`, `sd`, `hh`, `cp`, `808`, `909`, `kick`, `snare`, `hihat`, and more.

## Installation

```bash
# Install dependencies
npm install

# Compile TypeScript
cd server && npx tsc
```

## Testing with Neovim

### Quick Start

1. **Start the LSP server** (Terminal 1):
   ```bash
   cd server/out
   node server.js --tcp
   ```

2. **Open Neovim** (Terminal 2):
   ```bash
   nvim -u neovim-test.lua test.strudel
   ```

3. **Test completion**: Type `sound("` and press `Ctrl+x` `Ctrl+o`

4. **Test hover**: Press `K` on a function name

### Configuration Options

The server supports two modes:

- **stdio mode** (default, for VS Code):
  ```bash
  node server.js
  ```

- **TCP mode** (for Neovim debugging):
  ```bash
  node server.js --tcp
  ```

### Port

TCP mode listens on port `5007`.

### Troubleshooting

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

## Development

### Building

```bash
npm run compile
```

### Project Structure

```
strudel-lsp-server/
├── client/           # VS Code extension (language client)
├── server/           # LSP server implementation
│   ├── src/server.ts # Main server code
│   └── out/          # Compiled JavaScript
├── neovim-test.lua   # Neovim test configuration
├── test.strudel      # Test file
└── package.json      # Root package config
```

## License

MIT
