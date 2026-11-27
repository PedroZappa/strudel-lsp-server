import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_MODULE = join(ROOT, 'dist', 'src', 'server.js');
const REPORT_PATH = join(ROOT, 'validation', 'client-smoke.json');
const VSCODE_EXECUTABLE_PATH =
  process.env.VSCODE_EXECUTABLE_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Visual Studio Code.app/Contents/MacOS/Code'
    : undefined);
const NVIM_BIN = process.env.NVIM_BIN || 'nvim';
const TIMEOUT_MS = 180_000;

function parseArguments(argv) {
  const options = { client: 'all', writeReport: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--client') {
      index += 1;
      options.client = argv[index];
      if (options.client !== 'vscode' && options.client !== 'nvim') {
        throw new Error(`unknown client: ${options.client}`);
      }
    } else if (argument === '--write-report') {
      options.writeReport = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (options.writeReport && options.client !== 'all') {
    throw new Error('--write-report requires both clients');
  }
  return options;
}

function runCommand(command, args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        rejectRun(new Error(`${basename(command)} exceeded ${TIMEOUT_MS} ms`));
      }
    }, TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        rejectRun(error);
      }
    });
    child.on('close', (code, signal) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (code !== 0) {
          const detail = (stderr || stdout).trim().split('\n').slice(-12).join('\n');
          rejectRun(
            new Error(
              `${basename(command)} exited with ${signal ?? code}${detail ? `:\n${detail}` : ''}`,
            ),
          );
          return;
        }
        resolveRun({ stdout, stderr });
      }
    });
  });
}

function readResult(resultPath, client) {
  if (!existsSync(resultPath)) {
    throw new Error(`${client} smoke test did not write a result`);
  }
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (result.status !== 'pass' || !Array.isArray(result.behaviours)) {
    throw new Error(`${client} smoke test did not pass: ${result.error ?? 'unknown failure'}`);
  }
  return result;
}

async function runVsCode(temporaryDirectory) {
  if (!VSCODE_EXECUTABLE_PATH || !existsSync(VSCODE_EXECUTABLE_PATH)) {
    throw new Error(
      'VS Code executable not found; set VSCODE_EXECUTABLE_PATH to the Electron executable',
    );
  }
  const userDataDirectory = join(temporaryDirectory, 'vscode-user');
  const extensionsDirectory = join(temporaryDirectory, 'vscode-extensions');
  const resultPath = join(temporaryDirectory, 'vscode-result.json');
  mkdirSync(userDataDirectory, { recursive: true });
  mkdirSync(extensionsDirectory, { recursive: true });

  await runCommand(
    VSCODE_EXECUTABLE_PATH,
    [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-updates',
      '--disable-extensions',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      `--user-data-dir=${userDataDirectory}`,
      `--extensions-dir=${extensionsDirectory}`,
      `--extensionDevelopmentPath=${join(ROOT, 'smoke', 'vscode')}`,
      `--extensionTestsPath=${join(ROOT, 'smoke', 'vscode', 'test', 'runner.js')}`,
    ],
    {
      ...process.env,
      STRUDEL_SMOKE_ROOT: ROOT,
      STRUDEL_SERVER_MODULE: SERVER_MODULE,
      STRUDEL_SMOKE_RESULT_PATH: resultPath,
    },
  );

  return readResult(resultPath, 'vscode');
}

async function runNeovim(temporaryDirectory) {
  const resultPath = join(temporaryDirectory, 'nvim-result.json');
  await runCommand(
    NVIM_BIN,
    ['--headless', '--clean', '-u', join(ROOT, 'smoke', 'nvim', 'init.lua')],
    {
      ...process.env,
      STRUDEL_SMOKE_ROOT: ROOT,
      STRUDEL_SERVER_MODULE: SERVER_MODULE,
      STRUDEL_NODE_BIN: process.execPath,
      STRUDEL_SMOKE_RESULT_PATH: resultPath,
    },
  );
  return readResult(resultPath, 'nvim');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!existsSync(SERVER_MODULE)) {
    throw new Error('dist/src/server.js is missing; run npm run build first');
  }

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'strudel-client-smoke-'));
  const selectedClients = options.client === 'all' ? ['vscode', 'nvim'] : [options.client];
  const outcomes = [];

  try {
    for (const client of selectedClients) {
      try {
        const result =
          client === 'vscode'
            ? await runVsCode(temporaryDirectory)
            : await runNeovim(temporaryDirectory);
        outcomes.push({
          client,
          editorVersion: result.editorVersion,
          clientLibraryVersion: result.clientLibraryVersion,
          transport: result.transport,
          status: 'pass',
          behaviours: result.behaviours,
        });
      } catch (error) {
        outcomes.push({
          client,
          status: 'fail',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  for (const outcome of outcomes) {
    if (outcome.status === 'pass') {
      console.log(
        `${outcome.client} ${outcome.editorVersion}: pass (${outcome.behaviours.length} behaviours)`,
      );
      for (const behaviour of outcome.behaviours) {
        console.log(`  - ${behaviour}`);
      }
    } else {
      console.error(`${outcome.client}: fail - ${outcome.error}`);
    }
  }

  if (outcomes.some((outcome) => outcome.status !== 'pass')) {
    process.exitCode = 1;
    return;
  }

  if (options.writeReport) {
    const report = {
      schemaVersion: 1,
      serverModule: 'dist/src/server.js',
      transport: 'stdio',
      environment: {
        platform: process.platform,
        architecture: process.arch,
        node: process.version,
      },
      clients: outcomes,
    };
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${REPORT_PATH}`);
  }
}

await main();
