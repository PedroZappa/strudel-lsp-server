import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideDocumentSymbols } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('document symbols expose declared symbols with function scopes as children', () => {
  const text =
    'const pat = s("bd sd").fast(2)\nfunction mix(a) { const inner = s("sd")\n return inner }\nmix(1)';
  const symbols = provideDocumentSymbols(createFeatureHarness(text).context);

  assert.deepEqual(
    symbols.map((symbol) => [symbol.name, symbol.kind]),
    [
      ['pat', 'variable'],
      ['mix', 'function'],
    ],
  );

  const pattern = symbols[0];
  assert.ok(pattern !== undefined);
  assert.equal(pattern.detail, 'Pattern');
  assert.equal(pattern.selectionRange.startOffset, text.indexOf('pat'));
  assert.equal(pattern.selectionRange.endOffset, text.indexOf('pat') + 3);
  assert.deepEqual(
    [pattern.range.startOffset, pattern.range.endOffset],
    [pattern.selectionRange.startOffset, pattern.selectionRange.endOffset],
  );

  const mix = symbols[1];
  assert.ok(mix !== undefined);
  assert.equal(mix.selectionRange.startOffset, text.indexOf('mix'));
  assert.ok(mix.range.startOffset < mix.selectionRange.startOffset);
  assert.ok(mix.range.endOffset > mix.selectionRange.endOffset);
  assert.deepEqual(
    mix.children.map((child) => [child.name, child.kind]),
    [
      ['a', 'parameter'],
      ['inner', 'variable'],
    ],
  );
  assert.equal(mix.children[1]?.detail, 'Pattern');
});

void test('document symbols omit catalog-only symbols and keep incomplete declarations', () => {
  const catalogOnly = createFeatureHarness('s("bd").fast(2)');
  assert.deepEqual(provideDocumentSymbols(catalogOnly.context), []);

  const imported = createFeatureHarness('import { note } from "@strudel/core"\nnote("c4")');
  const importSymbols = provideDocumentSymbols(imported.context);
  assert.deepEqual(
    importSymbols.map((symbol) => [symbol.name, symbol.kind]),
    [['note', 'import']],
  );

  const incompleteText = 'const pat = s("bd sd").fast(';
  const incomplete = createFeatureHarness(incompleteText);
  const symbols = provideDocumentSymbols(incomplete.context);
  assert.deepEqual(
    symbols.map((symbol) => symbol.name),
    ['pat'],
  );
  assert.equal(
    incompleteText.slice(
      symbols[0]?.selectionRange.startOffset,
      symbols[0]?.selectionRange.endOffset,
    ),
    'pat',
  );
});
