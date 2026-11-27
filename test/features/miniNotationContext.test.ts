import assert from 'node:assert/strict';

import { test } from 'node:test';

import { DIAGNOSTIC_CODES } from '../../src/configuration/diagnostics.js';
import {
  createDefaultLanguageDatabase,
  createLanguageDatabase,
  type GeneratedMetadataSnapshot,
} from '../../src/languageDatabase/index.js';
import { manualSemanticSnapshot } from '../../src/languageDatabase/manual.js';
import { generatedMetadata } from '../../src/languageDatabase/generated.js';

import { provideCompletion, provideDiagnostics, provideHover } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('step completion and hover use literal samples keys before catalog samples', () => {
  const text = 'const bank = samples({ bd: "bd.wav", hh: "hh.wav", alt: "alt.wav" })\ns("b")';
  const offset = text.lastIndexOf('b') + 1;
  const harness = createFeatureHarness(text, offset);
  const candidates = provideCompletion(harness.context, offset);

  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['bd'],
  );
  assert.equal(candidates[0]?.detail, 'sample key');
  assert.match(candidates[0]?.documentation ?? '', /literal .*samples\(\{\.\.\.\}\)/);
  assert.deepEqual(
    [candidates[0]?.replacementRange.startOffset, candidates[0]?.replacementRange.endOffset],
    [offset - 1, offset],
  );

  const hoverText = 'samples({ bd: "bd.wav" })\ns("bd")';
  const hoverOffset = hoverText.lastIndexOf('bd');
  const hoverHarness = createFeatureHarness(hoverText, hoverOffset);
  const hover = provideHover(hoverHarness.context, hoverOffset);
  assert.ok(hover !== undefined);
  assert.match(hover.contents, /sample key/);
  assert.match(hover.contents, /literal .*samples\(\{\.\.\.\}\)/);
  assert.deepEqual(
    [hover.range.startOffset, hover.range.endOffset],
    [hoverOffset, hoverOffset + 2],
  );
});

void test('catalog samples are appended with pinned provenance and local keys win', () => {
  const database = createDefaultLanguageDatabase({
    runtime: [
      {
        name: 'bd',
        kind: 'sample',
        returnType: 'SampleName',
        description: 'Pinned catalog kick sample.',
      },
      {
        name: 'hh',
        kind: 'sample',
        returnType: 'SampleName',
        description: 'Pinned catalog hat sample.',
      },
    ],
  });
  const text = 's("b")';
  const offset = text.length - 2;
  const harness = createFeatureHarness(text, offset, { database });
  const candidates = provideCompletion(harness.context, offset);

  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['bd'],
  );
  assert.match(candidates[0]?.detail ?? '', /strudel-1\.2\.6:/);
  assert.match(candidates[0]?.documentation ?? '', /Pinned catalog kick sample\./);

  const localText = 'samples({ bd: "local.wav" })\ns("b")';
  const localOffset = localText.length - 2;
  const local = createFeatureHarness(localText, localOffset, { database });
  const localCandidates = provideCompletion(local.context, localOffset);
  assert.deepEqual(
    localCandidates.map((candidate) => candidate.label),
    ['bd'],
  );
  assert.equal(localCandidates[0]?.detail, 'sample key');
});

void test('note-name completion and hover are gated on pinned note metadata', () => {
  const text = 'note("c")';
  const offset = text.indexOf('c');
  const candidates = provideCompletion(createFeatureHarness(text, offset).context, offset);
  const labels = candidates.map((candidate) => candidate.label);

  assert.ok(labels.includes('c'));
  assert.ok(labels.includes('c4'));
  assert.ok(labels.includes('A4'));
  assert.ok(labels.includes('c#5'));
  assert.ok(candidates.every((candidate) => candidate.detail === 'note name'));

  const hoverText = 'note("c4")';
  const hoverOffset = hoverText.indexOf('c4');
  const hover = provideHover(createFeatureHarness(hoverText, hoverOffset).context, hoverOffset);
  assert.ok(hover !== undefined);
  assert.match(hover.contents, /note name/);
  assert.match(hover.contents, /midi number/i);
  assert.deepEqual(
    [hover.range.startOffset, hover.range.endOffset],
    [hoverOffset, hoverOffset + 2],
  );

  const otherOwner = 'n("c")';
  const otherOffset = otherOwner.length - 2;
  assert.deepEqual(
    provideCompletion(createFeatureHarness(otherOwner, otherOffset).context, otherOffset),
    [],
  );

  const strippedGenerated: GeneratedMetadataSnapshot = {
    ...generatedMetadata,
    symbols: generatedMetadata.symbols.map((symbol) =>
      symbol.longName === 'note' ? { ...symbol, description: undefined, examples: [] } : symbol,
    ),
  };
  const strippedDatabase = createLanguageDatabase({
    versions: [{ generated: strippedGenerated, manual: manualSemanticSnapshot }],
  });
  assert.deepEqual(
    provideCompletion(
      createFeatureHarness(text, offset, { database: strippedDatabase }).context,
      offset,
    ),
    [],
  );
});

void test('literal sample completion stays safe during an incomplete live-coding chain', () => {
  const text = 'samples({ bd: "bd.wav" })\ns("b").fa';
  const offset = text.indexOf('b', text.lastIndexOf('s("')) + 1;
  const harness = createFeatureHarness(text, offset);
  const candidates = provideCompletion(harness.context, offset);

  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['bd'],
  );
  assert.equal(
    provideDiagnostics(harness.context).some((diagnostic) => diagnostic.severity === 'error'),
    false,
  );
});

void test('dynamic sample keys produce no candidates or unknown-sample diagnostics', () => {
  const text = 'const key = "bd"\nsamples({ [key]: "bd.wav", ...more })\ns("b")';
  const stepOffset = text.lastIndexOf('b');
  const database = createLanguageDatabase({
    versions: [{ generated: generatedMetadata, manual: manualSemanticSnapshot }],
  });
  const harness = createFeatureHarness(text, stepOffset + 1, { database });

  assert.deepEqual(provideCompletion(harness.context, stepOffset + 1), []);
  const diagnostics = provideDiagnostics(harness.context);
  assert.equal(
    diagnostics.some(
      (diagnostic) => !(DIAGNOSTIC_CODES as readonly string[]).includes(diagnostic.code ?? ''),
    ),
    false,
  );
  assert.equal(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.range.startOffset <= stepOffset && stepOffset < diagnostic.range.endOffset,
    ),
    false,
  );
});
