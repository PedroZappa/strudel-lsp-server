import { readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
import { createSemanticEngine } from '../dist/src/semantic/index.js';
import { createSyntaxAdapter } from '../dist/src/syntax/index.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(ROOT, 'benchmarks', 'fixtures');
const BASELINE_PATH = join(ROOT, 'benchmarks', 'baseline.json');
const REGRESSION_FACTORS = { p50: 2, p95: 2.5, p99: 3 };
const MINIMUM_THRESHOLD_MS = 0.05;

function parseArguments(argv) {
  const options = { writeBaseline: false, check: false };
  for (const argument of argv) {
    if (argument === '--write-baseline') {
      options.writeBaseline = true;
    } else if (argument === '--check') {
      options.check = true;
    } else {
      throw new Error(`Unknown benchmark option: ${argument}`);
    }
  }
  if (options.writeBaseline && options.check) {
    throw new Error('Use either --write-baseline or --check, not both');
  }
  return options;
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

function createIncrementalState(text, uri, target) {
  const targetOffset = requireOffset(text, target);
  const digitOffset = targetOffset + target.indexOf('2');
  const document = TextDocument.create(uri, 'strudel', 1, text);
  const service = new DocumentAnalysisService(adapter, engine);
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

function contextFor(text, offset, uri = 'file:///benchmark/document.strudel') {
  const syntax = adapter.parse({ uri, version: 1, text });
  const semantic = engine.analyze(syntax);
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
      return engine.analyze(syntax);
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
      return engine.analyze(syntax);
    },
  },
  {
    id: 'incremental-edit-small',
    description: 'Incremental syntax and semantic update after a small buffer edit',
    fixture: 'small-live-edit.strudel',
    prepare: () => createIncrementalState(smallText, 'file:///benchmark/edit.strudel', 'fast(2)'),
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
    prepare: () => createIncrementalState(largeText, 'file:///benchmark/edit.strudel', 'fast(2)'),
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

const options = parseArguments(process.argv.slice(2));
const results = await collectResults();
printTable(results);
console.log(JSON.stringify(await environmentInfo()));

if (options.writeBaseline) {
  await writeBaseline(results);
} else if (options.check) {
  if (!(await checkBaseline(results))) {
    process.exitCode = 1;
  }
}
