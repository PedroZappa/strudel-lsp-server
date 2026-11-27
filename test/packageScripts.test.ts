import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  license: string;
  repository: { type: string; url: string };
  homepage: string;
  bugs: { url: string };
  engines: { node: string; npm: string };
  files: string[];
  bin: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
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
    'test:configuration',
    'test:lsp',
    'test:features',
    'test:mini',
    'test:protocol',
    'test:soak',
  ];
  const suiteFiles = suiteNames
    .flatMap((name) => globSync(testPattern(name), { cwd: repositoryRoot }))
    .sort();
  const rootOnlyTests = [
    'dist/test/compatibilityPolicy.test.js',
    'dist/test/packageScripts.test.js',
    'dist/test/releaseWorkflow.test.js',
    'dist/test/server.test.js',
  ];
  const compiledTests = globSync(fullPattern, { cwd: repositoryRoot })
    .filter((path) => !rootOnlyTests.includes(path))
    .sort();

  assert.ok(compiledTests.length > 0, 'compiled test files must be present');
  assert.deepEqual(suiteFiles, compiledTests);
});

void test('verification scripts and clean npm configuration are preserved', () => {
  assert.match(packageJson.scripts['verify:package'], /verify-package\.mjs$/);
  assert.match(packageJson.scripts['verify:contents'], /--contents-only$/);
  assert.match(packageJson.scripts['verify:consumer'], /verify-consumer\.mjs$/);
  assert.match(packageJson.scripts['verify:release'], /verify-release\.mjs$/);
  assert.equal(
    existsSync(join(repositoryRoot, '.npmrc')),
    false,
    'repository npm configuration must not reintroduce legacy-peer-deps',
  );
});

void test('end-to-end benchmark is advisory and separate from the layer baseline', () => {
  assert.match(packageJson.scripts['benchmark:e2e'], /scripts\/benchmark-e2e\.mjs$/);
  assert.match(packageJson.scripts['benchmark:e2e:write'], /--write-report$/);

  const report = JSON.parse(
    readFileSync(join(repositoryRoot, 'benchmarks', 'end-to-end.json'), 'utf8'),
  ) as {
    schemaVersion: number;
    advisory: boolean;
    workload: {
      id: string;
      samples: number;
      batches: number;
      p50: number;
      p95: number;
      p99: number;
      thresholds?: unknown;
    };
  };
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.advisory, true);
  assert.equal(report.workload.id, 'jsonrpc-installed-document-symbol');
  assert.equal(report.workload.samples, 100);
  assert.equal(report.workload.batches, 5);
  for (const percentile of ['p50', 'p95', 'p99'] as const) {
    assert.ok(
      Number.isFinite(report.workload[percentile]) && report.workload[percentile] > 0,
      `${percentile} must be a positive measurement`,
    );
  }
  assert.equal(report.workload.thresholds, undefined);

  const baseline = JSON.parse(
    readFileSync(join(repositoryRoot, 'benchmarks', 'baseline.json'), 'utf8'),
  ) as { workloads: { id: string }[] };
  assert.ok(
    !baseline.workloads.some((workload) => workload.id === report.workload.id),
    'the installed-binary workload must not enter the layer-level baseline',
  );
});

void test('local timing is opt-in and performance thresholds remain advisory', () => {
  assert.match(packageJson.scripts['benchmark:timing'], /scripts\/benchmark\.mjs --timing$/);

  const workflow = readFileSync(join(repositoryRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  const performanceStart = workflow.indexOf('  performance:');
  const auditStart = workflow.indexOf('  audit:');
  assert.ok(performanceStart >= 0 && auditStart > performanceStart);
  const performanceJob = workflow.slice(performanceStart, auditStart);
  assert.match(performanceJob, /name: Advisory benchmark check/);
  assert.equal(performanceJob.match(/continue-on-error: true/g)?.length, 2);

  const baseline = JSON.parse(
    readFileSync(join(repositoryRoot, 'benchmarks', 'baseline.json'), 'utf8'),
  ) as {
    methodology: { realCorpusSampleSize?: number };
    workloads: { id: string }[];
  };
  assert.equal(baseline.methodology.realCorpusSampleSize, 24);
  for (const id of ['parse-analyze-real-corpus', 'incremental-edit-real-corpus']) {
    assert.ok(
      baseline.workloads.some((workload) => workload.id === id),
      `${id} must be part of the layer baseline`,
    );
  }
});

void test('editor-client smoke evidence is separate from the published package', () => {
  assert.match(packageJson.scripts['smoke:clients'], /scripts\/smoke-clients\.mjs$/);
  assert.match(packageJson.scripts['smoke:clients:write'], /--write-report$/);
  assert.match(packageJson.scripts['smoke:vscode'], /--client vscode$/);
  assert.match(packageJson.scripts['smoke:nvim'], /--client nvim$/);

  const dependencyGroups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies ?? {},
    packageJson.peerDependencies ?? {},
  ];
  for (const dependency of ['vscode', 'vscode-languageclient', '@vscode/test-electron']) {
    for (const group of dependencyGroups) {
      assert.equal(group[dependency], undefined);
    }
  }

  const report = JSON.parse(
    readFileSync(join(repositoryRoot, 'validation', 'client-smoke.json'), 'utf8'),
  ) as {
    schemaVersion: number;
    serverModule: string;
    transport: string;
    clients: {
      client: string;
      editorVersion: string;
      status: string;
      behaviours: string[];
    }[];
  };

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.serverModule, 'dist/src/server.js');
  assert.equal(report.transport, 'stdio');
  assert.deepEqual(report.clients.map((client) => client.client).sort(), ['nvim', 'vscode']);

  const requiredBehaviours = [
    'initialize/capabilities',
    'diagnostic',
    'completion',
    'document symbols',
    'didChange',
    'shutdown',
  ];
  for (const client of report.clients) {
    assert.equal(client.status, 'pass');
    assert.ok(client.editorVersion.length > 0);
    for (const behaviour of requiredBehaviours) {
      assert.ok(
        client.behaviours.some((observed) => observed.includes(behaviour)),
        `${client.client} did not exercise ${behaviour}`,
      );
    }
  }
});

void test('package metadata describes the published server', () => {
  assert.equal(packageJson.name, 'strudel-lsp-server');
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.license, 'AGPL-3.0-only');
  assert.equal(packageJson.repository.type, 'git');
  assert.equal(packageJson.repository.url, 'https://github.com/PedroZappa/strudel-lsp-server.git');
  assert.equal(packageJson.homepage, 'https://github.com/PedroZappa/strudel-lsp-server#readme');
  assert.equal(packageJson.bugs.url, 'https://github.com/PedroZappa/strudel-lsp-server/issues');
  assert.equal(packageJson.engines.node, '^24.0.0 || ^26.0.0');
  assert.equal(packageJson.engines.npm, '>=11 <12');
  assert.deepEqual(packageJson.files, ['dist/src', 'LICENSE']);
  assert.equal(packageJson.bin['strudel-lsp-server'], './dist/src/server.js');
});
