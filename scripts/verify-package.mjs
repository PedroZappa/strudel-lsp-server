import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const TEMP_ROOT = await mkdtemp(join(tmpdir(), 'strudel-lsp-package-'));
const PARSER_CHECK = `
const Parser = require('tree-sitter');
const language = require('tree-sitter-strudel');
if (!language) throw new Error('tree-sitter-strudel did not export a language');
const parser = new Parser();
parser.setLanguage(language);
const tree = parser.parse('sound("bd")');
const root = tree.rootNode.toString();
if (!root) throw new Error('parser produced an empty tree');
console.log('Native parser loaded on ' + process.platform + '-' + process.arch + ': ' + root);
`;

function runNpm(args, cwd) {
  const result = spawnSync(NPM, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${NPM} ${args.join(' ')} failed in ${cwd}\n${details}`);
  }
  return result.stdout;
}

function runNode(args, cwd) {
  const result = spawnSync(NODE, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`node ${args.join(' ')} failed in ${cwd}\n${details}`);
  }
  return result.stdout;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkParserBinding(installDir, scriptsEnabled) {
  const parserDir = join(installDir, 'node_modules', 'tree-sitter-strudel');
  const prebuild = join(
    parserDir,
    'prebuilds',
    `${process.platform}-${process.arch}`,
    'tree-sitter-strudel.node',
  );
  await access(prebuild);
  assert.equal(
    await exists(join(parserDir, 'build')),
    false,
    'install scripts compiled the parser instead of using a prebuild',
  );

  const output = runNode(['--input-type=commonjs', '-e', PARSER_CHECK], installDir);
  if (scriptsEnabled) {
    assert.match(output, /Native parser loaded on /);
  }
}

async function withTimeout(promise, milliseconds, message, onTimeout) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          onTimeout();
          reject(new Error(message));
        }, milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkStdioServer(executable) {
  await access(executable);
  const child = spawn(executable, [], {
    stdio: ['pipe', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
  });
  const pending = new Map();
  let buffer = '';
  let nextId = 1;

  const exited = new Promise((done) =>
    child.once('exit', (code, signal) => done({ code, signal })),
  );
  child.once('error', (error) => {
    throw error;
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = buffer.slice(0, headerEnd);
      const match = /Content-Length: (\d+)/i.exec(header);
      assert.ok(match, `malformed LSP header: ${header}`);
      const bodyStart = headerEnd + 4;
      const bodyLength = Number(match[1]);
      if (buffer.length < bodyStart + bodyLength) return;
      const body = buffer.slice(bodyStart, bodyStart + bodyLength);
      buffer = buffer.slice(bodyStart + bodyLength);
      const message = JSON.parse(body);
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        waiter(message);
      }
    }
  });

  function writeMessage(message) {
    const body = JSON.stringify(message);
    child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  function request(method, params) {
    const id = nextId;
    nextId += 1;
    const response = new Promise((done) => pending.set(id, done));
    writeMessage({ jsonrpc: '2.0', id, method, params });
    return response;
  }

  try {
    const result = await withTimeout(
      (async () => {
        const initialize = await request('initialize', {
          processId: process.pid,
          rootUri: null,
          capabilities: {},
          workspaceFolders: null,
        });
        assert.equal(initialize.error, undefined);
        assert.ok(initialize.result?.capabilities, 'initialize result lacks capabilities');
        assert.ok(initialize.result.capabilities.completionProvider);
        assert.ok(initialize.result.capabilities.definitionProvider);
        assert.ok(initialize.result.capabilities.workspaceSymbolProvider);

        writeMessage({ jsonrpc: '2.0', method: 'initialized', params: {} });
        const shutdown = await request('shutdown', null);
        assert.equal(shutdown.error, undefined);
        writeMessage({ jsonrpc: '2.0', method: 'exit', params: null });
        child.stdin.end();
        return exited;
      })(),
      10_000,
      'Installed stdio server did not complete initialize/shutdown',
      () => child.kill(),
    );
    assert.equal(result.code, 0, `server exited with code ${result.code}`);
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

async function verifyInstallMode(mode, tarball) {
  const scriptsEnabled = mode === 'scripts';
  const scriptFlags = scriptsEnabled ? [] : ['--ignore-scripts'];
  const installDir = join(TEMP_ROOT, mode);
  await mkdir(installDir, { recursive: true });
  await copyFile(join(ROOT, 'package.json'), join(installDir, 'package.json'));
  await copyFile(join(ROOT, 'package-lock.json'), join(installDir, 'package-lock.json'));

  runNpm(['ci', '--offline', '--omit=dev', '--no-audit', '--no-fund', ...scriptFlags], installDir);
  runNpm(
    ['install', '--offline', '--omit=dev', '--no-audit', '--no-fund', ...scriptFlags, tarball],
    installDir,
  );

  const installedRoot = join(installDir, 'node_modules', 'strudel-lsp-server');
  const installedManifest = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedManifest.license, 'AGPL-3.0-only');
  const installedLicense = await readFile(join(installedRoot, 'LICENSE'), 'utf8');
  assert.match(installedLicense, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(installedLicense, /version 3 only/);

  await checkParserBinding(installDir, scriptsEnabled);

  const binName = process.platform === 'win32' ? 'strudel-lsp-server.cmd' : 'strudel-lsp-server';
  await checkStdioServer(join(installDir, 'node_modules', '.bin', binName));
  console.log(`Clean ${mode} install passed on ${process.platform}-${process.arch}.`);
}

try {
  const nodeMajor = process.versions.node.split('.')[0];
  const npmVersion = runNpm(['--version'], ROOT).trim();
  console.log(
    `Environment: ${process.platform}-${process.arch}, Node ${process.version}, npm ${npmVersion}`,
  );
  assert.ok(['24', '26'].includes(nodeMajor), `unsupported Node major: ${nodeMajor}`);
  assert.match(npmVersion, /^11\./, `unsupported npm major: ${npmVersion}`);

  const packOutput = runNpm(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', TEMP_ROOT],
    ROOT,
  );
  const [packageInfo] = JSON.parse(packOutput);
  const requiredFiles = ['LICENSE', 'README.md', 'dist/src/server.js'];
  for (const path of requiredFiles) {
    assert.ok(
      packageInfo.files.some((file) => file.path === path),
      `packed tarball is missing ${path}`,
    );
  }
  assert.ok(
    !packageInfo.files.some((file) => file.path.startsWith('dist/test/')),
    'packed tarball contains test output',
  );
  assert.ok(
    !packageInfo.files.some((file) => file.path.startsWith('benchmarks/')),
    'packed tarball contains benchmarks',
  );

  const tarball = join(TEMP_ROOT, packageInfo.filename);
  await verifyInstallMode('ignore-scripts', tarball);
  await verifyInstallMode('scripts', tarball);

  console.log(`Verified ${packageInfo.filename}: ${packageInfo.entryCount} files.`);
  console.log('Clean offline installs, native parser prebuild load and stdio handshakes passed.');
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
