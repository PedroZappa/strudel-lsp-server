import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(join(repositoryRoot, '.github', 'workflows', 'release.yml'), 'utf8');
const verifier = readFileSync(join(repositoryRoot, 'scripts', 'verify-release.mjs'), 'utf8');
const makefile = readFileSync(join(repositoryRoot, 'Makefile'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
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
