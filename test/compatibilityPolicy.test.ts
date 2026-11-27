import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readProjectFile(...segments: string[]): string {
  return readFileSync(join(repositoryRoot, ...segments), 'utf8');
}

interface PackageManifest {
  engines: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

interface CorpusReport {
  source: { version: string };
  layers: { parser: string; catalog: string };
  checks: Record<string, boolean>;
  corpus: { examples: number };
  totals: {
    cleanParses: number;
    parsesWithErrors: number;
    errorNodes: number;
    missingNodes: number;
    unresolvedReferences: number;
  };
  parserGaps: { name: string }[];
}

const packageJson = JSON.parse(readProjectFile('package.json')) as PackageManifest;
const decisions = readProjectFile('docs', 'DECISIONS.md');
const roadmap = readProjectFile('docs', 'ROADMAP.md');
const readme = readProjectFile('README.md');
const languageSpecification = readProjectFile('docs', 'LANGUAGE_SPECIFICATION.md');
const parserIntegration = readProjectFile('docs', 'PARSER_INTEGRATION.md');
const semanticEngine = readProjectFile('docs', 'SEMANTIC_ENGINE.md');
const lspFeatures = readProjectFile('docs', 'LSP_FEATURES.md');
const validationReadme = readProjectFile('validation', 'README.md');
const compatibilityWorkflow = readProjectFile('.github', 'workflows', 'compatibility.yml');
const corpusReport = JSON.parse(readProjectFile('validation', 'real-corpus.json')) as CorpusReport;

function adrSection(number: number): string {
  const heading = `## ADR-${number.toString().padStart(3, '0')} —`;
  const start = decisions.indexOf(heading);
  assert.notEqual(start, -1, `${heading} is missing`);
  return decisions.slice(start);
}

void test('Phase 18 records the accepted pins and dependency-update policy', () => {
  assert.deepEqual(packageJson.dependencies, {
    'tree-sitter': '0.25.1',
    'tree-sitter-strudel': '2.0.2',
    'vscode-languageserver': '11.0.1',
    'vscode-languageserver-textdocument': '1.0.16',
  });
  assert.equal(packageJson.devDependencies['@strudel/core'], '1.2.6');
  assert.equal(packageJson.devDependencies['@strudel/mini'], '1.2.6');
  assert.equal(packageJson.devDependencies['@strudel/transpiler'], '1.2.6');
  assert.equal(packageJson.devDependencies['@strudel/reference'], '1.2.2');
  assert.equal(
    packageJson.scripts['validate:corpus'],
    'npm run build && node scripts/validate-corpus.mjs',
  );

  const adr = adrSection(65);
  assert.match(adr, /^## ADR-065 — Parser, metadata and platform compatibility closure$/m);
  assert.match(adr, /Supported Strudel snapshot:.*Strudel `1\.2\.6`/);
  assert.match(adr, /`@strudel\/reference@1\.2\.2` is the pinned generated JSDoc source/);
  assert.match(adr, /not vendored, patched or replaced with a local workaround/);
  assert.match(adr, /Dependency-update policy/);
  assert.match(adr, /PATCH for non-semantic provenance corrections/);
  assert.match(adr, /MINOR for compatible metadata or syntax additions/);
  assert.match(adr, /MAJOR for changed language interpretation or removal/);
  assert.match(adr, /metadata is regenerated deliberately/);
  assert.match(adr, /Corpus validation must be rerun/);
  assert.match(adr, /Compatibility validation must be rerun/);

  assert.match(languageSpecification, /Supported Strudel snapshot: `1\.2\.6`/);
  assert.match(readme, /Supported Strudel snapshot: `1\.2\.6`/);
  assert.match(readme, /Strudel version selection is not exposed/);
});

void test('Phase 18 accepts the pinned parser gaps against refreshed corpus evidence', () => {
  assert.equal(corpusReport.source.version, '1.2.2');
  assert.equal(corpusReport.layers.parser, '2.0.2');
  assert.match(corpusReport.layers.catalog, /^strudel-1\.2\.6:/);
  assert.ok(Object.values(corpusReport.checks).every(Boolean));
  assert.equal(corpusReport.corpus.examples, 484);
  assert.equal(corpusReport.totals.cleanParses, 477);
  assert.equal(corpusReport.totals.parsesWithErrors, 7);
  assert.equal(corpusReport.totals.errorNodes, 7);
  assert.equal(corpusReport.totals.missingNodes, 2);
  assert.equal(corpusReport.totals.unresolvedReferences, 1308);
  assert.equal(corpusReport.parserGaps.length, 7);
  assert.deepEqual(corpusReport.parserGaps.map((gap) => gap.name).sort(), [
    'chop',
    'filterHaps',
    'fit',
    'loopAt',
    'loopAtCps',
    'register',
    'samples',
  ]);

  assert.match(parserIntegration, /Phase 18 and ADR-065 formally accept both gaps/);
  assert.match(readme, /two accepted upstream gaps/);
  assert.match(semanticEngine, /accepted Phase 18 baseline of 1,308 unresolved references/);
  assert.match(validationReadme, /Phase 18 regenerated the report from the final pins/);
  assert.match(lspFeatures, /formally accepted for the pinned parser under ADR-065/);
});

void test('Phase 18 support matrix matches compatibility CI', () => {
  assert.deepEqual(packageJson.engines, {
    node: '^24.0.0 || ^26.0.0',
    npm: '>=11 <12',
  });
  assert.match(compatibilityWorkflow, /os: \['ubuntu-latest', 'macos-15', 'windows-latest'\]/);
  assert.match(compatibilityWorkflow, /node-version: \['24', '26'\]/);
  assert.match(compatibilityWorkflow, /npm run verify:package/);

  const adr = adrSection(65);
  assert.match(
    adr,
    /Linux x64 with glibc, macOS arm64 and Windows x64, each on Node\.js 24 and 26/,
  );
  assert.match(adr, /remain best-effort until separately validated and accepted by a later ADR/);

  const start = roadmap.indexOf(
    '### Phase 18 — Parser, metadata and platform compatibility closure',
  );
  assert.notEqual(start, -1);
  const phase = roadmap.slice(start, roadmap.indexOf('### Phase 19 —', start));
  assert.match(
    phase,
    /^### Phase 18 — Parser, metadata and platform compatibility closure \(complete, `v0\.3\.0`\)$/m,
  );
  assert.doesNotMatch(phase, /^- \[ \]/m);
  assert.match(phase, /ADR-065/);
});
