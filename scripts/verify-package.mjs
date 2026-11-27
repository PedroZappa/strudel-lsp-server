import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROOT,
  checkParserBinding,
  checkStdioServer,
  createIsolatedNpmEnv,
  packTarball,
  runNpm,
} from './lib/installVerification.mjs';

const TEMP_ROOT = await mkdtemp(join(tmpdir(), 'strudel-lsp-package-'));
const CONTENTS_ONLY = process.argv.includes('--contents-only');

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

function assertPackageContents(packageInfo) {
  const requiredFiles = ['LICENSE', 'README.md', 'package.json', 'dist/src/server.js'];
  const allowedPrefixes = ['LICENSE', 'README.md', 'package.json', 'dist/src/'];
  const forbiddenFiles = ['.npmrc', 'binding.gyp', 'grammar.js'];
  const forbiddenPrefixes = [
    'benchmarks/',
    'client/',
    'dist/test/',
    'node_modules/',
    'scripts/',
    'server/',
    'src/',
    'test/',
  ];

  for (const path of requiredFiles) {
    assert.ok(
      packageInfo.files.some((file) => file.path === path),
      `packed tarball is missing ${path}`,
    );
  }
  for (const file of packageInfo.files) {
    assert.ok(!forbiddenFiles.includes(file.path), `packed tarball contains ${file.path}`);
    assert.ok(
      !forbiddenPrefixes.some((prefix) => file.path.startsWith(prefix)),
      `packed tarball contains ${file.path}`,
    );
    assert.ok(
      allowedPrefixes.some((prefix) => file.path === prefix || file.path.startsWith(prefix)),
      `packed tarball contains unexpected path ${file.path}`,
    );
  }
}

function printPackageContents(packageInfo) {
  console.log(`Package contents: ${packageInfo.name}@${packageInfo.version}`);
  for (const file of packageInfo.files) {
    console.log(`${file.path} (${file.size} bytes)`);
  }
  console.log(`${packageInfo.entryCount} files, ${packageInfo.size} bytes tarball`);
}

try {
  const nodeMajor = process.versions.node.split('.')[0];
  const npmVersion = runNpm(['--version'], ROOT).trim();
  console.log(
    `Environment: ${process.platform}-${process.arch}, Node ${process.version}, npm ${npmVersion}`,
  );
  assert.ok(['24', '26'].includes(nodeMajor), `unsupported Node major: ${nodeMajor}`);
  assert.match(npmVersion, /^11\./, `unsupported npm major: ${npmVersion}`);

  // npm pack writes cache entries even for a dry run. Isolating only that cache
  // keeps local cache corruption from blocking verification while the offline
  // installs below still use the cache populated by the surrounding CI job.
  const packEnv = await createIsolatedNpmEnv(join(TEMP_ROOT, 'pack-cache'));
  const packageInfo = packTarball(TEMP_ROOT, packEnv);
  assertPackageContents(packageInfo);

  if (CONTENTS_ONLY) {
    printPackageContents(packageInfo);
    console.log('Package contents preview passed.');
  } else {
    const tarball = join(TEMP_ROOT, packageInfo.filename);
    await verifyInstallMode('ignore-scripts', tarball);
    await verifyInstallMode('scripts', tarball);

    console.log(`Verified ${packageInfo.filename}: ${packageInfo.entryCount} files.`);
    console.log('Clean offline installs, native parser prebuild load and stdio handshakes passed.');
  }
} finally {
  await rm(TEMP_ROOT, { recursive: true, force: true });
}
