import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { RawStdioClient } from './helpers/rawStdioClient.js';

interface LspSymbol {
  name: string;
}

interface LspDiagnostic {
  readonly code?: string;
  readonly severity?: number;
}

interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

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

void test('clients without configuration capability keep default diagnostics until notified', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  await client.initialize({ capabilities: {} });
  assert.ok(
    !client.messages.some((message) => message.method === 'workspace/configuration'),
    'the server should not request a capability the client did not advertise',
  );

  const uri = 'file:///test/no-config.strudel';
  const defaultDiagnostics = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) => isDiagnosticsParams(params) && params.uri === uri,
  );
  client.notify('textDocument/didOpen', {
    textDocument: {
      uri,
      languageId: 'strudel',
      version: 1,
      text: 'unknownFn()',
    },
  });
  const initial = await defaultDiagnostics;
  assert.ok(isDiagnosticsParams(initial));
  assert.equal(initial.diagnostics[0]?.code, 'unknown-global');
  assert.equal(initial.diagnostics[0]?.severity, 3);

  const disabled = client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) => isDiagnosticsParams(params) && params.uri === uri,
  );
  client.notify('workspace/didChangeConfiguration', {
    settings: { strudelLsp: { diagnostics: { enabled: false } } },
  });
  const cleared = await disabled;
  assert.ok(isDiagnosticsParams(cleared));
  assert.deepEqual(cleared.diagnostics, []);
  assert.ok(
    !client.messages.some((message) => message.method === 'workspace/configuration'),
    'a settings notification must not cause a configuration request',
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
