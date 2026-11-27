import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function testPattern(scriptName: string): string {
  const script = packageJson.scripts[scriptName];
  assert.ok(script, `${scriptName} script is missing`);

  const match = /node --test\s+("[^"]+")$/.exec(script);
  assert.ok(match, `${scriptName} must pass a quoted glob pattern to node --test`);

  return match[1].slice(1, -1);
}

void test('test scripts use glob patterns supported by Node 24 and 26', () => {
  const fullPattern = testPattern('test');
  assert.equal(fullPattern, 'dist/test/**/*.test.js');

  const suiteNames = [
    'test:parser',
    'test:semantic',
    'test:metadata',
    'test:features',
    'test:mini',
  ];
  const suiteFiles = suiteNames
    .flatMap((name) => globSync(testPattern(name), { cwd: repositoryRoot }))
    .sort();
  const rootOnlyTests = ['dist/test/packageScripts.test.js', 'dist/test/server.test.js'];
  const compiledTests = globSync(fullPattern, { cwd: repositoryRoot })
    .filter((path) => !rootOnlyTests.includes(path))
    .sort();

  assert.ok(compiledTests.length > 0, 'compiled test files must be present');
  assert.deepEqual(suiteFiles, compiledTests);
});
