#!/usr/bin/env node

import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  type InitializeResult,
} from 'vscode-languageserver/node';

// Capabilities are added only when the corresponding providers are implemented and verified.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.None,
  },
}));

connection.onInitialized(() => undefined);
connection.onShutdown(() => undefined);
connection.onExit(() => undefined);

connection.listen();
