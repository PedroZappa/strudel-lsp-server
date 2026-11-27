import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

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
  result?: unknown;
  error?: JsonRpcError;
}

type JsonRpcOutgoing = JsonRpcRequest | JsonRpcNotification;

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
      hoverProvider: boolean;
      definitionProvider: boolean;
      referencesProvider: boolean;
    };
  };

  assert.equal(initializeResult.capabilities.textDocumentSync, 2);
  assert.deepEqual(initializeResult.capabilities.completionProvider.triggerCharacters, ['.']);
  assert.equal(initializeResult.capabilities.hoverProvider, true);
  assert.equal(initializeResult.capabilities.definitionProvider, true);
  assert.equal(initializeResult.capabilities.referencesProvider, true);

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
