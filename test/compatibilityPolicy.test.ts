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
    symbols: number;
    references: number;
    unresolvedReferences: number;
    miniNotationArguments: number;
    miniNotationAstNodes: number;
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
const ciWorkflow = readProjectFile('.github', 'workflows', 'ci.yml');
const releaseWorkflow = readProjectFile('.github', 'workflows', 'release.yml');
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

void test('Phase 18 pins and Phase 20 record the current corpus baseline', () => {
  assert.equal(corpusReport.source.version, '1.2.2');
  assert.equal(corpusReport.layers.parser, '2.0.2');
  assert.match(corpusReport.layers.catalog, /^strudel-1\.2\.6:0243e023$/);
  assert.ok(Object.values(corpusReport.checks).every(Boolean));
  assert.equal(corpusReport.corpus.examples, 484);
  assert.equal(corpusReport.totals.cleanParses, 477);
  assert.equal(corpusReport.totals.parsesWithErrors, 7);
  assert.equal(corpusReport.totals.errorNodes, 7);
  assert.equal(corpusReport.totals.missingNodes, 2);
  assert.equal(corpusReport.totals.symbols, 726);
  assert.equal(corpusReport.totals.references, 2044);
  assert.equal(corpusReport.totals.unresolvedReferences, 1277);
  assert.equal(corpusReport.totals.miniNotationArguments, 364);
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

  const phase18Adr = adrSection(65).split('## ADR-066')[0] ?? '';
  assert.match(phase18Adr, /1,308 unresolved references are an accepted conservative baseline/);
  assert.match(parserIntegration, /Phase 18 and ADR-065 formally accept both gaps/);
  assert.match(readme, /two accepted upstream gaps/);
  assert.match(semanticEngine, /Phase 20 baseline of 1,277 unresolved references/);
  assert.match(validationReadme, /Phase 20 then reduced the unresolved baseline to 1,277/);
  assert.match(lspFeatures, /formally accepted for the pinned parser under ADR-065/);
});

void test('Phase 20 records conservative semantic depth and additive signatures', () => {
  const adr = adrSection(68);
  assert.match(adr, /^## ADR-068 — Conservative semantic depth and additive signatures$/m);
  assert.match(adr, /Unambiguous generated aliases/);
  assert.match(adr, /delayt/);
  assert.match(adr, /dt/);
  assert.match(adr, /ir/);
  assert.match(adr, /explicit catalog entry/);
  assert.match(adr, /Usage-based parameter inference/);
  assert.match(adr, /Additive signatures/);
  assert.match(adr, /Signature-help hardening/);
  assert.match(adr, /`n` and `gain` are control names/);
  assert.match(adr, /injected method receiver/);
  assert.match(adr, /913 method-style uses/);
  assert.match(adr, /No package version bump, tag, publication/);

  assert.match(semanticEngine, /unambiguous generated aliases/);
  assert.match(semanticEngine, /explicit sample catalog metadata/);
  assert.match(semanticEngine, /receiver of a known Pattern method/);
  assert.match(lspFeatures, /overload-capable curated signatures/);

  const start = roadmap.indexOf('### Phase 20 — Semantic depth and reference resolution');
  assert.notEqual(start, -1);
  const phase = roadmap.slice(start, roadmap.indexOf('### Phase 21 —', start));
  assert.match(
    phase,
    /^### Phase 20 — Semantic depth and reference resolution \(complete, unreleased\)$/m,
  );
  assert.doesNotMatch(phase, /^- \[ \]/m);
  assert.match(phase, /ADR-068/);
});

void test('Phase 21 records additive mini-notation AST coverage', () => {
  const adr = adrSection(69);
  assert.match(adr, /^## ADR-069 — Additive mini-notation recovery AST$/m);
  assert.match(adr, /Strudel-owned AST/);
  assert.match(adr, /Absolute ranges and reuse/);
  assert.match(adr, /Recovery without new diagnostics/);
  assert.match(adr, /Signature help is deliberately unchanged/);
  assert.match(adr, /not a claim of full 1\.2\.6 mini-notation compilation/);
  assert.match(adr, /No package version bump, tag, publication/);

  assert.match(languageSpecification, /additive recovery AST/);
  assert.match(semanticEngine, /recovery-oriented AST/);
  assert.match(lspFeatures, /Mini-notation policy/);
  assert.match(lspFeatures, /recovery-oriented syntax tree/);
  assert.equal(corpusReport.totals.miniNotationArguments, 364);
  assert.equal(corpusReport.totals.miniNotationAstNodes, 2034);

  const start = roadmap.indexOf('### Phase 21 — Mini-notation recovery and structured AST');
  assert.notEqual(start, -1);
  const phase = roadmap.slice(start, roadmap.indexOf('### Phase 22 —', start));
  assert.match(
    phase,
    /^### Phase 21 — Mini-notation recovery and structured AST \(complete, unreleased, `v0\.4\.0`\)$/m,
  );
  assert.doesNotMatch(phase, /^- \[ \]/m);
  assert.match(phase, /ADR-069/);
  assert.match(phase, /2,034 AST nodes/);
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

void test('Phase 26 keeps consumer verification outside the compatibility matrix', () => {
  assert.match(compatibilityWorkflow, /npm run verify:package/);
  assert.doesNotMatch(compatibilityWorkflow, /verify:consumer/);
  assert.match(
    ciWorkflow,
    /Verify clean consumer installation without inherited npm configuration/,
  );
  assert.match(ciWorkflow, /npm run verify:consumer/);
  assert.match(releaseWorkflow, /npm run verify:consumer/);

  const adr = adrSection(78);
  assert.match(adr, /^## ADR-078 — Compatibility matrix consumer verification scope$/m);
  assert.match(adr, /Keep `\.github\/workflows\/compatibility\.yml` unchanged/);
  assert.match(adr, /does not add `verify:consumer`/);
  assert.match(adr, /Keep `verify:consumer` as a required correctness and release gate/);
  assert.match(adr, /on every final release candidate/);
  assert.match(
    adr,
    /No workflow, provider, capability, diagnostic code, generated metadata, dependency, version, tag, publication or registry state/,
  );

  const start = roadmap.indexOf('### Phase 26 — v1 readiness freeze');
  assert.notEqual(start, -1);
  const phase = roadmap.slice(start, roadmap.indexOf('### Phase 27 —', start));
  assert.match(
    phase,
    /^- \[x\] Decide whether the compatibility matrix must run `verify:consumer` on every supported OS\/Node pair\./m,
  );
  assert.match(phase, /ADR-078/);
  assert.match(phase, /Compatibility-matrix decision evidence/);
});
