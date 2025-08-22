/**
 * Strudel LSP Client
 * @author Zedro
 * @module
 *
 * @requires path
 * @requires vscode
 * @requires vscode-languageclient/node
 *
 * @exports activate
 * @exports deactivate
 */

import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { workspace } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node'

let client: LanguageClient;

/** 
* @method activate
* @description Activates the extension 
* @returns {void}
*/
export function activate(ctx: ExtensionContext): void {
  // Get server module path
  const serverModule = ctx.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  // Handle debug mode
  const serverOpts: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  // Set options to control the client
  const clientOpts: LanguageClientOptions = {
    // Register server for strudel documents
    documentSelector: [{ scheme: 'file', language: 'strudel' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'strudelLanguageServer',
    'Strudel Language Server',
    serverOpts,
    clientOpts
  );

  // Start the client. This will also launch the server
  client.start();
}

/** 
* @method deactivate
* @description Deactivates the extension 
* @returns {Thenable<void>}
*/
export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
