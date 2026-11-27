import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROOT,
  checkParserBinding,
  checkStdioServer,
  createIsolatedNpmEnv,
  exists,
  npmConfigValue,
  packTarball,
  runNpm,
} from './lib/installVerification.mjs';

const TEMP_ROOT = await mkdtemp(join(tmpdir(), 'strudel-lsp-consumer-'));

async function verifyConsumerMode(mode, tarball, env, expectedVersion) {
  const scriptsEnabled = mode === 'scripts';
  const scriptFlags = scriptsEnabled ? [] : ['--ignore-scripts'];
  const installDir = join(TEMP_ROOT, mode);
  await mkdir(installDir, { recursive: true });
  await writeFile(
    join(installDir, 'package.json'),
    `${JSON.stringify({ name: 'clean-consumer', version: '1.0.0', private: true }, null, 2)}\n`,
    'utf8',
  );

  runNpm(
    [
      'install',
      '--omit=dev',
      '--no-audit',
      '--no-fund',
      '--legacy-peer-deps=false',
      ...scriptFlags,
      tarball,
    ],
    installDir,
    env,
  );

  assert.equal(await exists(join(installDir, '.npmrc')), false, 'consumer inherited an .npmrc');
  assert.equal(npmConfigValue('legacy-peer-deps', installDir, env), 'false');

  const installedRoot = join(installDir, 'node_modules', 'strudel-lsp-server');
  const installedManifest = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedManifest.name, 'strudel-lsp-server');
  assert.equal(installedManifest.version, expectedVersion);
  assert.equal(installedManifest.license, 'AGPL-3.0-only');
  assert.deepEqual(installedManifest.bin, { 'strudel-lsp-server': './dist/src/server.js' });
  assert.deepEqual(installedManifest.engines, {
    node: '^24.0.0 || ^26.0.0',
    npm: '>=11 <12',
  });

  const installedLicense = await readFile(join(installedRoot, 'LICENSE'), 'utf8');
  assert.match(installedLicense, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(installedLicense, /version 3 only/);

  await checkParserBinding(installDir, scriptsEnabled);

  const binName = process.platform === 'win32' ? 'strudel-lsp-server.cmd' : 'strudel-lsp-server';
  await checkStdioServer(join(installDir, 'node_modules', '.bin', binName));
  console.log(`Clean consumer ${mode} install passed on ${process.platform}-${process.arch}.`);
}

try {
  assert.equal(
    await exists(join(ROOT, '.npmrc')),
    false,
    'repository .npmrc must remain removed for clean consumer installs',
  );

  const env = await createIsolatedNpmEnv(TEMP_ROOT);
  const nodeMajor = process.versions.node.split('.')[0];
  const npmVersion = runNpm(['--version'], ROOT, env).trim();
  const registry = npmConfigValue('registry', TEMP_ROOT, env);
  const legacyPeerDeps = npmConfigValue('legacy-peer-deps', TEMP_ROOT, env);
  console.log(
    `Environment: ${process.platform}-${process.arch}, Node ${process.version}, npm ${npmVersion}, registry ${registry}, legacy-peer-deps ${legacyPeerDeps}`,
  );
  assert.ok(['24', '26'].includes(nodeMajor), `unsupported Node major: ${nodeMajor}`);
  assert.match(npmVersion, /^11\./, `unsupported npm major: ${npmVersion}`);
  assert.equal(legacyPeerDeps, 'false', 'isolated npm config still enables legacy peer deps');

  const rootManifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const packageInfo = packTarball(TEMP_ROOT, env);
  assert.ok(
    !packageInfo.files.some((file) => file.path === '.npmrc'),
    'packed tarball contains .npmrc',
  );
  for (const path of ['LICENSE', 'README.md', 'dist/src/server.js']) {
    assert.ok(
      packageInfo.files.some((file) => file.path === path),
      `packed tarball is missing ${path}`,
    );
  }

  const tarball = join(TEMP_ROOT, packageInfo.filename);
  await verifyConsumerMode('ignore-scripts', tarball, env, rootManifest.version);
  await verifyConsumerMode('scripts', tarball, env, rootManifest.version);

  console.log(`Verified ${packageInfo.filename}: ${packageInfo.entryCount} files.`);
  console.log('Clean consumer installs without inherited npm configuration passed.');
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
