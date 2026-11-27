import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface JsonRpcMessage {
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

export const SERVER_PATH = fileURLToPath(new URL('../../src/server.js', import.meta.url));
export const WAIT_TIMEOUT_MS = 10_000;

export class RawStdioClient {
  readonly messages: JsonRpcMessage[] = [];
  readonly stdoutViolations: string[] = [];
  stderrText = '';
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly waiters: MessageWaiter[] = [];
  private buffer = Buffer.alloc(0);
  private nextId = 1;

  constructor(serverPath = SERVER_PATH) {
    this.child = spawn(process.execPath, [serverPath], {
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

  get pid(): number | undefined {
    return this.child.pid;
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
