import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(repositoryRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const { name: packageName, version: manifestVersion } = packageJson;

const requiredFiles = ['LICENSE', 'README.md', 'package.json', 'dist/src/server.js'];
const allowedPrefixes = ['LICENSE', 'README.md', 'package.json', 'dist/src/'];
const forbiddenFiles = ['.npmrc', 'binding.gyp', 'grammar.js'];
const forbiddenPrefixes = ['client/', 'dist/test/', 'node_modules/', 'scripts/', 'src/', 'test/'];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not produce JSON: ${error.message}`);
  }
}

function compareVersions(left, right) {
  const parse = (value) => value.split('.').map((part) => Number(part));
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function normalizeDryRun(raw, label) {
  const parsed = parseJson(raw, label);
  const record = Array.isArray(parsed) ? parsed[0] : parsed[packageName];
  if (!record || typeof record !== 'object' || !Array.isArray(record.files)) {
    throw new Error(`${label} did not produce a package record with a file list`);
  }

  return {
    name: record.name,
    version: record.version,
    filename: record.filename,
    files: record.files
      .map((file) => ({ path: file.path, size: file.size }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    size: record.size,
    shasum: record.shasum,
    integrity: record.integrity,
  };
}

function assertManifest(expectedVersion) {
  if (packageName !== 'strudel-lsp-server') {
    throw new Error(`unexpected package name: ${packageName}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
    throw new Error(`release version must be X.Y.Z: ${expectedVersion}`);
  }
  if (manifestVersion !== expectedVersion) {
    throw new Error(`manifest version ${manifestVersion} does not match ${expectedVersion}`);
  }
  if (packageJson.license !== 'AGPL-3.0-only') {
    throw new Error(`unexpected licence: ${packageJson.license}`);
  }
  if (packageJson.repository?.url !== 'https://github.com/PedroZappa/strudel-lsp-server.git') {
    throw new Error('repository URL does not match the public source');
  }
  if (packageJson.homepage !== 'https://github.com/PedroZappa/strudel-lsp-server#readme') {
    throw new Error('homepage does not match the public source');
  }
  if (packageJson.bugs?.url !== 'https://github.com/PedroZappa/strudel-lsp-server/issues') {
    throw new Error('issues URL does not match the public source');
  }
  if (JSON.stringify(packageJson.files) !== JSON.stringify(['dist/src', 'LICENSE'])) {
    throw new Error('published file allowlist changed');
  }

  const binTarget = packageJson.bin?.[packageName]?.replace(/^\.\//, '');
  if (binTarget !== 'dist/src/server.js') {
    throw new Error(`unexpected executable entry point: ${binTarget}`);
  }
  const entryPoint = join(repositoryRoot, binTarget);
  if (
    !existsSync(entryPoint) ||
    !readFileSync(entryPoint, 'utf8').startsWith('#!/usr/bin/env node')
  ) {
    throw new Error('built executable is missing or has no node shebang');
  }
}

function assertGitState(tag, expectedVersion) {
  const head = run('git', ['rev-parse', 'HEAD^{commit}']);
  if (!tag) return { tag: '(not supplied)', head };

  if (tag !== `v${expectedVersion}`) {
    throw new Error(`tag ${tag} does not match version ${expectedVersion}`);
  }
  const taggedCommit = run('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`]);
  if (taggedCommit !== head) {
    throw new Error(`tag ${tag} points to ${taggedCommit}, not HEAD ${head}`);
  }
  const changes = run('git', ['status', '--porcelain', '--untracked-files=no']);
  if (changes) {
    throw new Error(`release commit has tracked modifications:\n${changes}`);
  }
  return { tag, head };
}

function assertFileList(files) {
  for (const required of requiredFiles) {
    if (!files.some((file) => file.path === required)) {
      throw new Error(`tarball is missing ${required}`);
    }
  }
  for (const file of files) {
    if (
      forbiddenFiles.includes(file.path) ||
      forbiddenPrefixes.some((prefix) => file.path.startsWith(prefix))
    ) {
      throw new Error(`tarball contains excluded path: ${file.path}`);
    }
    if (!allowedPrefixes.some((prefix) => file.path === prefix || file.path.startsWith(prefix))) {
      throw new Error(`tarball contains unexpected path: ${file.path}`);
    }
  }
}

function main() {
  const tag = process.env.RELEASE_TAG || '';
  const operator = process.env.RELEASE_OPERATOR || '';
  const expectedVersion =
    process.env.RELEASE_VERSION || (tag ? tag.replace(/^v/, '') : manifestVersion);
  if (!expectedVersion) throw new Error('set RELEASE_VERSION or RELEASE_TAG');
  if (!tag && !operator) throw new Error('manual validation requires RELEASE_OPERATOR');

  const npmVersion = run('npm', ['--version']);
  if (compareVersions(npmVersion, '11.5.1') < 0) {
    throw new Error(`npm ${npmVersion} is too old for trusted publishing; require >= 11.5.1`);
  }

  assertManifest(expectedVersion);
  const gitState = assertGitState(tag, expectedVersion);

  // npm publish normalises package.json in place. Run both dry-runs against an
  // isolated copy so verification cannot alter the release commit.
  const stagingDirectory = mkdtempSync(join(tmpdir(), 'strudel-release-'));
  let pack;
  let publish;
  try {
    for (const file of ['package.json', 'LICENSE', 'README.md']) {
      cpSync(join(repositoryRoot, file), join(stagingDirectory, file));
    }
    cpSync(join(repositoryRoot, 'dist', 'src'), join(stagingDirectory, 'dist', 'src'), {
      recursive: true,
    });

    pack = normalizeDryRun(
      run('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
        cwd: stagingDirectory,
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
      'npm pack --dry-run',
    );
    publish = normalizeDryRun(
      run('npm', ['publish', '--dry-run', '--ignore-scripts', '--json'], {
        cwd: stagingDirectory,
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
      'npm publish --dry-run',
    );
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }

  for (const field of ['name', 'version', 'filename', 'size', 'shasum', 'integrity']) {
    if (pack[field] !== publish[field]) {
      throw new Error(
        `pack and publish dry-runs disagree on ${field}: ${pack[field]} vs ${publish[field]}`,
      );
    }
  }
  if (JSON.stringify(pack.files) !== JSON.stringify(publish.files)) {
    throw new Error('pack and publish dry-runs disagree on the file list');
  }
  assertFileList(pack.files);

  const packedSizes = new Map(pack.files.map((file) => [file.path, file.size]));
  for (const path of ['LICENSE', 'README.md', 'dist/src/server.js']) {
    const localSize = statSync(join(repositoryRoot, path)).size;
    if (packedSizes.get(path) !== localSize) {
      throw new Error(
        `packed ${path} size ${packedSizes.get(path)} differs from local ${localSize}`,
      );
    }
  }
  const licenceText = readFileSync(join(repositoryRoot, 'LICENSE'), 'utf8');
  if (
    !licenceText.includes('Copyright (c) 2025-present Zedro') ||
    !licenceText.includes('GNU AFFERO GENERAL PUBLIC LICENSE')
  ) {
    throw new Error('LICENSE does not carry the expected AGPL notice');
  }

  console.log(`Release version: ${expectedVersion}`);
  console.log(`Release tag: ${gitState.tag}`);
  console.log(`Release commit: ${gitState.head}`);
  console.log(`npm CLI: ${npmVersion}`);
  console.log(`Manifest: name, version, licence, source URLs, bin and file allowlist verified`);
  console.log('Licence: AGPL-3.0-only notice and full AGPL text present in LICENSE');
  console.log(
    `Executable: dist/src/server.js with node shebang (${packedSizes.get('dist/src/server.js')} bytes)`,
  );
  console.log(`Dry-run files: ${pack.files.length}; pack and publish agree (${pack.shasum})`);
  console.log('RELEASE VERIFICATION PASSED: no package was published');
}

try {
  main();
} catch (error) {
  console.error(`RELEASE VERIFICATION FAILED: ${error.message}`);
  process.exitCode = 1;
}
