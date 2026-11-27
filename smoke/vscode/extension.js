'use strict';

function activate() {
  // The VS Code smoke test creates the language client directly in test/runner.js.
  // This extension only contributes the temporary Strudel language identifier.
}

function deactivate() {}

module.exports = { activate, deactivate };
