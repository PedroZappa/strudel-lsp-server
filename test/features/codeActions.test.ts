import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideQuickFixes } from '../../src/features/index.js';
import type { SemanticRange } from '../../src/semantic/index.js';

import { createFeatureHarness } from './helpers.js';

function singleLineRange(startOffset: number, endOffset: number): SemanticRange {
  return {
    start: { line: 0, character: startOffset },
    end: { line: 0, character: endOffset },
    startOffset,
    endOffset,
  };
}

void test('quick fixes offer safe edits for actionable mini-notation issues', () => {
  const cases = [
    { text: 's("[]")', title: 'Remove empty mini-notation group', range: [3, 5], newText: '' },
    {
      text: 's("a)")',
      title: 'Remove unmatched mini-notation closer',
      range: [4, 5],
      newText: '',
    },
    { text: 's("[bd>")', title: "Replace with ']'", range: [6, 7], newText: ']' },
    {
      text: 's("a,,b")',
      title: 'Remove redundant mini-notation separator',
      range: [5, 6],
      newText: '',
    },
  ] as const;

  for (const expected of cases) {
    const harness = createFeatureHarness(expected.text);
    const actions = provideQuickFixes(harness.context, singleLineRange(0, expected.text.length));
    assert.equal(actions.length, 1, expected.text);
    assert.equal(actions[0]?.title, expected.title, expected.text);
    assert.deepEqual(
      actions[0]?.edits.map((edit) => [edit.range.startOffset, edit.range.endOffset, edit.newText]),
      [[expected.range[0], expected.range[1], expected.newText]],
      expected.text,
    );
  }
});

void test('quick fixes ignore non-actionable diagnostics and unrelated ranges', () => {
  const unknown = createFeatureHarness('unknownFn()');
  assert.deepEqual(provideQuickFixes(unknown.context, singleLineRange(0, 12)), []);

  const incomplete = createFeatureHarness('s("bd [")');
  assert.deepEqual(provideQuickFixes(incomplete.context, singleLineRange(0, 9)), []);

  const invalid = createFeatureHarness('s("a)")');
  assert.deepEqual(provideQuickFixes(invalid.context, singleLineRange(0, 0)), []);
});
