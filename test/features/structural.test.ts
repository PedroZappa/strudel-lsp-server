import assert from 'node:assert/strict';

import { test } from 'node:test';

import {
  provideFoldingRanges,
  provideInlayHints,
  provideSelectionRanges,
} from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('folding ranges use verified structural boundaries', () => {
  const functionRanges = provideFoldingRanges(
    createFeatureHarness('function outer(\n  a,\n  b\n) {\n  return s("bd");\n}').context,
  );
  assert.deepEqual(functionRanges, [
    { startLine: 0, endLine: 3, kind: 'region' },
    { startLine: 0, endLine: 5, kind: 'region' },
    { startLine: 3, endLine: 5, kind: 'region' },
  ]);

  const imports = provideFoldingRanges(
    createFeatureHarness('import {\n  kick,\n  snare\n} from "./lib.strudel";').context,
  );
  assert.deepEqual(imports, [{ startLine: 0, endLine: 3, kind: 'imports' }]);

  const comments = provideFoldingRanges(
    createFeatureHarness('/* one\ntwo */\nconst x = 1;').context,
  );
  assert.deepEqual(comments, [{ startLine: 0, endLine: 1, kind: 'comment' }]);
});

void test('folding ranges stay quiet for live-coding input', () => {
  const incomplete = createFeatureHarness('function outer(\n  a,\n  b');
  assert.deepEqual(provideFoldingRanges(incomplete.context), []);
  assert.deepEqual(provideFoldingRanges(createFeatureHarness('s("bd").fast(').context), []);
});

void test('selection ranges build one leaf-to-root chain per position', () => {
  const text = 'const pat = s("bd sd").fast(2);\npat;';
  const { context } = createFeatureHarness(text);
  const chains = provideSelectionRanges(context, [
    { line: 1, character: 1 },
    { line: 0, character: 7 },
  ]);

  assert.equal(chains.length, 2);
  const summarize = (chain: (typeof chains)[number]): [number, number][] => {
    const ranges: [number, number][] = [];
    let current: (typeof chains)[number] | undefined = chain;
    while (current !== undefined) {
      ranges.push([current.range.startOffset, current.range.endOffset]);
      current = current.parent;
    }
    return ranges;
  };

  assert.deepEqual(summarize(chains[0]), [
    [32, 35],
    [32, 36],
    [0, text.length],
  ]);
  assert.deepEqual(summarize(chains[1])[0], [6, 9]);
  assert.ok(summarize(chains[1]).some(([start]) => start === 0));
});

void test('selection ranges remain usable on incomplete input', () => {
  const text = 'const pat = s("bd sd").fast(';
  const { context } = createFeatureHarness(text);
  const ranges = provideSelectionRanges(context, [{ line: 0, character: 7 }]);
  assert.equal(ranges.length, 1);
  assert.ok((ranges[0]?.range.endOffset ?? 0) > 0);
});

void test('inlay hints only annotate resolved symbols with known types', () => {
  const text = 'const pat = s("bd sd").fast(2);\npat;';
  const hints = provideInlayHints(createFeatureHarness(text).context);
  assert.deepEqual(hints, [
    {
      position: { line: 1, character: 3 },
      label: ': Pattern',
      kind: 'type',
      paddingLeft: false,
      paddingRight: true,
    },
  ]);

  const unresolved = provideInlayHints(createFeatureHarness('unknown();').context);
  assert.deepEqual(unresolved, []);
});

void test('inlay hints suppress malformed documents and stale source', () => {
  assert.deepEqual(
    provideInlayHints(createFeatureHarness('const pat = s("bd").fast(').context),
    [],
  );
});
