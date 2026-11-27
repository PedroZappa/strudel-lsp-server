import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { reference } from '@strudel/reference';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  BATCH_COUNT,
  PERCENTILES,
  SAMPLE_COUNT,
  SAMPLES_PER_BATCH,
  WARMUP_ITERATIONS,
  round,
  summarizeBatches,
} from './lib/benchmarkStats.mjs';
import {
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideDocumentSymbols,
  provideFormatting,
  provideHover,
  prepareRename,
  provideQuickFixes,
  provideRefactorings,
  provideRename,
  provideSemanticTokens,
  provideSignatureHelp,
  provideWorkspaceSymbols,
} from '../dist/src/features/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../dist/src/languageDatabase/index.js';
import { DocumentAnalysisService, readWorkspaceFiles } from '../dist/src/lsp/index.js';
import { createInMemoryLocalTiming } from '../dist/src/performance/index.js';
import { createSemanticEngine } from '../dist/src/semantic/index.js';
import { createSyntaxAdapter } from '../dist/src/syntax/index.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(ROOT, 'benchmarks', 'fixtures');
const BASELINE_PATH = join(ROOT, 'benchmarks', 'baseline.json');
const REGRESSION_FACTORS = { p50: 2, p95: 2.5, p99: 3 };
const MINIMUM_THRESHOLD_MS = 0.05;
const CORPUS_REPORT_PATH = join(ROOT, 'validation', 'real-corpus.json');
const REAL_SAMPLE_SIZE = 24;
const EXPECTED_CORPUS_SOURCE = {
  kind: 'pinned-jsdoc-examples',
  package: '@strudel/reference',
  version: '1.2.2',
  tarball: 'https://registry.npmjs.org/@strudel/reference/-/reference-1.2.2.tgz',
  integrity:
    'sha512-1zJwv4U2NVWhw/T2fDL6XJjSKi8ltetw9qX79Lum51g7x0CX1naf6imbkdBzS7QKYyKnUYyHCtxsgFIKyGyiDg==',
  license: 'AGPL-3.0-or-later',
  repository: 'git+https://codeberg.org/uzu/strudel.git',
};

function parseArguments(argv) {
  const options = { writeBaseline: false, check: false, timing: false };
  for (const argument of argv) {
    if (argument === '--write-baseline') {
      options.writeBaseline = true;
    } else if (argument === '--check') {
      options.check = true;
    } else if (argument === '--timing') {
      options.timing = true;
    } else {
      throw new Error(`Unknown benchmark option: ${argument}`);
    }
  }
  if (options.writeBaseline && options.check) {
    throw new Error('Use either --write-baseline or --check, not both');
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));
const localTiming = options.timing ? createInMemoryLocalTiming() : undefined;

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function collectCorpusExamples() {
  const examples = [];
  for (const doc of reference.docs ?? []) {
    const name = typeof doc.name === 'string' ? doc.name : '';
    const longName = typeof doc.longname === 'string' ? doc.longname : name;
    const values = Array.isArray(doc.examples) ? doc.examples : [];
    for (const [index, value] of values.entries()) {
      if (typeof value !== 'string' || value.trim() === '') {
        continue;
      }
      const id = sha256(value);
      examples.push({ id, name, longName, index, text: value });
    }
  }
  const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
  examples.sort(
    (left, right) =>
      compare(left.id, right.id) ||
      compare(left.longName, right.longName) ||
      left.index - right.index,
  );
  return examples;
}

async function loadRealCorpusSample() {
  const report = JSON.parse(await readFile(CORPUS_REPORT_PATH, 'utf8'));
  assert.deepEqual(
    report.source,
    EXPECTED_CORPUS_SOURCE,
    'Real benchmark corpus provenance drifted',
  );
  const examples = collectCorpusExamples();
  assert.equal(
    sha256(examples.map((example) => example.id).join('\n')),
    report.corpus.corpusHash,
    'Real benchmark corpus does not match validated evidence',
  );

  const parserGapIds = new Set(report.parserGaps.map((gap) => gap.id));
  const cleanExamples = examples.filter((example) => !parserGapIds.has(example.id));
  assert.ok(cleanExamples.length >= REAL_SAMPLE_SIZE, 'Not enough clean corpus examples');
  const stride = Math.floor(cleanExamples.length / REAL_SAMPLE_SIZE);
  const sample = [];
  for (
    let index = 0;
    index < cleanExamples.length && sample.length < REAL_SAMPLE_SIZE;
    index += stride
  ) {
    sample.push(cleanExamples[index]);
  }
  assert.equal(sample.length, REAL_SAMPLE_SIZE);
  return sample;
}

function buildThresholds(summary) {
  return Object.fromEntries(
    PERCENTILES.map(({ name }) => [
      name,
      round(Math.max(summary[name] * REGRESSION_FACTORS[name], MINIMUM_THRESHOLD_MS)),
    ]),
  );
}

function consume(value) {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }
  return 0;
}

function offsetAfter(text, needle, suffix = '') {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Benchmark fixture is missing required text: ${needle}`);
  }
  return index + suffix.length;
}

function requireOffset(text, needle) {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Benchmark fixture is missing required text: ${needle}`);
  }
  return index;
}

function createIncrementalState(text, uri, target, timing) {
  const targetOffset = requireOffset(text, target);
  const digitOffset = targetOffset + target.indexOf('2');
  const document = TextDocument.create(uri, 'strudel', 1, text);
  const service = new DocumentAnalysisService(adapter, engine, timing);
  service.open({ textDocument: { uri, languageId: 'strudel', version: 1, text } });
  return {
    service,
    uri,
    range: {
      start: document.positionAt(digitOffset),
      end: document.positionAt(digitOffset + 1),
    },
  };
}

async function readFixtures() {
  const names = [
    'small-live-edit.strudel',
    'medium-composition.strudel',
    'large-pattern-set.strudel',
    'incomplete-live.strudel',
  ];
  const entries = await Promise.all(
    names.map(async (name) => [name, await readFile(join(FIXTURES, name), 'utf8')]),
  );
  return Object.fromEntries(entries);
}

const database = createDefaultLanguageDatabase();
const catalog = createCatalogFromLanguageDatabase(database);
const engine = createSemanticEngine(catalog);
const adapter = createSyntaxAdapter();
const fixtures = await readFixtures();
const smallText = fixtures['small-live-edit.strudel'];
const mediumText = fixtures['medium-composition.strudel'];
const largeText = fixtures['large-pattern-set.strudel'];
const incompleteText = fixtures['incomplete-live.strudel'];
const unformattedMediumText = mediumText
  .split('\n')
  .map((line) => (line.length > 0 ? `  ${line}` : line))
  .join('\n');
const workspaceRootUri = pathToFileURL(join(FIXTURES, 'workspace')).href;
const realExamples = await loadRealCorpusSample();

function realExampleUri(example) {
  return `file:///benchmark/real/${example.id}.strudel`;
}

function contextFor(text, offset, uri = 'file:///benchmark/document.strudel') {
  const syntax = adapter.parse({ uri, version: 1, text });
  const semantic = engine.analyze(syntax, { timing: localTiming?.recorder });
  return {
    uri,
    text,
    syntax,
    semantic,
    database,
    ...(offset === undefined ? {} : { node: adapter.nodeAt(syntax, offset) }),
  };
}

const smallContext = contextFor(smallText);
const largeContext = contextFor(largeText);
const incompleteContext = contextFor(incompleteText);
const completionContext = contextFor(mediumText, offsetAfter(mediumText, 'line.gain', 'line.'));
const hoverContext = contextFor(largeText, offsetAfter(largeText, 'const v43', 'const '));
const signatureContext = contextFor(mediumText, offsetAfter(mediumText, '.gain(0.9)', '.gain('));
const renameContext = contextFor(largeText, offsetAfter(largeText, 'const v43', 'const '));
const definitionContext = contextFor(
  largeText,
  offsetAfter(largeText, 'const v30 = v29', 'const v30 = '),
);
const refactorContext = contextFor(smallText);
const formattingContext = contextFor(unformattedMediumText);
localTiming?.reset();

const workloads = [
  {
    id: 'parse-small',
    description: 'Full syntax parse of a small live-coding buffer',
    fixture: 'small-live-edit.strudel',
    run: () =>
      adapter.parse({ uri: 'file:///benchmark/parse.strudel', version: 1, text: smallText }),
  },
  {
    id: 'parse-analyze-medium',
    description: 'Full syntax parse and semantic analysis of a medium composition',
    fixture: 'medium-composition.strudel',
    run: () => {
      const syntax = adapter.parse({
        uri: 'file:///benchmark/parse.strudel',
        version: 1,
        text: mediumText,
      });
      return engine.analyze(syntax, { timing: localTiming?.recorder });
    },
  },
  {
    id: 'parse-analyze-large',
    description: 'Full syntax parse and semantic analysis of a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () => {
      const syntax = adapter.parse({
        uri: 'file:///benchmark/parse.strudel',
        version: 1,
        text: largeText,
      });
      return engine.analyze(syntax, { timing: localTiming?.recorder });
    },
  },
  {
    id: 'incremental-edit-small',
    description: 'Incremental syntax and semantic update after a small buffer edit',
    fixture: 'small-live-edit.strudel',
    prepare: () =>
      createIncrementalState(
        smallText,
        'file:///benchmark/edit.strudel',
        'fast(2)',
        localTiming?.recorder,
      ),
    run: (state) =>
      state.service.change({
        textDocument: { uri: state.uri, version: 2 },
        contentChanges: [{ range: state.range, text: '3' }],
      }),
  },
  {
    id: 'incremental-edit-large',
    description: 'Incremental syntax and semantic update after a large buffer edit',
    fixture: 'large-pattern-set.strudel',
    prepare: () =>
      createIncrementalState(
        largeText,
        'file:///benchmark/edit.strudel',
        'fast(2)',
        localTiming?.recorder,
      ),
    run: (state) =>
      state.service.change({
        textDocument: { uri: state.uri, version: 2 },
        contentChanges: [{ range: state.range, text: '3' }],
      }),
  },
  {
    id: 'diagnostics-small',
    description: 'Diagnostics for a valid small buffer',
    fixture: 'small-live-edit.strudel',
    run: () => provideDiagnostics(smallContext),
  },
  {
    id: 'diagnostics-incomplete',
    description: 'Resilient diagnostics for partially typed live-coding input',
    fixture: 'incomplete-live.strudel',
    run: () => provideDiagnostics(incompleteContext),
  },
  {
    id: 'completion-medium',
    description: 'Pattern-method completion after a dot in a medium composition',
    fixture: 'medium-composition.strudel',
    run: () => provideCompletion(completionContext, offsetAfter(mediumText, 'line.gain', 'line.')),
  },
  {
    id: 'hover-large',
    description: 'Hover for a resolved declaration in a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () => provideHover(hoverContext, offsetAfter(largeText, 'const v43', 'const ')),
  },
  {
    id: 'definition-large',
    description: 'Definition lookup for a resolved reference in a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () =>
      provideDefinition(
        definitionContext,
        offsetAfter(largeText, 'const v30 = v29', 'const v30 = '),
      ),
  },
  {
    id: 'signature-help-medium',
    description: 'Signature help inside a pattern-method call',
    fixture: 'medium-composition.strudel',
    run: () =>
      provideSignatureHelp(signatureContext, offsetAfter(mediumText, '.gain(0.9)', '.gain(')),
  },
  {
    id: 'document-symbols-large',
    description: 'Document-symbol outline traversal of a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () => provideDocumentSymbols(largeContext),
  },
  {
    id: 'workspace-symbols-scan',
    description: 'Bounded workspace scan and workspace-symbol query over Strudel fixtures',
    fixture: 'workspace/',
    run: async () => {
      const files = await readWorkspaceFiles([workspaceRootUri]);
      const contexts = files.map((file) => contextFor(file.text, undefined, file.uri));
      return provideWorkspaceSymbols(contexts, '');
    },
  },
  {
    id: 'formatting-medium',
    description: 'Indentation-only formatting of an unformatted medium composition',
    fixture: 'medium-composition.strudel',
    run: () => provideFormatting(formattingContext, { tabSize: 2, insertSpaces: true }),
  },
  {
    id: 'semantic-tokens-large',
    description: 'Full-document semantic-token classification of a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () => provideSemanticTokens(largeContext),
  },
  {
    id: 'quick-fixes-small',
    description: 'Quick-fix derivation from diagnostics in a small buffer',
    fixture: 'small-live-edit.strudel',
    run: () => provideQuickFixes(smallContext, { startOffset: 0, endOffset: smallText.length }),
  },
  {
    id: 'refactor-inline-small',
    description: 'Inline-constant refactoring eligibility scan in a small buffer',
    fixture: 'small-live-edit.strudel',
    run: () =>
      provideRefactorings(refactorContext, { startOffset: 0, endOffset: smallText.length }),
  },
  {
    id: 'rename-large',
    description: 'Rename preparation and edit computation in a large pattern set',
    fixture: 'large-pattern-set.strudel',
    run: () => {
      const offset = offsetAfter(largeText, 'const v43', 'const ');
      return {
        prepare: prepareRename(renameContext, offset),
        edits: provideRename(renameContext, offset, 'voice43'),
      };
    },
  },
  {
    id: 'parse-analyze-real-corpus',
    description: 'Full parse and analysis of pinned real Strudel documentation examples',
    fixture: '@strudel/reference@1.2.2 sample (24 examples)',
    run: () => {
      let resultCount = 0;
      for (const example of realExamples) {
        const syntax = adapter.parse({
          uri: realExampleUri(example),
          version: 1,
          text: example.text,
        });
        resultCount += consume(engine.analyze(syntax, { timing: localTiming?.recorder }));
      }
      return resultCount;
    },
  },
  {
    id: 'incremental-edit-real-corpus',
    description: 'Incremental syntax and semantic update of pinned real documentation examples',
    fixture: '@strudel/reference@1.2.2 sample (24 examples)',
    prepare: () => {
      const service = new DocumentAnalysisService(adapter, engine, localTiming?.recorder);
      for (const example of realExamples) {
        service.open({
          textDocument: {
            uri: realExampleUri(example),
            languageId: 'strudel',
            version: 1,
            text: example.text,
          },
        });
      }
      return { service };
    },
    run: (state) => {
      let resultCount = 0;
      for (const example of realExamples) {
        const uri = realExampleUri(example);
        const document = state.service.get(uri)?.document;
        assert.ok(document !== undefined, `Missing prepared corpus document ${uri}`);
        const end = document.positionAt(document.getText().length);
        resultCount += consume(
          state.service.change({
            textDocument: { uri, version: 2 },
            contentChanges: [{ range: { start: end, end }, text: '\n' }],
          }),
        );
      }
      return resultCount;
    },
  },
];

async function measure(workload) {
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
    const state = await workload.prepare?.();
    consume(await workload.run(state, iteration));
  }

  const batches = [];
  for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
    const samples = [];
    for (let sample = 0; sample < SAMPLES_PER_BATCH; sample += 1) {
      const state = await workload.prepare?.();
      const start = performance.now();
      const result = await workload.run(
        state,
        WARMUP_ITERATIONS + batch * SAMPLES_PER_BATCH + sample,
      );
      samples.push(performance.now() - start);
      consume(result);
    }
    batches.push(samples);
  }
  return summarizeBatches(batches);
}

async function collectResults() {
  const results = [];
  for (const workload of workloads) {
    const stats = await measure(workload);
    results.push({
      id: workload.id,
      description: workload.description,
      fixture: workload.fixture,
      unit: 'ms',
      ...stats,
      thresholds: buildThresholds(stats),
    });
  }
  return results;
}

async function environmentInfo() {
  const processor = cpus()[0];
  const packageJson = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  return {
    node: process.version,
    platform: platform(),
    architecture: arch(),
    cpuModel: processor?.model ?? 'unknown',
    logicalCpus: cpus().length,
    totalMemoryGiB: round(totalmem() / 1024 ** 3),
    parserVersion: packageJson.dependencies['tree-sitter-strudel'],
    strudelCoreVersion: packageJson.devDependencies['@strudel/core'],
    typescriptVersion: packageJson.devDependencies.typescript,
  };
}

function methodology() {
  return {
    timer: 'node:perf_hooks.performance.now',
    warmupIterations: WARMUP_ITERATIONS,
    batchCount: BATCH_COUNT,
    samplesPerBatch: SAMPLES_PER_BATCH,
    sampleCount: SAMPLE_COUNT,
    percentileMethod: 'nearest-rank within each batch, then median across batches',
    regressionFactors: REGRESSION_FACTORS,
    minimumThresholdMs: MINIMUM_THRESHOLD_MS,
    realCorpusSampleSize: REAL_SAMPLE_SIZE,
  };
}

function printTable(results) {
  console.log('Benchmark results (milliseconds)');
  console.log('workload                     p50      p95      p99      samples');
  for (const result of results) {
    console.log(
      `${result.id.padEnd(28)} ${result.p50.toFixed(3).padStart(7)} ${result.p95
        .toFixed(3)
        .padStart(8)} ${result.p99.toFixed(3).padStart(8)} ${String(result.samples).padStart(8)}`,
    );
  }
}

function printLocalTiming() {
  if (localTiming === undefined) {
    return;
  }
  const summary = new Map();
  for (const sample of localTiming.samples()) {
    const entry = summary.get(sample.name) ?? {
      events: 0,
      totalMs: 0,
      maxMs: 0,
      totalCount: 0,
    };
    entry.events += 1;
    entry.totalMs += sample.durationMs ?? 0;
    entry.maxMs = Math.max(entry.maxMs, sample.durationMs ?? 0);
    entry.totalCount += sample.count ?? 0;
    summary.set(sample.name, entry);
  }
  console.log('Local timing (opt-in, excluded from baseline)');
  console.log('metric                          events totalMs  maxMs totalCount');
  for (const [name, entry] of [...summary.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    console.log(
      `${name.padEnd(32)} ${String(entry.events).padStart(6)} ${entry.totalMs
        .toFixed(1)
        .padStart(
          7,
        )} ${entry.maxMs.toFixed(2).padStart(6)} ${String(entry.totalCount).padStart(10)}`,
    );
  }
}

async function writeBaseline(results) {
  const baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: await environmentInfo(),
    methodology: methodology(),
    workloads: results,
  };
  await writeFile(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${BASELINE_PATH}`);
}

async function checkBaseline(results) {
  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
  } catch (error) {
    console.error(`Unable to read baseline ${BASELINE_PATH}: ${error.message}`);
    return false;
  }
  if (baseline?.schemaVersion !== 1 || !Array.isArray(baseline.workloads)) {
    console.error(`Unsupported baseline format in ${BASELINE_PATH}`);
    return false;
  }

  const expected = new Map(baseline.workloads.map((workload) => [workload.id, workload]));
  const regressions = [];
  for (const result of results) {
    const previous = expected.get(result.id);
    if (previous === undefined) {
      regressions.push(`${result.id}: missing from baseline`);
      continue;
    }
    for (const { name } of PERCENTILES) {
      const threshold = previous.thresholds?.[name];
      if (typeof threshold !== 'number') {
        regressions.push(`${result.id} ${name}: baseline threshold is missing`);
      } else if (result[name] > threshold) {
        regressions.push(`${result.id} ${name}: ${result[name]}ms exceeds ${threshold}ms`);
      }
    }
  }
  for (const id of expected.keys()) {
    if (!results.some((result) => result.id === id)) {
      regressions.push(`${id}: workload missing from current run`);
    }
  }

  if (regressions.length === 0) {
    console.log(`All ${results.length} workloads are within baseline thresholds.`);
    return true;
  }
  console.error('Benchmark regression check failed:');
  for (const regression of regressions) {
    console.error(`- ${regression}`);
  }
  return false;
}

const results = await collectResults();
printTable(results);
printLocalTiming();
console.log(JSON.stringify(await environmentInfo()));

if (options.writeBaseline) {
  await writeBaseline(results);
} else if (options.check) {
  if (!(await checkBaseline(results))) {
    process.exitCode = 1;
  }
}
