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

class StdioLspClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, (message: JsonRpcMessage) => void>();
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
      }
    }
  }
}

void test('stdio server advertises no capabilities until providers are implemented', async (t) => {
  const serverPath = fileURLToPath(new URL('../src/server.js', import.meta.url));
  const client = new StdioLspClient(serverPath);
  t.after(async () => {
    await client.terminate();
  });

  const initializeResult = await client.request('initialize', {
    processId: process.pid,
    rootUri: null,
    capabilities: {},
    workspaceFolders: null,
  });

  assert.deepEqual(initializeResult, { capabilities: { textDocumentSync: 0 } });

  client.notify('initialized', {});
  assert.equal(await client.request('shutdown'), null);
  client.notify('exit', {});
  await client.waitForExit();
});
