import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(join(repositoryRoot, '.github', 'workflows', 'release.yml'), 'utf8');
const verifier = readFileSync(join(repositoryRoot, 'scripts', 'verify-release.mjs'), 'utf8');
const makefile = readFileSync(join(repositoryRoot, 'Makefile'), 'utf8');
const changelog = readFileSync(join(repositoryRoot, 'CHANGELOG.md'), 'utf8');
const decisions = readFileSync(join(repositoryRoot, 'docs', 'DECISIONS.md'), 'utf8');
const testingStrategy = readFileSync(join(repositoryRoot, 'docs', 'TESTING_STRATEGY.md'), 'utf8');
const releaseTemplate = readFileSync(
  join(repositoryRoot, '.github', 'RELEASE_TEMPLATE.md'),
  'utf8',
);
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  scripts: Record<string, string>;
};

void test('release workflow publishes only from a tagged commit after approval', () => {
  assert.match(workflow, /^[ ]{2}push:\n[ ]{4}tags:\n[ ]{6}- 'v\*'$/m);
  assert.doesNotMatch(workflow, /^[ ]{4}branches:/m);
  assert.match(workflow, /environment:\n[ ]{6}name: npm-release/);
  assert.match(workflow, /^[ ]{6}id-token: write$/m);
  assert.match(
    workflow,
    /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/tags\/v'\)/,
  );
  assert.match(workflow, /github\.ref_name != 'v0\.1\.0'/);
  assert.equal(workflow.match(/npm publish --access public/g)?.length, 1);
  assert.doesNotMatch(workflow, /--provenance/);
  assert.match(workflow, /npm audit signatures --prefix/);
});

void test('release workflow uses pinned actions and no npm token', () => {
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/);

  const actions = [...workflow.matchAll(/uses:\s+(\S+)/g)].map((match) => match[1]);
  assert.ok(
    actions.length >= 4,
    'expected both jobs to use pinned checkout and setup-node actions',
  );
  for (const action of actions) {
    assert.match(action, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
  }
});

void test('release verifier is wired into npm and make, and checks dry-run parity', () => {
  assert.equal(
    packageJson.scripts['verify:release'],
    'npm run build && node scripts/verify-release.mjs',
  );
  assert.match(makefile, /^verify-release:\t##/m);
  assert.match(verifier, /refs\/tags\//);
  assert.match(verifier, /status.*--porcelain/);
  assert.match(verifier, /npm.*pack.*--dry-run/);
  assert.match(verifier, /npm.*publish.*--dry-run/);
  assert.match(verifier, /RELEASE_OPERATOR/);
});

void test('changelog and GitHub release notes are versioned for the package release', () => {
  const version = packageJson.version.replaceAll('.', '\\.');
  assert.match(changelog, new RegExp(`^## \\[${version}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm'));
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.match(changelog, /^### Known issues$/m);
  assert.ok(releaseTemplate.includes(`${packageJson.name}@${packageJson.version}`));
  assert.match(releaseTemplate, /@strudel\/reference@1\.2\.2/);
  assert.match(releaseTemplate, /Node\.js 24 or 26 with npm 11/);
  assert.match(releaseTemplate, /^## Explicit limitations and known issues$/m);
  assert.match(releaseTemplate, /^## Installed-package verification$/m);
  assert.match(releaseTemplate, /^## Corrections and rollback$/m);
});

void test('post-publication smoke plan covers registry, installed launch and release record', () => {
  assert.match(decisions, /^## ADR-046 — Post-publication smoke plan$/m);
  assert.match(testingStrategy, /^### Post-publication smoke plan/m);

  for (const heading of [
    'Git and GitHub release record',
    'Public registry metadata and licence',
    'Clean-machine install',
    'Installed stdio handshake',
    'Evidence and failure handling',
  ]) {
    assert.ok(testingStrategy.includes(heading), `smoke plan omits: ${heading}`);
  }
});

void test('Phase 13 authorization records the exact version and operator', () => {
  const marker = '## ADR-047 — Phase 13 release authorization';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /publish exactly `strudel-lsp-server@0\.1\.0`/);
  assert.match(section, /`pedrozappa` as the named release operator/);
});

void test('first-publish bootstrap exception is version-limited and blocks workflow publishing', () => {
  const marker = '## ADR-049 — First-publish bootstrap exception';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /exactly `strudel-lsp-server@0\.1\.0`/);
  assert.match(section, /operator-managed publish/);
  assert.match(section, /no workflow publish for `v0\.1\.0`/);
  assert.match(section, /provenance attestation for `0\.1\.0` is not assumed/);
  assert.match(workflow, /github\.ref_name != 'v0\.1\.0'/);
  assert.equal(workflow.match(/npm publish --access public/g)?.length, 1);
});
