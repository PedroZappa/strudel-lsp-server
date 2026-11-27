import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideDocumentHighlights } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('document highlights cover resolved declarations and reads and writes', () => {
  const text = 'function f(){ let tempo = 1; tempo = 2; return tempo }\nf()';
  const declarationOffset = text.indexOf('tempo') + 1;
  const assignmentOffset = text.indexOf('tempo', declarationOffset + 5) + 1;
  const readOffset = text.lastIndexOf('tempo') + 1;
  const harness = createFeatureHarness(text, declarationOffset);

  const highlights = provideDocumentHighlights(harness.context, declarationOffset);
  assert.deepEqual(
    highlights.map((highlight) => [
      highlight.range.startOffset,
      highlight.range.endOffset,
      highlight.kind,
    ]),
    [
      [declarationOffset - 1, declarationOffset + 4, 'write'],
      [assignmentOffset - 1, assignmentOffset + 4, 'write'],
      [readOffset - 1, readOffset + 4, 'read'],
    ],
  );

  const fromRead = provideDocumentHighlights(harness.context, readOffset);
  assert.deepEqual(
    fromRead.map((highlight) => highlight.range.startOffset),
    highlights.map((highlight) => highlight.range.startOffset),
  );
});

void test('document highlights resolve repeated builtin references', () => {
  const text = 's("bd")\ns("hh")';
  const harness = createFeatureHarness(text, 0);
  const highlights = provideDocumentHighlights(harness.context, 0);
  assert.deepEqual(
    highlights.map((highlight) => highlight.range.startOffset),
    [0, 8],
  );
  assert.deepEqual(
    highlights.map((highlight) => highlight.kind),
    ['read', 'read'],
  );
});

void test('document highlights stay empty for unresolved and malformed live input', () => {
  const unresolvedText = 'const tempo = 120\ntempo + nope';
  const unresolvedOffset = unresolvedText.lastIndexOf('nope') + 1;
  const unresolved = createFeatureHarness(unresolvedText, unresolvedOffset);
  assert.deepEqual(provideDocumentHighlights(unresolved.context, unresolvedOffset), []);

  const incompleteText = 'const tempo = 120\ntempo.fast(';
  const incompleteOffset = incompleteText.lastIndexOf('tempo') + 1;
  const incomplete = createFeatureHarness(incompleteText, incompleteOffset);
  const highlights = provideDocumentHighlights(incomplete.context, incompleteOffset);
  assert.ok(highlights.some((highlight) => highlight.kind === 'write'));
});
