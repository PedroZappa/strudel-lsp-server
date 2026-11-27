import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, tmpdir, totalmem } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  BATCH_COUNT,
  SAMPLE_COUNT,
  SAMPLES_PER_BATCH,
  WARMUP_ITERATIONS,
  round,
  summarizeBatches,
} from './lib/benchmarkStats.mjs';
import {
  ROOT,
  checkParserBinding,
  createIsolatedNpmEnv,
  packTarball,
  runNpm,
} from './lib/installVerification.mjs';

const REPORT_PATH = join(ROOT, 'benchmarks', 'end-to-end.json');
const WORKLOAD_ID = 'jsonrpc-installed-document-symbol';
const DOCUMENT_URI = 'file:///benchmark/installed-binary.strudel';
const REQUEST_TIMEOUT_MS = 10_000;

function parseArguments(argv) {
  const options = { writeReport: false };
  for (const argument of argv) {
    if (argument === '--write-report') {
      options.writeReport = true;
    } else {
      throw new Error(`Unknown end-to-end benchmark option: ${argument}`);
    }
  }
  return options;
}

function consume(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).length;
  }
  return typeof value === 'number' ? value : 0;
}

function documentText(version) {
  return [
    'const pat = s("bd sd")',
    `pat.fast(${version})`,
    's("[hh hh]*4")',
    'const buried = "sd"',
    's(buried)',
    '',
  ].join('\n');
}

function documentChange(version) {
  return {
    textDocument: { uri: DOCUMENT_URI, version },
    contentChanges: [{ text: documentText(version) }],
  };
}

class InstalledServerClient {
  constructor(executable) {
    this.child = spawn(executable, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    this.buffer = Buffer.alloc(0);
    this.stderrText = '';
    this.pending = new Map();
    this.nextId = 1;
    this.exited = new Promise((resolve, reject) => {
      this.child.once('exit', (code, signal) => {
        for (const waiter of this.pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new Error('Installed server exited before responding'));
        }
        this.pending.clear();
        resolve({ code, signal });
      });
      this.child.once('error', reject);
    });
    this.child.stdout.on('data', (chunk) => this.handleChunk(chunk));
    this.child.stderr.on('data', (chunk) => {
      this.stderrText += chunk.toString('utf8');
    });
  }

  request(method, params) {
    const id = this.nextId;
    this.nextId += 1;
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve,
        reject,
        timer,
      });
    });
    this.write({ jsonrpc: '2.0', id, method, params });
    return response;
  }

  notify(method, params) {
    this.write({ jsonrpc: '2.0', method, params });
  }

  write(message) {
    const body = JSON.stringify(message);
    this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  handleChunk(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        return;
      }
      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const match = /^Content-Length:\s*(\d+)$/i.exec(header);
      assert.ok(match, `Malformed LSP header: ${header}`);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + Number(match[1]);
      if (this.buffer.length < bodyEnd) {
        return;
      }
      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);
      const message = JSON.parse(body);
      const waiter = this.pending.get(message.id);
      if (waiter) {
        this.pending.delete(message.id);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  }

  async initialize() {
    const response = await this.request('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
      workspaceFolders: null,
    });
    assert.equal(response.error, undefined);
    assert.ok(response.result?.capabilities, 'initialize result lacks capabilities');
    assert.ok(response.result.capabilities.documentSymbolProvider);
    this.notify('initialized', {});
  }

  async shutdownAndExit() {
    const response = await this.request('shutdown', null);
    assert.equal(response.error, undefined);
    assert.equal(response.result, null);
    this.notify('exit', {});
    const result = await this.exited;
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    assert.equal(this.stderrText, '');
    assert.equal(this.buffer.length, 0);
  }

  terminate() {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill();
    }
  }
}

async function installServer(tempRoot, packEnv) {
  const packageInfo = packTarball(tempRoot, packEnv);
  const installDir = join(tempRoot, 'install');
  await mkdir(installDir, { recursive: true });
  await copyFile(join(ROOT, 'package.json'), join(installDir, 'package.json'));
  await copyFile(join(ROOT, 'package-lock.json'), join(installDir, 'package-lock.json'));

  runNpm(
    ['ci', '--offline', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'],
    installDir,
  );
  runNpm(
    [
      'install',
      '--offline',
      '--omit=dev',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      join(tempRoot, packageInfo.filename),
    ],
    installDir,
  );

  await checkParserBinding(installDir, false);
  const binName = process.platform === 'win32' ? 'strudel-lsp-server.cmd' : 'strudel-lsp-server';
  return {
    executable: join(installDir, 'node_modules', '.bin', binName),
    packageInfo,
  };
}

async function measureBatch(executable) {
  const client = new InstalledServerClient(executable);
  try {
    await client.initialize();
    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: DOCUMENT_URI,
        languageId: 'strudel',
        version: 1,
        text: documentText(1),
      },
    });

    let version = 2;
    for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
      client.notify('textDocument/didChange', documentChange(version));
      version += 1;
      const response = await client.request('textDocument/documentSymbol', {
        textDocument: { uri: DOCUMENT_URI },
      });
      assert.equal(response.error, undefined);
      consume(response.result);
    }

    const samples = [];
    for (let sample = 0; sample < SAMPLES_PER_BATCH; sample += 1) {
      client.notify('textDocument/didChange', documentChange(version));
      version += 1;
      const start = performance.now();
      const response = await client.request('textDocument/documentSymbol', {
        textDocument: { uri: DOCUMENT_URI },
      });
      samples.push(performance.now() - start);
      assert.equal(response.error, undefined);
      consume(response.result);
    }

    await client.shutdownAndExit();
    return samples;
  } finally {
    client.terminate();
  }
}

async function environmentInfo(packageInfo) {
  const packageJson = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const processor = cpus()[0];
  return {
    node: process.version,
    platform: platform(),
    architecture: arch(),
    cpuModel: processor?.model ?? 'unknown',
    logicalCpus: cpus().length,
    totalMemoryGiB: round(totalmem() / 1024 ** 3),
    packageVersion: packageInfo.version,
    parserVersion: packageJson.dependencies['tree-sitter-strudel'],
    strudelCoreVersion: packageJson.devDependencies['@strudel/core'],
    typescriptVersion: packageJson.devDependencies.typescript,
  };
}

function methodology() {
  return {
    timer: 'node:perf_hooks.performance.now',
    transport: 'stdio JSON-RPC through the installed npm bin',
    request: 'textDocument/documentSymbol after textDocument/didChange',
    installation:
      'local tarball packed with isolated npm config, installed offline from the pinned lockfile',
    warmupIterations: WARMUP_ITERATIONS,
    batchCount: BATCH_COUNT,
    samplesPerBatch: SAMPLES_PER_BATCH,
    sampleCount: SAMPLE_COUNT,
    percentileMethod: 'nearest-rank within each batch, then median across batches',
    advisory: true,
  };
}

function printResults(stats) {
  console.log('End-to-end benchmark (advisory, separate from the layer-level baseline)');
  console.log('workload                        p50      p95      p99      samples');
  console.log(
    `${WORKLOAD_ID.padEnd(31)} ${stats.p50.toFixed(3).padStart(7)} ${stats.p95
      .toFixed(3)
      .padStart(8)} ${stats.p99.toFixed(3).padStart(8)} ${String(stats.samples).padStart(8)}`,
  );
  console.log('No thresholds are stored; this workload is not part of benchmark:check.');
}

const options = parseArguments(process.argv.slice(2));
const tempRoot = await mkdtemp(join(tmpdir(), 'strudel-lsp-e2e-bench-'));

try {
  const packEnv = await createIsolatedNpmEnv(join(tempRoot, 'pack-cache'));
  const { executable, packageInfo } = await installServer(tempRoot, packEnv);
  const batches = [];
  for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
    batches.push(await measureBatch(executable));
  }

  const stats = summarizeBatches(batches);
  printResults(stats);
  const report = {
    schemaVersion: 1,
    advisory: true,
    generatedAt: new Date().toISOString(),
    environment: await environmentInfo(packageInfo),
    methodology: methodology(),
    workload: {
      id: WORKLOAD_ID,
      description:
        'Rapid edit and document-symbol request through JSON-RPC and the installed binary',
      fixture: 'small-live-edit.strudel',
      unit: 'ms',
      ...stats,
    },
  };
  console.log(JSON.stringify(report.environment));

  if (options.writeReport) {
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Wrote advisory report ${REPORT_PATH}`);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
