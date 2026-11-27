import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SymbolKind } from 'vscode-languageserver/node';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: unknown;
}

interface JsonRpcError {
  code?: number;
  message?: string;
}

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result: unknown;
}

type JsonRpcOutgoing = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

interface NotificationWaiter {
  predicate: (params: unknown) => boolean;
  resolve: (params: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

class StdioLspClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, (message: JsonRpcMessage) => void>();
  private readonly notificationWaiters = new Map<string, NotificationWaiter[]>();
  private readonly requestHandlers = new Map<string, (params: unknown) => unknown>();
  private buffer = Buffer.alloc(0);
  private nextId = 1;

  constructor(serverPath: string) {
    this.child = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.handleChunk(chunk);
    });
    this.child.stderr.resume();
  }

  request(method: string, params: unknown = {}): Promise<unknown> {
    const id = this.nextId++;

    return new Promise<unknown>((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectRequest(new Error(`Timed out waiting for ${method}`));
      }, 5000);

      this.pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error !== undefined) {
          rejectRequest(new Error(`${method} failed: ${message.error.message ?? 'unknown error'}`));
          return;
        }
        resolveRequest(message.result);
      });

      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  onRequest(method: string, handler: (params: unknown) => unknown): void {
    this.requestHandlers.set(method, handler);
  }

  notify(method: string, params: unknown = {}): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  waitForNotification(
    method: string,
    predicate: (params: unknown) => boolean = () => true,
  ): Promise<unknown> {
    return new Promise<unknown>((resolveNotification, rejectNotification) => {
      const timer = setTimeout(() => {
        const waiters = this.notificationWaiters.get(method) ?? [];
        const index = waiters.findIndex((waiter) => waiter.timer === timer);
        if (index >= 0) {
          waiters.splice(index, 1);
        }
        rejectNotification(new Error(`Timed out waiting for ${method}`));
      }, 5000);
      const waiters = this.notificationWaiters.get(method) ?? [];
      waiters.push({
        predicate,
        resolve: resolveNotification,
        reject: rejectNotification,
        timer,
      });
      this.notificationWaiters.set(method, waiters);
    });
  }

  async terminate(): Promise<void> {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill();
      await this.waitForExit();
    }
  }

  async waitForExit(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) {
      return;
    }

    await Promise.race([
      once(this.child, 'exit'),
      new Promise<never>((_resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('LSP server did not exit'));
        }, 5000);
        timer.unref();
      }),
    ]);
  }

  private send(message: JsonRpcOutgoing): void {
    const body = Buffer.from(JSON.stringify(message), 'utf8');
    this.child.stdin.write(`Content-Length: ${body.byteLength}\r\n\r\n`);
    this.child.stdin.write(body);
  }

  private handleChunk(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (lengthMatch === null) {
        throw new Error(`Invalid LSP message header: ${header}`);
      }

      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + Number(lengthMatch[1]);
      if (this.buffer.length < bodyEnd) {
        return;
      }

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);

      const parsed: unknown = JSON.parse(body);
      const message = parsed as JsonRpcMessage;
      if (message.id !== undefined) {
        if (message.method !== undefined) {
          const handler = this.requestHandlers.get(message.method);
          this.send({
            jsonrpc: '2.0',
            id: message.id,
            result: handler === undefined ? null : handler(message.params),
          });
          continue;
        }
        const resolvePending = this.pending.get(message.id);
        if (resolvePending !== undefined) {
          this.pending.delete(message.id);
          resolvePending(message);
        }
        continue;
      }

      const notification = parsed as JsonRpcNotification;
      const waiters = this.notificationWaiters.get(notification.method);
      const waiter = waiters?.shift();
      if (waiter !== undefined) {
        if (waiter.predicate(notification.params)) {
          clearTimeout(waiter.timer);
          waiter.resolve(notification.params);
        } else {
          waiters?.push(waiter);
        }
      }
    }
  }
}

interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: { code?: string; message: string; severity: number }[];
}

function decodeSemanticTokens(data: readonly number[]): {
  line: number;
  character: number;
  length: number;
  type: number;
  modifiers: number;
}[] {
  const tokens: {
    line: number;
    character: number;
    length: number;
    type: number;
    modifiers: number;
  }[] = [];
  let line = 0;
  let character = 0;
  for (let index = 0; index + 4 < data.length; index += 5) {
    const deltaLine = data[index] ?? 0;
    const deltaCharacter = data[index + 1] ?? 0;
    if (deltaLine === 0) {
      character += deltaCharacter;
    } else {
      line += deltaLine;
      character = deltaCharacter;
    }
    tokens.push({
      line,
      character,
      length: data[index + 2] ?? 0,
      type: data[index + 3] ?? 0,
      modifiers: data[index + 4] ?? 0,
    });
  }
  return tokens;
}

void test('stdio server advertises and serves implemented language capabilities', async (t) => {
  const serverPath = fileURLToPath(new URL('../src/server.js', import.meta.url));
  const client = new StdioLspClient(serverPath);
  t.after(async () => {
    await client.terminate();
  });

  const initializeResult = (await client.request('initialize', {
    processId: process.pid,
    rootUri: null,
    capabilities: {},
    workspaceFolders: null,
  })) as {
    capabilities: {
      textDocumentSync: number;
      completionProvider: { triggerCharacters?: string[] };
      codeActionProvider?: { codeActionKinds?: string[]; resolveProvider?: boolean };
      hoverProvider: boolean;
      signatureHelpProvider: { triggerCharacters?: string[] };
      definitionProvider: boolean;
      referencesProvider: boolean;
      documentSymbolProvider: boolean;
      workspaceSymbolProvider?: boolean;
      documentFormattingProvider: boolean;
      semanticTokensProvider?: {
        legend: { tokenTypes: string[]; tokenModifiers: string[] };
        range: boolean;
        full: boolean | { delta?: boolean };
      };
      renameProvider?: { prepareProvider?: boolean };
    };
  };

  assert.equal(initializeResult.capabilities.textDocumentSync, 2);
  assert.deepEqual(initializeResult.capabilities.completionProvider.triggerCharacters, ['.']);
  assert.deepEqual(initializeResult.capabilities.codeActionProvider?.codeActionKinds, [
    'quickfix',
    'refactor.inline',
  ]);
  assert.equal(initializeResult.capabilities.codeActionProvider?.resolveProvider, false);
  assert.equal(initializeResult.capabilities.hoverProvider, true);
  assert.deepEqual(initializeResult.capabilities.signatureHelpProvider.triggerCharacters, [
    '(',
    ',',
  ]);
  assert.equal(initializeResult.capabilities.definitionProvider, true);
  assert.equal(initializeResult.capabilities.referencesProvider, true);
  assert.equal(initializeResult.capabilities.documentSymbolProvider, true);
  assert.equal(initializeResult.capabilities.workspaceSymbolProvider, true);
  assert.equal(initializeResult.capabilities.documentFormattingProvider, true);
  assert.deepEqual(initializeResult.capabilities.semanticTokensProvider?.legend.tokenTypes, [
    'function',
    'method',
    'variable',
    'parameter',
    'number',
    'operator',
  ]);
  assert.deepEqual(initializeResult.capabilities.semanticTokensProvider?.legend.tokenModifiers, [
    'declaration',
    'defaultLibrary',
  ]);
  assert.equal(initializeResult.capabilities.semanticTokensProvider?.range, false);
  assert.equal(initializeResult.capabilities.semanticTokensProvider?.full, true);
  assert.equal(initializeResult.capabilities.renameProvider?.prepareProvider, true);

  client.notify('initialized', {});

  const uri = 'file:///test/integration.strudel';
  const text = 'const pat = s("bd sd").fast(2)\npat';
  const firstDiagnostics = client.waitForNotification('textDocument/publishDiagnostics');
  client.notify('textDocument/didOpen', {
    textDocument: { uri, languageId: 'strudel', version: 1, text },
  });
  const published = (await firstDiagnostics) as PublishDiagnosticsParams;
  assert.equal(published.uri, uri);
  assert.deepEqual(published.diagnostics, []);

  const completion = (await client.request('textDocument/completion', {
    textDocument: { uri },
    position: { line: 1, character: 3 },
  })) as { label: string }[];
  assert.equal(
    completion.some((item) => item.label === 'pat'),
    true,
  );

  const hover = (await client.request('textDocument/hover', {
    textDocument: { uri },
    position: { line: 0, character: text.indexOf('s(') },
  })) as { contents: { value: string } } | null;
  assert.ok(hover !== null);
  assert.match(hover.contents.value, /Select a sound/);

  const signatureHelp = (await client.request('textDocument/signatureHelp', {
    textDocument: { uri },
    position: { line: 0, character: text.indexOf('2') },
  })) as { signatures: { label: string }[]; activeParameter: number } | null;
  assert.ok(signatureHelp !== null);
  assert.equal(signatureHelp.signatures[0]?.label, 'fast(factor: number | Pattern)');
  assert.equal(signatureHelp.activeParameter, 0);

  const definition = (await client.request('textDocument/definition', {
    textDocument: { uri },
    position: { line: 1, character: 1 },
  })) as { range: { start: { line: number } } }[];
  assert.equal(definition[0]?.range.start.line, 0);

  const references = (await client.request('textDocument/references', {
    textDocument: { uri },
    position: { line: 0, character: 7 },
    context: { includeDeclaration: true },
  })) as { range: { start: { line: number } } }[];
  assert.equal(references.length, 2);

  const documentSymbols = (await client.request('textDocument/documentSymbol', {
    textDocument: { uri },
  })) as {
    name: string;
    kind: number;
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    selectionRange: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  }[];
  assert.equal(documentSymbols.length, 1);
  assert.equal(documentSymbols[0]?.name, 'pat');
  assert.equal(documentSymbols[0]?.kind, SymbolKind.Variable);
  assert.equal(documentSymbols[0]?.selectionRange.start.character, 6);
  assert.equal(documentSymbols[0]?.selectionRange.end.character, 9);
  assert.equal(documentSymbols[0]?.range.start.line, 0);

  const semanticTokens = (await client.request('textDocument/semanticTokens/full', {
    textDocument: { uri },
  })) as { data: number[] };
  assert.deepEqual(
    decodeSemanticTokens(semanticTokens.data).map((token) => [
      token.line,
      token.character,
      token.length,
      token.type,
      token.modifiers,
    ]),
    [
      [0, 6, 3, 2, 1],
      [0, 12, 1, 0, 2],
      [0, 23, 4, 1, 2],
      [1, 0, 3, 2, 0],
    ],
  );

  const preparedRename = (await client.request('textDocument/prepareRename', {
    textDocument: { uri },
    position: { line: 1, character: 1 },
  })) as {
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    placeholder: string;
  } | null;
  assert.ok(preparedRename !== null);
  assert.equal(preparedRename.placeholder, 'pat');
  assert.equal(preparedRename.range.start.line, 1);
  assert.equal(preparedRename.range.end.character, 3);

  const builtinPrepare = await client.request('textDocument/prepareRename', {
    textDocument: { uri },
    position: { line: 0, character: text.indexOf('s(') },
  });
  assert.equal(builtinPrepare, null);

  const rename = (await client.request('textDocument/rename', {
    textDocument: { uri },
    position: { line: 1, character: 1 },
    newName: 'loop',
  })) as { changes: Record<string, { newText: string }[]> } | null;
  assert.ok(rename !== null);
  assert.equal(rename.changes[uri]?.length, 2);
  assert.equal(
    rename.changes[uri]?.every((edit) => edit.newText === 'loop'),
    true,
  );

  const formatUri = 'file:///test/format.strudel';
  const formatText = 'function f() {\n    return s("bd")\n  }';
  const formatDiagnostics = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) => (params as PublishDiagnosticsParams).uri === formatUri,
  );
  client.notify('textDocument/didOpen', {
    textDocument: { uri: formatUri, languageId: 'strudel', version: 1, text: formatText },
  });
  await formatDiagnostics;

  const formatting = (await client.request('textDocument/formatting', {
    textDocument: { uri: formatUri },
    options: { tabSize: 2, insertSpaces: true },
  })) as {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  }[];
  assert.deepEqual(formatting, [
    {
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 4 },
      },
      newText: '  ',
    },
    {
      range: {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 2 },
      },
      newText: '',
    },
  ]);

  const miniUri = 'file:///test/mini.strudel';
  const miniText = 's("[]")';
  const miniDiagnostics = client.waitForNotification('textDocument/publishDiagnostics', (params) =>
    (params as PublishDiagnosticsParams).diagnostics.some(
      (diagnostic) => diagnostic.code === 'empty-group',
    ),
  );
  client.notify('textDocument/didOpen', {
    textDocument: { uri: miniUri, languageId: 'strudel', version: 1, text: miniText },
  });
  await miniDiagnostics;

  const codeActions = (await client.request('textDocument/codeAction', {
    textDocument: { uri: miniUri },
    range: { start: { line: 0, character: 3 }, end: { line: 0, character: 5 } },
    context: { diagnostics: [] },
  })) as {
    title: string;
    kind: string;
    diagnostics: { code?: string }[];
    edit: { changes: Record<string, { newText: string }[]> };
  }[];
  assert.equal(codeActions.length, 1);
  assert.equal(codeActions[0]?.kind, 'quickfix');
  assert.equal(codeActions[0]?.diagnostics[0]?.code, 'empty-group');
  assert.equal(codeActions[0]?.edit.changes[miniUri]?.[0]?.newText, '');

  const refactorUri = 'file:///test/refactor.strudel';
  const refactorText = 'const kick = "bd sd";\ns(kick);';
  client.notify('textDocument/didOpen', {
    textDocument: { uri: refactorUri, languageId: 'strudel', version: 1, text: refactorText },
  });
  const refactorActions = (await client.request('textDocument/codeAction', {
    textDocument: { uri: refactorUri },
    range: { start: { line: 1, character: 4 }, end: { line: 1, character: 8 } },
    context: { diagnostics: [] },
  })) as {
    title: string;
    kind: string;
    edit: { changes: Record<string, { newText: string }[]> };
  }[];
  assert.equal(refactorActions.length, 1);
  assert.equal(refactorActions[0]?.title, "Inline constant 'kick'");
  assert.equal(refactorActions[0]?.kind, 'refactor.inline');
  assert.deepEqual(
    refactorActions[0]?.edit.changes[refactorUri]?.map((edit) => edit.newText),
    ['', '"bd sd"'],
  );

  const unknownDiagnostics = client.waitForNotification('textDocument/publishDiagnostics');
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: 'unknownFn()' }],
  });
  const unknown = (await unknownDiagnostics) as PublishDiagnosticsParams;
  assert.equal(unknown.diagnostics.length, 1);
  assert.equal(unknown.diagnostics[0]?.code, 'unknown-global');
  assert.equal(unknown.diagnostics[0]?.severity, 3);

  const rapidDiagnostics = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) => (params as PublishDiagnosticsParams).diagnostics.length === 0,
  );
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 3 },
    contentChanges: [{ text: 'unknownFn()' }],
  });
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 4 },
    contentChanges: [{ text: 'const ok = 1' }],
  });
  const rapid = (await rapidDiagnostics) as PublishDiagnosticsParams;
  assert.deepEqual(rapid.diagnostics, []);

  const clearedDiagnostics = client.waitForNotification('textDocument/publishDiagnostics');
  client.notify('textDocument/didClose', { textDocument: { uri } });
  const cleared = (await clearedDiagnostics) as PublishDiagnosticsParams;
  assert.deepEqual(cleared.diagnostics, []);

  assert.equal(await client.request('shutdown'), null);
  client.notify('exit', {});
  await client.waitForExit();
});

interface WorkspaceSymbolInformation {
  readonly name: string;
  readonly kind: number;
  readonly containerName?: string;
  readonly location: {
    readonly uri: string;
    readonly range: {
      readonly start: { readonly line: number; readonly character: number };
      readonly end: { readonly line: number; readonly character: number };
    };
  };
}

void test('stdio server searches workspace files and open documents', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'strudel-workspace-'));
  const serverPath = fileURLToPath(new URL('../src/server.js', import.meta.url));
  const client = new StdioLspClient(serverPath);
  t.after(async () => {
    await client.terminate();
    await rm(root, { recursive: true, force: true });
  });

  await writeFile(join(root, 'open.strudel'), 'const stale = s("sd");', 'utf8');
  await writeFile(
    join(root, 'closed.strudel'),
    'function closed(drum) { return s(drum); }',
    'utf8',
  );
  await writeFile(join(root, 'ignored.txt'), 'const ignored = 1;', 'utf8');

  const rootUri = pathToFileURL(root).href;
  const initializeResult = (await client.request('initialize', {
    processId: process.pid,
    rootUri,
    capabilities: {},
    workspaceFolders: [{ uri: rootUri, name: 'workspace' }],
  })) as { capabilities: { workspaceSymbolProvider?: boolean } };
  assert.equal(initializeResult.capabilities.workspaceSymbolProvider, true);
  client.notify('initialized', {});

  const openUri = pathToFileURL(join(root, 'open.strudel')).href;
  const openedDiagnostics = client.waitForNotification('textDocument/publishDiagnostics');
  client.notify('textDocument/didOpen', {
    textDocument: {
      uri: openUri,
      languageId: 'strudel',
      version: 1,
      text: 'const live = s("bd");',
    },
  });
  await openedDiagnostics;

  const liveSymbols = (await client.request('workspace/symbol', {
    query: 'li',
  })) as WorkspaceSymbolInformation[];
  assert.deepEqual(
    liveSymbols.map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      uri: symbol.location.uri,
    })),
    [{ name: 'live', kind: SymbolKind.Variable, uri: openUri }],
  );
  assert.equal(
    liveSymbols.some((symbol) => symbol.name === 'stale'),
    false,
  );

  const closedSymbols = (await client.request('workspace/symbol', {
    query: 'cl',
  })) as WorkspaceSymbolInformation[];
  assert.equal(closedSymbols[0]?.name, 'closed');
  assert.equal(closedSymbols[0]?.kind, SymbolKind.Function);
  assert.equal(closedSymbols[0]?.location.uri, pathToFileURL(join(root, 'closed.strudel')).href);

  const parameterSymbols = (await client.request('workspace/symbol', {
    query: 'dr',
  })) as WorkspaceSymbolInformation[];
  assert.equal(parameterSymbols[0]?.name, 'drum');
  assert.equal(parameterSymbols[0]?.kind, SymbolKind.Variable);
  assert.equal(parameterSymbols[0]?.containerName, 'closed');
  assert.equal(parameterSymbols[0]?.location.range.start.line, 0);

  assert.equal(await client.request('shutdown'), null);
  client.notify('exit', {});
  await client.waitForExit();
});

void test('stdio server applies workspace configuration and republishes on change', async (t) => {
  const serverPath = fileURLToPath(new URL('../src/server.js', import.meta.url));
  const client = new StdioLspClient(serverPath);
  t.after(async () => {
    await client.terminate();
  });

  let settings: unknown = { diagnostics: { severity: { 'unknown-global': 'warning' } } };
  client.onRequest('workspace/configuration', () => [settings]);

  await client.request('initialize', {
    processId: process.pid,
    rootUri: null,
    capabilities: { workspace: { configuration: true } },
    workspaceFolders: null,
  });
  client.notify('initialized', {});

  const uri = 'file:///test/config.strudel';
  const warned = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) =>
      (params as PublishDiagnosticsParams).uri === uri &&
      (params as PublishDiagnosticsParams).diagnostics[0]?.severity === 2,
  );
  client.notify('textDocument/didOpen', {
    textDocument: { uri, languageId: 'strudel', version: 1, text: 'unknownFn()' },
  });
  await warned;

  settings = { diagnostics: { severity: { 'unknown-global': 'off' } } };
  const cleared = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) =>
      (params as PublishDiagnosticsParams).uri === uri &&
      (params as PublishDiagnosticsParams).diagnostics.length === 0,
  );
  client.notify('workspace/didChangeConfiguration', { settings: {} });
  await cleared;

  assert.equal(await client.request('shutdown'), null);
  client.notify('exit', {});
  await client.waitForExit();
});
