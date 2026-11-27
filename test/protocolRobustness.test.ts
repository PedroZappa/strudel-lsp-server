import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string };
}

interface MessageWaiter {
  predicate: (message: JsonRpcMessage) => boolean;
  resolve: (message: JsonRpcMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface LspSymbol {
  name: string;
}

interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: unknown[];
}

const SERVER_PATH = fileURLToPath(new URL('../src/server.js', import.meta.url));
const WAIT_TIMEOUT_MS = 10_000;

function isSymbolArray(value: unknown): value is LspSymbol[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string',
    )
  );
}

function isDiagnosticsParams(value: unknown): value is PublishDiagnosticsParams {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { uri?: unknown }).uri === 'string' &&
    Array.isArray((value as { diagnostics?: unknown }).diagnostics)
  );
}

class RawStdioClient {
  readonly messages: JsonRpcMessage[] = [];
  readonly stdoutViolations: string[] = [];
  stderrText = '';
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly waiters: MessageWaiter[] = [];
  private buffer = Buffer.alloc(0);
  private nextId = 1;

  constructor() {
    this.child = spawn(process.execPath, [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.handleChunk(chunk);
    });
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderrText += chunk.toString('utf8');
    });
    this.child.on('exit', (code, signal) => {
      this.exitCode = code;
      this.signalCode = signal;
    });
  }

  get pendingStdoutBytes(): number {
    return this.buffer.length;
  }

  request(method: string, params: unknown = {}, id = this.nextId++): Promise<JsonRpcMessage> {
    const response = this.waitForMessage(
      (message) => message.id === id && message.method === undefined,
    );
    this.send({ jsonrpc: '2.0', id, method, params });
    return response;
  }

  notify(method: string, params: unknown = {}): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  cancel(id: number): void {
    this.notify('$/cancelRequest', { id });
  }

  private send(message: object): void {
    this.sendRawBody(JSON.stringify(message));
  }

  sendRawBody(body: string): void {
    const payload = Buffer.from(body, 'utf8');
    this.child.stdin.write(`Content-Length: ${payload.byteLength}\r\n\r\n`);
    this.child.stdin.write(payload);
  }

  waitForMessage(
    predicate: (message: JsonRpcMessage) => boolean,
    timeout = WAIT_TIMEOUT_MS,
  ): Promise<JsonRpcMessage> {
    return new Promise<JsonRpcMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((waiter) => waiter.timer === timer);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(new Error('Timed out waiting for JSON-RPC message'));
      }, timeout);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  waitForNotification(
    method: string,
    predicate: (params: unknown) => boolean = () => true,
  ): Promise<unknown> {
    return this.waitForMessage(
      (message) => message.method === method && predicate(message.params),
    ).then((message) => message.params);
  }

  async initialize(
    options: {
      capabilities?: Record<string, unknown>;
      rootUri?: string | null;
      workspaceFolders?: unknown;
    } = {},
  ): Promise<void> {
    const response = await this.request('initialize', {
      processId: process.pid,
      rootUri: options.rootUri ?? null,
      capabilities: options.capabilities ?? {},
      workspaceFolders: options.workspaceFolders ?? null,
    });
    assert.equal(response.error, undefined);
    this.notify('initialized', {});
  }

  async shutdownAndExit(): Promise<number | null> {
    const response = await this.request('shutdown');
    assert.equal(response.error, undefined);
    assert.equal(response.result, null);
    this.notify('exit', {});
    return this.waitForExit();
  }

  async waitForExit(timeout = WAIT_TIMEOUT_MS): Promise<number | null> {
    if (this.exitCode !== null || this.signalCode !== null) {
      return this.exitCode;
    }
    return new Promise<number | null>((resolve, reject) => {
      const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
        clearTimeout(timer);
        this.exitCode = code;
        this.signalCode = signal;
        resolve(code);
      };
      const timer = setTimeout(() => {
        this.child.off('exit', onExit);
        reject(new Error('LSP server did not exit'));
      }, timeout);
      this.child.once('exit', onExit);
    });
  }

  async terminate(): Promise<void> {
    if (this.exitCode === null && this.signalCode === null) {
      this.child.kill();
      await this.waitForExit();
    }
  }

  private handleChunk(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        return;
      }

      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const lines = header.split('\r\n');
      const lengthMatch =
        lines.length === 1 ? /^Content-Length:\s*(\d+)$/i.exec(lines[0] ?? '') : null;
      if (lengthMatch === null) {
        this.stdoutViolations.push(`Unframed stdout: ${JSON.stringify(header)}`);
        this.buffer = Buffer.alloc(0);
        return;
      }

      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + Number(lengthMatch[1]);
      if (this.buffer.length < bodyEnd) {
        return;
      }

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        this.stdoutViolations.push(`Invalid JSON on stdout: ${JSON.stringify(body)}`);
        continue;
      }
      if (
        typeof parsed !== 'object' ||
        (parsed as { jsonrpc?: unknown } | null)?.jsonrpc !== '2.0'
      ) {
        this.stdoutViolations.push(`Invalid JSON-RPC envelope on stdout: ${body}`);
        continue;
      }

      const message = parsed as JsonRpcMessage;
      this.messages.push(message);
      for (let index = this.waiters.length - 1; index >= 0; index -= 1) {
        const waiter = this.waiters[index];
        if (waiter?.predicate(message)) {
          clearTimeout(waiter.timer);
          this.waiters.splice(index, 1);
          waiter.resolve(message);
        }
      }
    }
  }
}

function assertCleanTransport(client: RawStdioClient): void {
  assert.deepEqual(client.stdoutViolations, []);
  assert.equal(client.pendingStdoutBytes, 0);
  assert.equal(client.stderrText, '');
}

function symbolNames(result: unknown): string[] {
  assert.ok(isSymbolArray(result));
  return result.map((symbol) => symbol.name);
}

void test('stdio transport stays framed and responsive after malformed input', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  client.sendRawBody('{ not json');
  client.sendRawBody('{}');
  client.sendRawBody(JSON.stringify({ jsonrpc: '2.0', id: 7 }));

  await client.initialize();
  const unknown = await client.request('no/such/method');
  assert.equal(unknown.error?.code, -32601);

  assert.ok(
    client.messages.some((message) => message.method === 'window/logMessage'),
    'malformed envelopes should be reported as framed LSP notifications',
  );
  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('invalid initialize parameters are ignored safely', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize({ workspaceFolders: 'not-an-array' });
  const symbols = await client.request('workspace/symbol', { query: 'anything' });
  assert.deepEqual(symbols.result, []);

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('no-workspace initialization does not request unsupported workspace folders', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize({ rootUri: null, workspaceFolders: null });
  const symbols = await client.request('workspace/symbol', { query: 'anything' });
  assert.deepEqual(symbols.result, []);
  assert.ok(
    !client.messages.some((message) => message.method === 'workspace/workspaceFolders'),
    'the server should not request a capability the client did not advertise',
  );

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('unknown methods and invalid parameters do not stop the server', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize();

  const unknown = await client.request('unsupported/serverMethod');
  assert.equal(unknown.error?.code, -32601);
  assert.match(unknown.error?.message ?? '', /Unhandled method/);

  const invalid = await client.request('textDocument/documentSymbol', { textDocument: null });
  assert.deepEqual(invalid.result, []);

  const followUp = await client.request('workspace/symbol', { query: 'still-alive' });
  assert.deepEqual(followUp.result, []);

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('cancelRequest stops a workspace scan without breaking the connection', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'strudel-protocol-cancel-'));
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
    await rm(root, { recursive: true, force: true });
  });

  for (let index = 0; index < 300; index += 1) {
    await writeFile(
      join(root, `pattern-${index}.strudel`),
      `const pattern${index} = s("bd");`,
      'utf8',
    );
  }

  const rootUri = pathToFileURL(root).href;
  await client.initialize({
    capabilities: { workspace: { workspaceFolders: true } },
    rootUri,
    workspaceFolders: [{ uri: rootUri, name: 'workspace' }],
  });

  const cancelledResponse = client.request('workspace/symbol', { query: 'pattern' }, 77);
  client.cancel(77);
  const cancelled = await cancelledResponse;
  assert.deepEqual(cancelled.result, []);

  const followUp = await client.request('workspace/symbol', { query: 'pattern271' }, 78);
  assert.deepEqual(symbolNames(followUp.result), ['pattern271']);

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('stale edits and document closure leave consistent protocol state', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize();
  const uri = 'file:///test/protocol-rapid.strudel';

  const openedDiagnostics = client.waitForNotification('textDocument/publishDiagnostics');
  client.notify('textDocument/didOpen', {
    textDocument: { uri, languageId: 'strudel', version: 1, text: 'const first = 1\nfirst' },
  });
  const opened = await openedDiagnostics;
  assert.ok(isDiagnosticsParams(opened));
  assert.equal(opened.uri, uri);

  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 3 },
    contentChanges: [{ text: 'const second = 2\nsecond' }],
  });
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: 'const stale = 3\nstale' }],
  });

  const symbols = await client.request('textDocument/documentSymbol', {
    textDocument: { uri },
  });
  assert.deepEqual(symbolNames(symbols.result), ['second']);

  const clearedDiagnostics = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) =>
      isDiagnosticsParams(params) && params.uri === uri && params.diagnostics.length === 0,
  );
  client.notify('textDocument/didClose', { textDocument: { uri } });
  await clearedDiagnostics;

  const afterClose = await client.request('textDocument/documentSymbol', {
    textDocument: { uri },
  });
  assert.deepEqual(afterClose.result, []);
  const hover = await client.request('textDocument/hover', {
    textDocument: { uri },
    position: { line: 0, character: 0 },
  });
  assert.equal(hover.result, null);

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('multi-root initialization scans every workspace folder', async (t) => {
  const firstRoot = await mkdtemp(join(tmpdir(), 'strudel-protocol-first-'));
  const secondRoot = await mkdtemp(join(tmpdir(), 'strudel-protocol-second-'));
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
    await rm(firstRoot, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  });

  await writeFile(join(firstRoot, 'alpha.strudel'), 'const alpha = s("bd");', 'utf8');
  await writeFile(join(secondRoot, 'beta.strudel'), 'const beta = s("sd");', 'utf8');

  const firstUri = pathToFileURL(firstRoot).href;
  const secondUri = pathToFileURL(secondRoot).href;
  await client.initialize({
    capabilities: { workspace: { workspaceFolders: true } },
    workspaceFolders: [
      { uri: firstUri, name: 'first' },
      { uri: secondUri, name: 'second' },
    ],
  });

  const first = await client.request('workspace/symbol', { query: 'alpha' });
  assert.deepEqual(symbolNames(first.result), ['alpha']);
  const second = await client.request('workspace/symbol', { query: 'beta' });
  assert.deepEqual(symbolNames(second.result), ['beta']);

  assertCleanTransport(client);
  assert.equal(await client.shutdownAndExit(), 0);
});

void test('exit without shutdown returns a non-zero code', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize();
  client.notify('exit', {});
  assert.equal(await client.waitForExit(), 1);
});
