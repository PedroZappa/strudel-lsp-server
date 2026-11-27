import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const NODE = process.execPath;
export const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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

export function runNpm(args, cwd, env = process.env) {
  const result = spawnSync(NPM, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${NPM} ${args.join(' ')} failed in ${cwd}\n${details}`);
  }
  return result.stdout;
}

export function runNode(args, cwd, env = process.env) {
  const result = spawnSync(NODE, args, { cwd, encoding: 'utf8', env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`node ${args.join(' ')} failed in ${cwd}\n${details}`);
  }
  return result.stdout;
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function createIsolatedNpmEnv(root) {
  const configDir = join(root, 'npm-config');
  const cacheDir = join(root, 'npm-cache');
  await mkdir(configDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });
  const userConfig = join(configDir, 'user-npmrc');
  const globalConfig = join(configDir, 'global-npmrc');
  await writeFile(userConfig, '', 'utf8');
  await writeFile(globalConfig, '', 'utf8');

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('npm_config_')),
  );
  env.npm_config_userconfig = userConfig;
  env.npm_config_globalconfig = globalConfig;
  env.npm_config_cache = cacheDir;
  env.npm_config_update_notifier = 'false';
  return env;
}

export function npmConfigValue(name, cwd, env) {
  return runNpm(['config', 'get', name], cwd, env).trim();
}

export function packTarball(destination, env = process.env) {
  const output = runNpm(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', destination],
    ROOT,
    env,
  );
  const [packageInfo] = JSON.parse(output);
  assert.ok(packageInfo?.filename, 'npm pack did not return a tarball');
  return packageInfo;
}

export async function checkParserBinding(installDir, scriptsEnabled) {
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

export function withTimeout(promise, milliseconds, message, onTimeout) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        onTimeout();
        reject(new Error(message));
      }, milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function checkStdioServer(executable) {
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

  return (async () => {
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
  })();
}
